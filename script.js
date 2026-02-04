// ==========================================
// CONFIG
// ==========================================

const OPENWEATHER_API_KEY = "ee0fb9013c07fe1ff3ed140aca491627"; // 🔥 ใส่ API Key ของคุณเองตรงนี้

const LOCATION = {
    lat: 18.7883,
    lon: 98.9853,
    name: "Chiang Mai"
};

// Settings
let currentTheme = "dark";
let autoDetectLocation = true;
let cityName = "";

// Data
let weatherData = {
    currentTemp: 24,
    humidity: 0,
    cloudCover: 0,
    weatherCode: 0,
    forecast: []
};

let networkStats = {
    delay: 0.0,
    ping: 0
};

// Forecast Update Protection
let isUpdatingForecast = false;
let forecastUpdateTimeouts = [];

// Auto Update
let autoUpdateInterval = null;
let autoUpdateEnabled = true;
let updateIntervalMinutes = 5;

// ==========================================
// UI HELPERS
// ==========================================

function showToast(message, type = "info") {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

function updateMainTemp(temp) {
    const mainTempElement = document.getElementById("mainTemp");
    if (!mainTempElement) return;

    mainTempElement.style.opacity = "0.5";
    setTimeout(() => {
        mainTempElement.textContent = Math.round(temp);
        mainTempElement.style.opacity = "1";
    }, 300);
}

function updateNetworkStats(delay, ping) {
    const delayEl = document.getElementById("delay");
    const pingEl = document.getElementById("ping");
    const apiStatusEl = document.getElementById("apiStatus");
    const connectionStatusEl = document.getElementById("connectionStatus");

    if (delayEl) delayEl.textContent = delay.toFixed(1) + " ms";
    if (pingEl) pingEl.textContent = ping + " ms";

    if (apiStatusEl) {
        if (delay < 200) {
            apiStatusEl.textContent = "ดี";
            apiStatusEl.className = "stat-value status-good";
        } else if (delay < 500) {
            apiStatusEl.textContent = "ปานกลาง";
            apiStatusEl.className = "stat-value status-warning";
        } else {
            apiStatusEl.textContent = "แย่";
            apiStatusEl.className = "stat-value status-bad";
        }
    }

    if (connectionStatusEl) {
        if (ping < 100) {
            connectionStatusEl.textContent = "ดี";
            connectionStatusEl.className = "stat-value status-good";
        } else if (ping < 300) {
            connectionStatusEl.textContent = "ปานกลาง";
            connectionStatusEl.className = "stat-value status-warning";
        } else {
            connectionStatusEl.textContent = "แย่";
            connectionStatusEl.className = "stat-value status-bad";
        }
    }
}

// ==========================================
// WEATHER ICON (OpenWeatherMap ID Mapping)
// ==========================================

function getWeatherIcon(weatherId, cloudCover = 0) {
    // Thunderstorm
    if (weatherId >= 200 && weatherId < 300) return "⛈️";

    // Drizzle
    if (weatherId >= 300 && weatherId < 400) return "🌦️";

    // Rain
    if (weatherId >= 500 && weatherId < 600) return "🌧️";

    // Snow
    if (weatherId >= 600 && weatherId < 700) return "❄️";

    // Atmosphere (fog, mist, etc)
    if (weatherId >= 700 && weatherId < 800) return "🌫️";

    // Clear
    if (weatherId === 800) return "☀️";

    // Clouds
    if (weatherId > 800 && weatherId < 900) {
        if (cloudCover > 70) return "☁️";
        return "⛅";
    }

    return "🌡️";
}

// ==========================================
// FORECAST CARDS
// ==========================================

function createHumidityCard(humidity) {
    const item = document.createElement("div");
    item.className = "forecast-item";

    const bar = document.createElement("div");
    bar.className = "forecast-bar";

    const fill = document.createElement("div");
    fill.className = "forecast-fill";

    const barHeight = Math.max(10, Math.min(90, humidity));

    if (humidity >= 70) fill.classList.add("high");
    else if (humidity >= 40) fill.classList.add("medium");
    else fill.classList.add("low");

    fill.style.height = barHeight + "%";
    bar.appendChild(fill);

    const icon = document.createElement("div");
    icon.className = "forecast-icon";
    icon.textContent = "💧";

    const temp = document.createElement("div");
    temp.className = "forecast-temp";
    temp.textContent = Math.round(humidity) + "%";

    const title = document.createElement("div");
    title.className = "forecast-title";
    title.textContent = "ความชื้น";

    item.title = `ความชื้นในอากาศ: ${Math.round(humidity)}%`;

    item.appendChild(bar);
    item.appendChild(icon);
    item.appendChild(temp);
    item.appendChild(title);

    return item;
}

function createTemperatureCard(temp) {
    const item = document.createElement("div");
    item.className = "forecast-item";

    const bar = document.createElement("div");
    bar.className = "forecast-bar";

    const fill = document.createElement("div");
    fill.className = "forecast-fill";

    const minTemp = 15;
    const maxTemp = 40;
    const normalizedTemp = ((temp - minTemp) / (maxTemp - minTemp)) * 100;
    const barHeight = Math.max(10, Math.min(90, normalizedTemp));

    if (temp >= 32) fill.classList.add("high");
    else if (temp >= 24) fill.classList.add("medium");
    else fill.classList.add("low");

    fill.style.height = barHeight + "%";
    bar.appendChild(fill);

    const icon = document.createElement("div");
    icon.className = "forecast-icon";
    icon.textContent = "🌡️";

    const tempDisplay = document.createElement("div");
    tempDisplay.className = "forecast-temp";
    tempDisplay.textContent = Math.round(temp) + "°";

    const title = document.createElement("div");
    title.className = "forecast-title";
    title.textContent = "อุณหภูมิ";

    item.title = `อุณหภูมิ: ${Math.round(temp)}°C`;

    item.appendChild(bar);
    item.appendChild(icon);
    item.appendChild(tempDisplay);
    item.appendChild(title);

    return item;
}

function createRainChanceCard(weatherId, cloudCover) {
    const item = document.createElement("div");
    item.className = "forecast-item";

    const bar = document.createElement("div");
    bar.className = "forecast-bar";

    const fill = document.createElement("div");
    fill.className = "forecast-fill";

    let rainChance = 0;

    if (weatherId >= 200 && weatherId < 300) rainChance = 90;
    else if (weatherId >= 500 && weatherId < 600) rainChance = 70;
    else if (weatherId >= 300 && weatherId < 400) rainChance = 40;
    else rainChance = Math.min(30, Math.round(cloudCover * 0.3));

    const barHeight = Math.max(10, Math.min(90, rainChance));

    if (rainChance >= 60) fill.classList.add("high");
    else if (rainChance >= 30) fill.classList.add("medium");
    else fill.classList.add("low");

    fill.style.height = barHeight + "%";
    bar.appendChild(fill);

    const icon = document.createElement("div");
    icon.className = "forecast-icon";
    icon.textContent = getWeatherIcon(weatherId, cloudCover);

    const rainDisplay = document.createElement("div");
    rainDisplay.className = "forecast-temp";
    rainDisplay.textContent = rainChance + "%";

    const title = document.createElement("div");
    title.className = "forecast-title";
    title.textContent = "โอกาสฝน";

    item.title = `โอกาสฝนตก: ${rainChance}%`;

    item.appendChild(bar);
    item.appendChild(icon);
    item.appendChild(rainDisplay);
    item.appendChild(title);

    return item;
}

function updateForecast(forecastArray) {
    if (isUpdatingForecast) return;

    const containerToday = document.getElementById("forecastContainerToday");
    const containerTomorrow = document.getElementById("forecastContainerTomorrow");
    if (!containerToday || !containerTomorrow) return;

    isUpdatingForecast = true;

    forecastUpdateTimeouts.forEach(t => clearTimeout(t));
    forecastUpdateTimeouts = [];

    containerToday.innerHTML = "";
    containerTomorrow.innerHTML = "";

    const cardsToday = [];
    const cardsTomorrow = [];

    // TODAY
    cardsToday.push({ card: createHumidityCard(weatherData.humidity), index: 0 });
    cardsToday.push({ card: createTemperatureCard(weatherData.currentTemp), index: 1 });
    cardsToday.push({ card: createRainChanceCard(weatherData.weatherCode, weatherData.cloudCover), index: 2 });

    // TOMORROW
    if (forecastArray && forecastArray.length > 0) {
        const tomorrow = forecastArray[0];
        cardsTomorrow.push({ card: createHumidityCard(tomorrow.humidity), index: 0 });
        cardsTomorrow.push({ card: createTemperatureCard(tomorrow.temp), index: 1 });
        cardsTomorrow.push({ card: createRainChanceCard(tomorrow.weatherCode, tomorrow.cloudCover), index: 2 });
    }

    cardsToday.forEach(({ card, index }) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        containerToday.appendChild(card);

        const tid = setTimeout(() => {
            card.style.transition = "all 0.4s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, index * 100);

        forecastUpdateTimeouts.push(tid);
    });

    cardsTomorrow.forEach(({ card, index }) => {
        card.style.opacity = "0";
        card.style.transform = "translateY(20px)";
        containerTomorrow.appendChild(card);

        const tid = setTimeout(() => {
            card.style.transition = "all 0.4s ease";
            card.style.opacity = "1";
            card.style.transform = "translateY(0)";
        }, (cardsToday.length + index) * 100);

        forecastUpdateTimeouts.push(tid);
    });

    const unlockTimeout = setTimeout(() => {
        isUpdatingForecast = false;
    }, (cardsToday.length + cardsTomorrow.length) * 100 + 500);

    forecastUpdateTimeouts.push(unlockTimeout);
}

// ==========================================
// GPS LOCATION (NO IP TRACKING)
// ==========================================

async function detectUserLocation() {
    console.log("📍 Requesting GPS location...");

    if (!navigator.geolocation) {
        showToast("❌ Browser ไม่รองรับการขอตำแหน่ง", "error");
        return null;
    }

    showToast("📍 กำลังขออนุญาตตำแหน่ง...", "info");

    return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;

                LOCATION.lat = lat;
                LOCATION.lon = lon;
                LOCATION.name = `ตำแหน่งของคุณ (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
                cityName = LOCATION.name;

                localStorage.setItem("locationLat", lat.toString());
                localStorage.setItem("locationLon", lon.toString());
                localStorage.setItem("locationName", LOCATION.name);
                localStorage.setItem("locationSource", "gps");

                showToast("✅ ใช้ตำแหน่งของคุณแล้ว", "success");

                await fetchWeatherData();
                resolve({ lat, lon, name: LOCATION.name, source: "gps" });
            },
            (err) => {
                console.warn("❌ GPS location failed:", err);

                if (err.code === 1) showToast("❌ คุณปฏิเสธการขอตำแหน่ง", "error");
                else if (err.code === 2) showToast("❌ ไม่สามารถระบุตำแหน่งได้", "error");
                else if (err.code === 3) showToast("❌ ขอพิกัดนานเกินไป (Timeout)", "error");
                else showToast("❌ ขอพิกัดล้มเหลว", "error");

                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

// ==========================================
// OPENWEATHERMAP FETCH (CURRENT + FORECAST)
// ==========================================

async function fetchWeatherData() {
    try {
        if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === "PUT_YOUR_KEY_HERE") {
            showToast("❌ กรุณาใส่ OpenWeather API Key", "error");
            return;
        }

        console.log("🌤️ Fetching weather from OpenWeatherMap...");

        // Current Weather
        const currentUrl =
            `https://api.openweathermap.org/data/2.5/weather?lat=${LOCATION.lat}&lon=${LOCATION.lon}` +
            `&appid=${OPENWEATHER_API_KEY}&units=metric&lang=th`;

        const startTime = performance.now();
        const currentRes = await fetch(currentUrl);
        const endTime = performance.now();

        networkStats.delay = endTime - startTime;
        networkStats.ping = Math.round(networkStats.delay);

        if (!currentRes.ok) throw new Error("OpenWeather current error");

        const currentData = await currentRes.json();

        weatherData.currentTemp = currentData.main.temp;
        weatherData.humidity = currentData.main.humidity;
        weatherData.cloudCover = currentData.clouds?.all || 0;
        weatherData.weatherCode = currentData.weather?.[0]?.id || 0;

        updateMainTemp(weatherData.currentTemp);

        // Forecast (3-hour intervals)
        const forecastUrl =
            `https://api.openweathermap.org/data/2.5/forecast?lat=${LOCATION.lat}&lon=${LOCATION.lon}` +
            `&appid=${OPENWEATHER_API_KEY}&units=metric&lang=th`;

        const forecastRes = await fetch(forecastUrl);
        if (!forecastRes.ok) throw new Error("OpenWeather forecast error");

        const forecastData = await forecastRes.json();

        // หา "พรุ่งนี้" จาก list (เลือกช่วงเที่ยง)
        const tomorrowForecast = getTomorrowForecast(forecastData.list);

        weatherData.forecast = tomorrowForecast ? [tomorrowForecast] : [];

        updateForecast(weatherData.forecast);

        updateNetworkStats(networkStats.delay, networkStats.ping);

        console.log("✅ Weather Updated:", weatherData);

    } catch (error) {
        console.error("❌ Weather fetch error:", error);

        const mainTemp = document.getElementById("mainTemp");
        if (mainTemp) mainTemp.textContent = "--";

        updateNetworkStats(0, 999);
        showToast("❌ ดึงข้อมูลอากาศล้มเหลว", "error");
    }
}

// เอา forecast ของ "พรุ่งนี้" (เลือกเวลาประมาณ 12:00)
function getTomorrowForecast(list) {
    if (!list || list.length === 0) return null;

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const tomorrowDateStr = tomorrow.toISOString().split("T")[0];

    // filter เฉพาะของพรุ่งนี้
    const tomorrowList = list.filter(item => item.dt_txt.startsWith(tomorrowDateStr));
    if (tomorrowList.length === 0) return null;

    // เลือกช่วง 12:00 ถ้ามี
    let best = tomorrowList.find(item => item.dt_txt.includes("12:00:00"));

    // ถ้าไม่มี เลือกอันกลาง ๆ
    if (!best) best = tomorrowList[Math.floor(tomorrowList.length / 2)];

    return {
        temp: best.main.temp,
        humidity: best.main.humidity,
        cloudCover: best.clouds?.all || 0,
        weatherCode: best.weather?.[0]?.id || 0,
        date: best.dt_txt
    };
}

// ==========================================
// NETWORK PERFORMANCE CHECK
// ==========================================

async function checkNetworkPerformance() {
    try {
        const startTime = performance.now();

        await fetch("https://api.openweathermap.org", {
            method: "HEAD"
        });

        const endTime = performance.now();
        const ping = Math.round(endTime - startTime);

        networkStats.ping = ping;
        networkStats.delay = ping / 2;

        updateNetworkStats(networkStats.delay, networkStats.ping);

    } catch (error) {
        console.warn("⚠️ Network check failed:", error);
        updateNetworkStats(0, 999);
    }
}

// ==========================================
// THEME SYSTEM
// ==========================================

function selectTheme(theme) {
    currentTheme = theme;

    const themeOptions = document.querySelectorAll(".theme-option");
    themeOptions.forEach(option => option.classList.remove("active"));

    const selectedOption = document.querySelector(`[data-theme="${theme}"]`);
    if (selectedOption) selectedOption.classList.add("active");

    document.body.classList.remove("dark-theme", "light-theme", "galaxy-theme");
    document.body.classList.add(`${theme}-theme`);

    localStorage.setItem("theme", theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    selectTheme(savedTheme);
}

// ==========================================
// SETTINGS LOAD/SAVE
// ==========================================

function loadSettings() {
    const savedAutoDetect = localStorage.getItem("autoDetectLocation");
    const savedCityName = localStorage.getItem("cityName");
    const savedInterval = localStorage.getItem("updateInterval");
    const savedLat = localStorage.getItem("locationLat");
    const savedLon = localStorage.getItem("locationLon");
    const savedLocationName = localStorage.getItem("locationName");

    if (savedLat && savedLon) {
        LOCATION.lat = parseFloat(savedLat);
        LOCATION.lon = parseFloat(savedLon);

        if (savedLocationName) LOCATION.name = savedLocationName;
    }

    if (savedAutoDetect !== null) {
        autoDetectLocation = savedAutoDetect === "true";
    }

    if (savedCityName) {
        cityName = savedCityName;
    }

    if (savedInterval) {
        updateIntervalMinutes = parseInt(savedInterval);
    }

    if (autoDetectLocation && (!savedLat || !savedLon)) {
        detectUserLocation();
    }
}

async function saveSettings() {
    const latInput = document.getElementById("settingLat");
    const lonInput = document.getElementById("settingLon");
    const intervalInput = document.getElementById("settingUpdateInterval");

    const newInterval = parseInt(intervalInput.value);

    if (isNaN(newInterval) || newInterval < 1) {
        showToast("❌ ช่วงเวลาอัพเดทต้องมากกว่า 0 นาที", "error");
        return;
    }

    updateIntervalMinutes = newInterval;

    const newLat = parseFloat(latInput.value);
    const newLon = parseFloat(lonInput.value);

    if (isNaN(newLat) || newLat < -90 || newLat > 90) {
        showToast("❌ Latitude ไม่ถูกต้อง", "error");
        return;
    }

    if (isNaN(newLon) || newLon < -180 || newLon > 180) {
        showToast("❌ Longitude ไม่ถูกต้อง", "error");
        return;
    }

    LOCATION.lat = newLat;
    LOCATION.lon = newLon;
    LOCATION.name = `ตำแหน่งกำหนดเอง (${newLat.toFixed(4)}, ${newLon.toFixed(4)})`;

    localStorage.setItem("autoDetectLocation", autoDetectLocation);
    localStorage.setItem("cityName", cityName);
    localStorage.setItem("updateInterval", updateIntervalMinutes.toString());
    localStorage.setItem("locationLat", LOCATION.lat.toString());
    localStorage.setItem("locationLon", LOCATION.lon.toString());
    localStorage.setItem("locationName", LOCATION.name);

    if (autoUpdateEnabled) startAutoUpdate();

    showToast("💾 บันทึกการตั้งค่าสำเร็จ!", "success");
    closeSettings();

    setTimeout(() => {
        refreshWeatherData();
    }, 500);
}

// ==========================================
// SETTINGS MODAL
// ==========================================

function openSettings() {
    const modal = document.getElementById("settingsModal");
    const latInput = document.getElementById("settingLat");
    const lonInput = document.getElementById("settingLon");
    const intervalInput = document.getElementById("settingUpdateInterval");

    if (!modal) return;

    if (latInput) latInput.value = LOCATION.lat;
    if (lonInput) lonInput.value = LOCATION.lon;
    if (intervalInput) intervalInput.value = updateIntervalMinutes;

    modal.classList.add("show");

    modal.addEventListener("click", function (e) {
        if (e.target === modal) closeSettings();
    });
}

function closeSettings() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("show");
}

// ==========================================
// AUTO UPDATE
// ==========================================

function startAutoUpdate() {
    stopAutoUpdate();

    autoUpdateInterval = setInterval(() => {
        if (autoUpdateEnabled) {
            fetchWeatherData();
            checkNetworkPerformance();
        }
    }, updateIntervalMinutes * 60000);
}

function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
}

function toggleAutoUpdate() {
    const toggle = document.getElementById("autoUpdateToggle");
    const status = document.getElementById("autoUpdateStatus");

    autoUpdateEnabled = !autoUpdateEnabled;

    if (toggle) toggle.classList.toggle("active");
    if (status) status.textContent = autoUpdateEnabled ? "เปิดอยู่" : "ปิดอยู่";

    if (autoUpdateEnabled) {
        startAutoUpdate();
        showToast("✅ เปิดการอัพเดทอัตโนมัติ", "success");
    } else {
        stopAutoUpdate();
        showToast("⏸️ ปิดการอัพเดทอัตโนมัติ", "info");
    }
}

// ==========================================
// ACTION BUTTONS
// ==========================================

async function refreshWeatherData() {
    const btn = document.getElementById("refreshBtn");
    if (btn) {
        btn.classList.add("loading");
        btn.disabled = true;
    }

    try {
        showToast("🔄 กำลังดึงข้อมูลใหม่...", "info");
        await fetchWeatherData();
        await checkNetworkPerformance();
        showToast("✅ ดึงข้อมูลสำเร็จ!", "success");
    } catch (error) {
        showToast("❌ เกิดข้อผิดพลาดในการดึงข้อมูล", "error");
        console.error("Error refreshing data:", error);
    } finally {
        if (btn) {
            btn.classList.remove("loading");
            btn.disabled = false;
        }
    }
}

function resetAPI() {
    if (confirm("คุณต้องการรีเซ็ต API และข้อมูลทั้งหมดหรือไม่?")) {
        weatherData = {
            currentTemp: 24,
            humidity: 0,
            cloudCover: 0,
            weatherCode: 0,
            forecast: []
        };

        networkStats = {
            delay: 0.0,
            ping: 0
        };

        updateMainTemp(24);
        updateNetworkStats(0, 999);

        const containerToday = document.getElementById("forecastContainerToday");
        const containerTomorrow = document.getElementById("forecastContainerTomorrow");

        if (containerToday) containerToday.innerHTML = "";
        if (containerTomorrow) containerTomorrow.innerHTML = "";

        showToast("🔄 กำลังดึงข้อมูลใหม่...", "info");

        setTimeout(() => {
            fetchWeatherData();
            checkNetworkPerformance();
        }, 500);
    }
}

// ==========================================
// LOADING SCREEN
// ==========================================

function hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (!loadingScreen) return;

    loadingScreen.classList.add("hidden");

    loadingScreen.addEventListener("transitionend", () => {
        loadingScreen.remove();
    }, { once: true });
}

// ==========================================
// TIME-BASED BACKGROUND SYSTEM
// ==========================================

function updateTimeBasedBackground() {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hour * 60 + minutes;

    const body = document.body;
    const sun = document.getElementById("sun");
    const moon = document.getElementById("moon");
    const skyContainer = document.getElementById("skyContainer");

    body.classList.remove("night", "morning", "day", "evening");

    if (skyContainer) {
        const oldStars = skyContainer.querySelectorAll(".star, .shooting-star");
        oldStars.forEach(star => star.remove());
    }

    if (hour >= 20 || hour < 6) {
        body.classList.add("night");

        if (moon) {
            moon.style.opacity = "1";

            let moonX, moonY;

            if (hour >= 20) {
                const nightMinutes = (hour - 20) * 60 + minutes;
                const nightProgress = nightMinutes / (4 * 60);
                moonX = 10 + (nightProgress * 40);
                moonY = 15 + (nightProgress * 5);
            } else {
                const nightMinutes = hour * 60 + minutes;
                const nightProgress = nightMinutes / (6 * 60);
                moonX = 50 + (nightProgress * 40);
                moonY = 20 - (nightProgress * 5);
            }

            moon.style.left = moonX + "%";
            moon.style.top = moonY + "%";

            const rotationDegrees = (totalMinutes / 4) % 360;
            moon.style.transform = `rotate(${rotationDegrees}deg)`;
        }

        if (skyContainer) {
            createStars(skyContainer);
            createShootingStars(skyContainer);
        }

    } else if (hour >= 6 && hour < 9) {
        body.classList.add("morning");

        if (sun) {
            sun.style.opacity = "1";

            const morningMinutes = (hour - 6) * 60 + minutes;
            const morningProgress = morningMinutes / (3 * 60);

            const sunX = 10 + (morningProgress * 30);
            const sunY = 70 - (morningProgress * 50);

            sun.style.left = sunX + "%";
            sun.style.top = sunY + "%";
        }

    } else if (hour >= 9 && hour < 17) {
        body.classList.add("day");

        if (sun) {
            sun.style.opacity = "1";

            const dayMinutes = (hour - 9) * 60 + minutes;
            const dayProgress = dayMinutes / (8 * 60);

            const sunX = 40 + (dayProgress * 20);
            const sunY = 20 + (dayProgress * 10);

            sun.style.left = sunX + "%";
            sun.style.top = sunY + "%";
        }

    } else {
        body.classList.add("evening");

        if (sun) {
            sun.style.opacity = "1";

            const eveningMinutes = (hour - 17) * 60 + minutes;
            const eveningProgress = eveningMinutes / (3 * 60);

            const sunX = 60 + (eveningProgress * 30);
            const sunY = 30 + (eveningProgress * 40);

            sun.style.left = sunX + "%";
            sun.style.top = sunY + "%";
        }
    }
}

function createStars(container) {
    const starCount = 50;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement("div");
        star.className = "star";
        star.style.left = Math.random() * 100 + "%";
        star.style.top = Math.random() * 60 + "%";
        star.style.animationDelay = Math.random() * 3 + "s";
        star.style.opacity = "1";
        container.appendChild(star);
    }
}

function createShootingStars(container) {
    const shootingStarCount = 3;

    for (let i = 0; i < shootingStarCount; i++) {
        const shootingStar = document.createElement("div");
        shootingStar.className = "shooting-star";
        shootingStar.style.left = Math.random() * 30 + "%";
        shootingStar.style.top = Math.random() * 30 + "%";
        shootingStar.style.animationDelay = (Math.random() * 3 + i * 1) + "s";
        shootingStar.style.opacity = "1";
        container.appendChild(shootingStar);
    }
}

// ==========================================
// DEBUG DISPLAY
// ==========================================

function displayWeatherInfo() {
    console.log("=".repeat(50));
    console.log("🌤️ STORM CHECKER - Weather Info");
    console.log("=".repeat(50));
    console.log(`📍 Location: ${LOCATION.name}`);
    console.log(`🌡️ Temp: ${weatherData.currentTemp}°C`);
    console.log(`💧 Humidity: ${weatherData.humidity}%`);
    console.log(`☁️ Cloud: ${weatherData.cloudCover}%`);
    console.log(`📶 Ping: ${networkStats.ping} ms`);
    console.log(`⏱️ Delay: ${networkStats.delay.toFixed(1)} ms`);
    console.log("=".repeat(50));
}

// ==========================================
// INIT APP
// ==========================================

async function initApp() {
    console.log("⛈️ Storm Checker Starting...");

    loadTheme();
    loadSettings();

    updateTimeBasedBackground();
    setInterval(updateTimeBasedBackground, 60000);

    const loadingTimeout = setTimeout(() => {
        console.warn("⚠️ Loading timeout, hiding loading screen");
        hideLoadingScreen();
    }, 5000);

    try {
        if (autoDetectLocation) {
            await detectUserLocation();
        }

        await fetchWeatherData();
        await checkNetworkPerformance();

    } catch (err) {
        console.error("Init Error:", err);
    } finally {
        clearTimeout(loadingTimeout);

        setTimeout(() => {
            hideLoadingScreen();
        }, 1000);
    }

    startAutoUpdate();
    setInterval(checkNetworkPerformance, 10000);
    setInterval(displayWeatherInfo, 300000);
}

document.addEventListener("DOMContentLoaded", initApp)

