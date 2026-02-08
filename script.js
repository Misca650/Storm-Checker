// ==========================================
// CONFIG
// ==========================================

const OPENWEATHER_API_KEY = "ee0fb9013c07fe1ff3ed140aca491627";
const AQICN_API_KEY = "demo"; // ใช้ demo key หรือสมัครที่ https://aqicn.org/data-platform/token/

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
    feelsLike: 24,
    humidity: 0,
    cloudCover: 0,
    weatherCode: 0,
    weatherDescription: "",
    windSpeed: 0,
    windDeg: 0,
    pressure: 0,
    visibility: 0,
    uvIndex: 0,
    sunrise: 0,
    sunset: 0,
    forecast: [],
    forecast7days: []
};

let aqiData = {
    aqi: 0,
    pm25: 0,
    pm10: 0,
    o3: 0,
    no2: 0,
    so2: 0,
    co: 0,
    status: "กำลังโหลด..."
};

let networkStats = {
    delay: 0.0,
    ping: 0
};

// Chart
let weatherChart = null;
let currentChartView = 'temp';

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
// WEATHER ANIMATION
// ==========================================

function updateWeatherAnimation(weatherCode) {
    const animationEl = document.querySelector('.weather-animation');
    if (!animationEl) return;

    animationEl.className = 'weather-animation';
    
    if (weatherCode >= 200 && weatherCode < 300) {
        animationEl.textContent = '⛈️';
        animationEl.classList.add('stormy');
    } else if (weatherCode >= 300 && weatherCode < 600) {
        animationEl.textContent = '🌧️';
        animationEl.classList.add('rainy');
    } else if (weatherCode >= 600 && weatherCode < 700) {
        animationEl.textContent = '❄️';
        animationEl.classList.add('snowy');
    } else if (weatherCode >= 700 && weatherCode < 800) {
        animationEl.textContent = '🌫️';
        animationEl.classList.add('foggy');
    } else if (weatherCode === 800) {
        animationEl.textContent = '☀️';
        animationEl.classList.add('sunny');
    } else if (weatherCode > 800) {
        animationEl.textContent = '☁️';
        animationEl.classList.add('cloudy');
    }
}

// ==========================================
// ADVANCED WEATHER DISPLAY
// ==========================================

function updateAdvancedWeatherInfo() {
    // Wind Speed
    const windSpeedEl = document.getElementById("windSpeed");
    if (windSpeedEl) {
        const windKmh = (weatherData.windSpeed * 3.6).toFixed(1);
        windSpeedEl.textContent = `${windKmh} km/h`;
        
        if (windKmh > 50) windSpeedEl.style.color = "var(--accent-red)";
        else if (windKmh > 25) windSpeedEl.style.color = "var(--accent-orange)";
        else windSpeedEl.style.color = "var(--accent-green)";
    }

    // Wind Direction
    const windDirEl = document.getElementById("windDirection");
    if (windDirEl) {
        windDirEl.textContent = getWindDirection(weatherData.windDeg);
    }

    // Pressure
    const pressureEl = document.getElementById("pressure");
    if (pressureEl) {
        pressureEl.textContent = `${weatherData.pressure} hPa`;
        
        if (weatherData.pressure < 1000) pressureEl.style.color = "var(--accent-orange)";
        else if (weatherData.pressure > 1020) pressureEl.style.color = "var(--accent-blue)";
        else pressureEl.style.color = "var(--text-primary)";
    }

    // UV Index
    const uvEl = document.getElementById("uvIndex");
    if (uvEl) {
        const uvLevel = getUVLevel(weatherData.uvIndex);
        uvEl.textContent = `${weatherData.uvIndex} (${uvLevel.text})`;
        uvEl.style.color = uvLevel.color;
    }

    // Visibility
    const visibilityEl = document.getElementById("visibility");
    if (visibilityEl) {
        const visKm = (weatherData.visibility / 1000).toFixed(1);
        visibilityEl.textContent = `${visKm} km`;
        
        if (visKm < 1) visibilityEl.style.color = "var(--accent-red)";
        else if (visKm < 5) visibilityEl.style.color = "var(--accent-orange)";
        else visibilityEl.style.color = "var(--accent-green)";
    }

    // Humidity
    const humidityEl = document.getElementById("humidity");
    if (humidityEl) {
        humidityEl.textContent = `${weatherData.humidity}%`;
    }

    // Sunrise
    const sunriseEl = document.getElementById("sunrise");
    if (sunriseEl && weatherData.sunrise) {
        sunriseEl.textContent = formatTime(weatherData.sunrise);
    }

    // Sunset
    const sunsetEl = document.getElementById("sunset");
    if (sunsetEl && weatherData.sunset) {
        sunsetEl.textContent = formatTime(weatherData.sunset);
    }

    // Feels Like
    const feelsLikeEl = document.getElementById("feelsLike");
    if (feelsLikeEl) {
        feelsLikeEl.textContent = `${Math.round(weatherData.feelsLike)}°`;
    }

    // Update weather animation
    updateWeatherAnimation(weatherData.weatherCode);
}

function getWindDirection(degrees) {
    const directions = ["เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้", 
                       "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ"];
    const index = Math.round(((degrees % 360) / 45)) % 8;
    return `${directions[index]} (${degrees}°)`;
}

function getUVLevel(uv) {
    if (uv <= 2) return { text: "ต่ำ", color: "var(--accent-green)" };
    if (uv <= 5) return { text: "ปานกลาง", color: "#FFD700" };
    if (uv <= 7) return { text: "สูง", color: "var(--accent-orange)" };
    if (uv <= 10) return { text: "สูงมาก", color: "var(--accent-red)" };
    return { text: "อันตราย", color: "#8B00FF" };
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

// ==========================================
// AIR QUALITY INDEX (AQI)
// ==========================================

async function fetchAQI() {
    try {
        const url = `https://api.waqi.info/feed/geo:${LOCATION.lat};${LOCATION.lon}/?token=${AQICN_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.status === "ok") {
            const aqi = data.data.aqi;
            aqiData.aqi = aqi;
            aqiData.pm25 = data.data.iaqi?.pm25?.v || 0;
            aqiData.pm10 = data.data.iaqi?.pm10?.v || 0;
            aqiData.o3 = data.data.iaqi?.o3?.v || 0;
            aqiData.no2 = data.data.iaqi?.no2?.v || 0;
            aqiData.so2 = data.data.iaqi?.so2?.v || 0;
            aqiData.co = data.data.iaqi?.co?.v || 0;
            
            updateAQIDisplay();
        } else {
            console.warn("AQI data not available");
            aqiData.status = "ไม่มีข้อมูล";
            updateAQIDisplay();
        }
    } catch (error) {
        console.error("Error fetching AQI:", error);
        aqiData.status = "เกิดข้อผิดพลาด";
        updateAQIDisplay();
    }
}

function updateAQIDisplay() {
    const aqiValueEl = document.getElementById("aqiValue");
    const aqiLabelEl = document.getElementById("aqiLabel");
    const aqiFillEl = document.getElementById("aqiFill");
    const pm25El = document.getElementById("pm25");
    const pm10El = document.getElementById("pm10");
    const o3El = document.getElementById("o3");

    if (aqiValueEl && aqiData.aqi > 0) {
        aqiValueEl.textContent = aqiData.aqi;
        
        const aqiLevel = getAQILevel(aqiData.aqi);
        if (aqiLabelEl) aqiLabelEl.textContent = aqiLevel.text;
        if (aqiFillEl) {
            aqiFillEl.style.width = `${Math.min((aqiData.aqi / 300) * 100, 100)}%`;
            aqiFillEl.style.background = aqiLevel.color;
        }
        if (aqiValueEl) {
            aqiValueEl.style.background = aqiLevel.color;
            aqiValueEl.style.webkitBackgroundClip = "text";
            aqiValueEl.style.webkitTextFillColor = "transparent";
        }
    } else if (aqiLabelEl) {
        aqiLabelEl.textContent = aqiData.status;
    }

    if (pm25El) pm25El.textContent = `${aqiData.pm25} µg/m³`;
    if (pm10El) pm10El.textContent = `${aqiData.pm10} µg/m³`;
    if (o3El) o3El.textContent = `${aqiData.o3} µg/m³`;
}

function getAQILevel(aqi) {
    if (aqi <= 50) return { text: "ดีมาก", color: "linear-gradient(135deg, #4dff88, #00d4aa)" };
    if (aqi <= 100) return { text: "ดี", color: "linear-gradient(135deg, #FFD700, #FFA500)" };
    if (aqi <= 150) return { text: "ปานกลาง", color: "linear-gradient(135deg, #ff9d42, #ff7700)" };
    if (aqi <= 200) return { text: "แย่", color: "linear-gradient(135deg, #ff4d4d, #ff0000)" };
    if (aqi <= 300) return { text: "แย่มาก", color: "linear-gradient(135deg, #8B00FF, #4B0082)" };
    return { text: "อันตราย", color: "linear-gradient(135deg, #800000, #400000)" };
}

// ==========================================
// COMFORT INDEX
// ==========================================

function updateComfortIndex() {
    const temp = weatherData.currentTemp;
    const humidity = weatherData.humidity;
    const windSpeed = weatherData.windSpeed * 3.6;

    const emojiEl = document.getElementById("comfortEmoji");
    const textEl = document.getElementById("comfortText");
    const descEl = document.getElementById("comfortDesc");

    if (!emojiEl || !textEl || !descEl) return;

    // Calculate comfort index based on temperature, humidity, and wind
    let comfort = "";
    let emoji = "";
    let desc = "";

    if (temp < 15) {
        comfort = "หนาวมาก";
        emoji = "🥶";
        desc = "สวมเสื้อกันหนาว แนะนำให้อยู่ในที่ร่ม";
    } else if (temp < 20) {
        comfort = "หนาว";
        emoji = "😰";
        desc = "อากาศเย็นสบาย เหมาะกับการพักผ่อน";
    } else if (temp < 25) {
        comfort = "เย็นสบาย";
        emoji = "😌";
        desc = "อากาศดีมาก เหมาะสำหรับกิจกรรมกลางแจ้ง";
    } else if (temp < 28) {
        comfort = "สบาย";
        emoji = "😊";
        desc = "อากาศดี เหมาะสำหรับทุกกิจกรรม";
    } else if (temp < 32) {
        comfort = "อบอุ่น";
        emoji = "😅";
        desc = "ค่อนข้างร้อน แนะนำให้ดื่มน้ำมากๆ";
    } else if (temp < 36) {
        comfort = "ร้อน";
        emoji = "🥵";
        desc = "ร้อนมาก ควรหลีกเลี่ยงแดดจัด";
    } else {
        comfort = "ร้อนจัด";
        emoji = "🔥";
        desc = "อันตราย! อยู่ในที่ร่มและดื่มน้ำมากๆ";
    }

    // Adjust for humidity
    if (humidity > 80 && temp > 28) {
        desc += " อากาศชื้นมาก";
    }

    // Adjust for wind
    if (windSpeed > 30) {
        desc += " ลมแรง";
    }

    emojiEl.textContent = emoji;
    textEl.textContent = comfort;
    descEl.textContent = desc;
}

// ==========================================
// WEATHER CHART (7 DAYS)
// ==========================================

async function fetch7DayForecast() {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LOCATION.lat}&lon=${LOCATION.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.list) {
            // Group by day and get daily average
            const dailyData = {};
            data.list.forEach(item => {
                const date = new Date(item.dt * 1000).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric' });
                if (!dailyData[date]) {
                    dailyData[date] = {
                        temps: [],
                        humidity: [],
                        date: date
                    };
                }
                dailyData[date].temps.push(item.main.temp);
                dailyData[date].humidity.push(item.main.humidity);
            });

            weatherData.forecast7days = Object.values(dailyData).slice(0, 7).map(day => ({
                date: day.date,
                temp: Math.round(day.temps.reduce((a, b) => a + b) / day.temps.length),
                humidity: Math.round(day.humidity.reduce((a, b) => a + b) / day.humidity.length)
            }));

            updateWeatherChart();
        }
    } catch (error) {
        console.error("Error fetching 7-day forecast:", error);
    }
}

function updateWeatherChart() {
    const canvas = document.getElementById('weatherChart');
    if (!canvas || !weatherData.forecast7days.length) return;

    const ctx = canvas.getContext('2d');

    if (weatherChart) {
        weatherChart.destroy();
    }

    const labels = weatherData.forecast7days.map(d => d.date);
    const dataValues = currentChartView === 'temp' 
        ? weatherData.forecast7days.map(d => d.temp)
        : weatherData.forecast7days.map(d => d.humidity);

    weatherChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: currentChartView === 'temp' ? 'อุณหภูมิ (°C)' : 'ความชื้น (%)',
                data: dataValues,
                borderColor: currentChartView === 'temp' ? '#4a9eff' : '#4dff88',
                backgroundColor: currentChartView === 'temp' 
                    ? 'rgba(74, 158, 255, 0.1)' 
                    : 'rgba(77, 255, 136, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: currentChartView === 'temp' ? '#4a9eff' : '#4dff88',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: 'Kanit',
                            size: 12
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#4a9eff',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return currentChartView === 'temp' 
                                ? `${context.parsed.y}°C`
                                : `${context.parsed.y}%`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            family: 'Kanit',
                            size: 11
                        },
                        callback: function(value) {
                            return currentChartView === 'temp' ? `${value}°` : `${value}%`;
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#b0b0b0',
                        font: {
                            family: 'Kanit',
                            size: 11
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    }
                }
            }
        }
    });
}

function switchChartView(view) {
    currentChartView = view;
    
    // Update button states
    const tabs = document.querySelectorAll('.chart-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    
    updateWeatherChart();
}

// ==========================================
// CITY COMPARISON
// ==========================================

function openCityCompare() {
    const modal = document.getElementById('cityCompareModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeCityCompare() {
    const modal = document.getElementById('cityCompareModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

async function compareCities() {
    const city1 = document.getElementById('compareCity1')?.value;
    const city2 = document.getElementById('compareCity2')?.value;
    const city3 = document.getElementById('compareCity3')?.value;

    const cities = [city1, city2, city3].filter(c => c && c.trim());
    
    if (cities.length === 0) {
        showToast("กรุณากรอกชื่อเมืองอย่างน้อย 1 เมือง", "error");
        return;
    }

    showToast("กำลังเปรียบเทียบเมือง...", "info");

    const resultsContainer = document.getElementById('compareResults');
    if (resultsContainer) {
        resultsContainer.innerHTML = '<div style="text-align: center; color: var(--text-secondary);">กำลังโหลด...</div>';
    }

    const cityDataPromises = cities.map(city => fetchCityWeather(city));
    const cityData = await Promise.all(cityDataPromises);

    displayCityComparison(cityData);
}

async function fetchCityWeather(cityName) {
    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.cod === 200) {
            return {
                name: data.name,
                country: data.sys.country,
                temp: Math.round(data.main.temp),
                feelsLike: Math.round(data.main.feels_like),
                humidity: data.main.humidity,
                windSpeed: (data.wind.speed * 3.6).toFixed(1),
                description: data.weather[0].description,
                icon: getWeatherIcon(data.weather[0].id)
            };
        }
    } catch (error) {
        console.error(`Error fetching weather for ${cityName}:`, error);
    }
    return null;
}

function getWeatherIcon(weatherCode) {
    if (weatherCode >= 200 && weatherCode < 300) return '⛈️';
    if (weatherCode >= 300 && weatherCode < 600) return '🌧️';
    if (weatherCode >= 600 && weatherCode < 700) return '❄️';
    if (weatherCode >= 700 && weatherCode < 800) return '🌫️';
    if (weatherCode === 800) return '☀️';
    return '☁️';
}

function displayCityComparison(cityData) {
    const resultsContainer = document.getElementById('compareResults');
    if (!resultsContainer) return;

    const validData = cityData.filter(c => c !== null);

    if (validData.length === 0) {
        resultsContainer.innerHTML = '<div style="text-align: center; color: var(--accent-red);">ไม่พบข้อมูลเมือง</div>';
        showToast("ไม่พบข้อมูลเมืองที่ค้นหา", "error");
        return;
    }

    resultsContainer.innerHTML = validData.map(city => `
        <div class="compare-city-card">
            <div class="compare-city-name">
                <span>${city.icon}</span>
                <span>${city.name}, ${city.country}</span>
            </div>
            <div class="compare-temp">${city.temp}°C</div>
            <div class="compare-info">
                <div class="compare-info-item">
                    <span class="compare-info-label">ความรู้สึก:</span>
                    <span class="compare-info-value">${city.feelsLike}°C</span>
                </div>
                <div class="compare-info-item">
                    <span class="compare-info-label">ความชื้น:</span>
                    <span class="compare-info-value">${city.humidity}%</span>
                </div>
                <div class="compare-info-item">
                    <span class="compare-info-label">ลม:</span>
                    <span class="compare-info-value">${city.windSpeed} km/h</span>
                </div>
                <div class="compare-info-item">
                    <span class="compare-info-label">สภาพอากาศ:</span>
                    <span class="compare-info-value">${city.description}</span>
                </div>
            </div>
        </div>
    `).join('');

    showToast(`เปรียบเทียบ ${validData.length} เมืองสำเร็จ`, "success");
}

// ==========================================
// SHARE WEATHER
// ==========================================

function shareWeather() {
    const shareText = `🌤️ สภาพอากาศ ${LOCATION.name}
🌡️ อุณหภูมิ: ${weatherData.currentTemp}°C (ความรู้สึก ${weatherData.feelsLike}°C)
💧 ความชื้น: ${weatherData.humidity}%
💨 ลม: ${(weatherData.windSpeed * 3.6).toFixed(1)} km/h
🌫️ AQI: ${aqiData.aqi || 'N/A'}

ตรวจสอบโดย Storm Checker Pro`;

    if (navigator.share) {
        navigator.share({
            title: 'สภาพอากาศ ' + LOCATION.name,
            text: shareText
        }).then(() => {
            showToast("แชร์สำเร็จ!", "success");
        }).catch(err => {
            console.log('Error sharing:', err);
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast("คัดลอกข้อมูลแล้ว!", "success");
    }).catch(err => {
        console.error('Could not copy text:', err);
        showToast("ไม่สามารถคัดลอกข้อมูลได้", "error");
    });
}

// ==========================================
// WEATHER ALERTS SYSTEM
// ==========================================

function checkWeatherAlerts() {
    const alerts = [];
    
    if (weatherData.weatherCode >= 200 && weatherData.weatherCode < 300) {
        alerts.push({
            icon: "⛈️",
            title: "เตือนพายุฝนฟ้าคะนอง",
            message: "พบสภาพพายุฝนฟ้าคะนอง ควระวังฟ้าผ่าและลมแรง",
            level: "danger"
        });
    }
    
    if (weatherData.weatherCode >= 500 && weatherData.weatherCode < 600) {
        const rainIntensity = weatherData.weatherCode;
        if (rainIntensity >= 520) {
            alerts.push({
                icon: "🌧️",
                title: "เตือนฝนตกหนัก",
                message: "ฝนตกหนัก ควรหลีกเลี่ยงการเดินทาง",
                level: "warning"
            });
        }
    }
    
    const windKmh = weatherData.windSpeed * 3.6;
    if (windKmh > 50) {
        alerts.push({
            icon: "💨",
            title: "เตือนลมแรง",
            message: `ลมแรงความเร็ว ${windKmh.toFixed(0)} km/h`,
            level: "warning"
        });
    }
    
    if (weatherData.currentTemp > 38) {
        alerts.push({
            icon: "🔥",
            title: "เตือนอากาศร้อนจัด",
            message: `อุณหภูมิสูง ${Math.round(weatherData.currentTemp)}°C ควรดื่มน้ำมากๆ`,
            level: "warning"
        });
    }
    
    if (aqiData.aqi > 150) {
        alerts.push({
            icon: "🌫️",
            title: "เตือนคุณภาพอากาศแย่",
            message: `AQI ${aqiData.aqi} ควรหลีกเลี่ยงกิจกรรมกลางแจ้ง`,
            level: "warning"
        });
    }

    updateWeatherAlerts(alerts);
}

function updateWeatherAlerts(alerts) {
    const alertsCard = document.getElementById("weatherAlertsCard");
    const alertsContainer = document.getElementById("weatherAlerts");

    if (!alertsCard || !alertsContainer) return;

    if (alerts.length === 0) {
        alertsCard.style.display = "none";
        return;
    }

    alertsCard.style.display = "block";
    alertsContainer.innerHTML = alerts.map(alert => `
        <div class="weather-alert alert-${alert.level}">
            <div class="alert-icon">${alert.icon}</div>
            <div class="alert-content">
                <div class="alert-title">${alert.title}</div>
                <div class="alert-message">${alert.message}</div>
            </div>
        </div>
    `).join('');
}

// ==========================================
// FETCH WEATHER DATA
// ==========================================

async function fetchWeatherData() {
    const startTime = performance.now();

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${LOCATION.lat}&lon=${LOCATION.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        
        const response = await fetch(url);
        const data = await response.json();

        const endTime = performance.now();
        networkStats.delay = endTime - startTime;

        if (data.cod === 200) {
            weatherData.currentTemp = data.main.temp;
            weatherData.feelsLike = data.main.feels_like;
            weatherData.humidity = data.main.humidity;
            weatherData.cloudCover = data.clouds.all;
            weatherData.weatherCode = data.weather[0].id;
            weatherData.weatherDescription = data.weather[0].description;
            weatherData.windSpeed = data.wind.speed;
            weatherData.windDeg = data.wind.deg;
            weatherData.pressure = data.main.pressure;
            weatherData.visibility = data.visibility;
            weatherData.sunrise = data.sys.sunrise;
            weatherData.sunset = data.sys.sunset;

            updateMainTemp(weatherData.currentTemp);
            updateAdvancedWeatherInfo();
            updateComfortIndex();
            checkWeatherAlerts();

            const locationEl = document.getElementById('currentLocation');
            if (locationEl) locationEl.textContent = data.name;

            await fetchUVIndex();
            await fetchHourlyForecast();
            await fetchAQI();
            await fetch7DayForecast();

            showToast("✅ อัพเดทข้อมูลสำเร็จ", "success");
        } else {
            throw new Error(data.message || "Unknown error");
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
        showToast("⚠️ ไม่สามารถดึงข้อมูลสภาพอากาศได้", "error");
    }
}

async function fetchUVIndex() {
    try {
        const url = `https://api.openweathermap.org/data/2.5/uvi?lat=${LOCATION.lat}&lon=${LOCATION.lon}&appid=${OPENWEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.value !== undefined) {
            weatherData.uvIndex = Math.round(data.value);
            updateAdvancedWeatherInfo();
        }
    } catch (error) {
        console.error("Error fetching UV index:", error);
    }
}

async function fetchHourlyForecast() {
    try {
        const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LOCATION.lat}&lon=${LOCATION.lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.list) {
            const now = new Date();
            const todayStr = now.toLocaleDateString();
            const tomorrowStr = new Date(now.getTime() + 86400000).toLocaleDateString();

            weatherData.forecast = data.list.slice(0, 16);
            updateForecastDisplay(todayStr, tomorrowStr);
        }
    } catch (error) {
        console.error("Error fetching forecast:", error);
    }
}

function updateForecastDisplay(todayStr, tomorrowStr) {
    if (isUpdatingForecast) {
        console.warn("Forecast update already in progress");
        return;
    }

    isUpdatingForecast = true;
    forecastUpdateTimeouts.forEach(timeout => clearTimeout(timeout));
    forecastUpdateTimeouts = [];

    const containerToday = document.getElementById("forecastContainerToday");
    const containerTomorrow = document.getElementById("forecastContainerTomorrow");

    if (!containerToday || !containerTomorrow) {
        isUpdatingForecast = false;
        return;
    }

    const todayForecasts = [];
    const tomorrowForecasts = [];

    weatherData.forecast.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateStr = date.toLocaleDateString();

        if (dateStr === todayStr) {
            todayForecasts.push(item);
        } else if (dateStr === tomorrowStr) {
            tomorrowForecasts.push(item);
        }
    });

    containerToday.innerHTML = '';
    containerTomorrow.innerHTML = '';

    todayForecasts.slice(0, 4).forEach((item, index) => {
        const timeout = setTimeout(() => {
            const forecastCard = createForecastCard(item);
            containerToday.appendChild(forecastCard);
        }, index * 100);
        forecastUpdateTimeouts.push(timeout);
    });

    tomorrowForecasts.slice(0, 4).forEach((item, index) => {
        const timeout = setTimeout(() => {
            const forecastCard = createForecastCard(item);
            containerTomorrow.appendChild(forecastCard);
        }, (todayForecasts.length + index) * 100);
        forecastUpdateTimeouts.push(timeout);
    });

    const finishTimeout = setTimeout(() => {
        isUpdatingForecast = false;
    }, (todayForecasts.length + tomorrowForecasts.length) * 100 + 200);
    forecastUpdateTimeouts.push(finishTimeout);
}

function createForecastCard(item) {
    const div = document.createElement('div');
    div.className = 'forecast-item';

    const date = new Date(item.dt * 1000);
    const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const temp = Math.round(item.main.temp);
    const icon = getWeatherIcon(item.weather[0].id);
    const rainChance = item.pop ? Math.round(item.pop * 100) : 0;

    div.innerHTML = `
        <div class="forecast-time">${time}</div>
        <div class="forecast-icon">${icon}</div>
        <div class="forecast-temp">${temp}°</div>
        <div class="forecast-rain">💧 ${rainChance}%</div>
    `;

    return div;
}

// ==========================================
// NETWORK PERFORMANCE
// ==========================================

async function checkNetworkPerformance() {
    const startTime = performance.now();

    try {
        await fetch('https://www.google.com', { mode: 'no-cors' });
        const endTime = performance.now();
        
        networkStats.ping = Math.round(endTime - startTime);
        updateNetworkStats(networkStats.delay, networkStats.ping);
    } catch (error) {
        networkStats.ping = 999;
        updateNetworkStats(networkStats.delay, 999);
    }
}

// ==========================================
// LOCATION DETECTION
// ==========================================

async function detectUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.warn("Geolocation not supported");
            resolve();
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                LOCATION.lat = position.coords.latitude;
                LOCATION.lon = position.coords.longitude;

                try {
                    const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${LOCATION.lat}&lon=${LOCATION.lon}&limit=1&appid=${OPENWEATHER_API_KEY}`;
                    const response = await fetch(url);
                    const data = await response.json();

                    if (data.length > 0) {
                        LOCATION.name = data[0].name || data[0].local_names?.th || "Unknown";
                    }
                } catch (error) {
                    console.error("Error reverse geocoding:", error);
                }

                console.log(`📍 Location detected: ${LOCATION.name} (${LOCATION.lat}, ${LOCATION.lon})`);
                resolve();
            },
            (error) => {
                console.warn("Location detection failed:", error.message);
                resolve();
            }
        );
    });
}

// ==========================================
// SETTINGS
// ==========================================

function openSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('show');

        const latInput = document.getElementById('settingLat');
        const lonInput = document.getElementById('settingLon');
        const cityInput = document.getElementById('settingCityName');
        const intervalInput = document.getElementById('settingUpdateInterval');

        if (latInput) latInput.value = LOCATION.lat;
        if (lonInput) lonInput.value = LOCATION.lon;
        if (cityInput) cityInput.value = cityName;
        if (intervalInput) intervalInput.value = updateIntervalMinutes;
    }
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function selectTheme(theme) {
    currentTheme = theme;
    document.body.className = `${theme}-theme`;
    
    const options = document.querySelectorAll('.theme-option');
    options.forEach(opt => opt.classList.remove('active'));
    document.querySelector(`[data-theme="${theme}"]`)?.classList.add('active');

    localStorage.setItem('theme', theme);
    showToast(`เปลี่ยนธีมเป็น ${theme} mode`, "success");
}

function toggleAutoDetect() {
    autoDetectLocation = !autoDetectLocation;
    
    const toggle = document.getElementById('autoDetectToggle');
    const status = document.getElementById('autoDetectStatus');
    const cityInputContainer = document.getElementById('cityInputContainer');

    if (toggle) {
        if (autoDetectLocation) {
            toggle.classList.add('active');
            if (status) status.textContent = "เปิดอยู่";
            if (cityInputContainer) cityInputContainer.classList.remove('show');
        } else {
            toggle.classList.remove('active');
            if (status) status.textContent = "ปิดอยู่";
            if (cityInputContainer) cityInputContainer.classList.add('show');
        }
    }
}

function toggleAutoUpdate() {
    autoUpdateEnabled = !autoUpdateEnabled;
    
    const toggle = document.getElementById('autoUpdateToggle');
    const status = document.getElementById('autoUpdateStatus');

    if (toggle) {
        if (autoUpdateEnabled) {
            toggle.classList.add('active');
            if (status) status.textContent = "เปิดอยู่";
            startAutoUpdate();
        } else {
            toggle.classList.remove('active');
            if (status) status.textContent = "ปิดอยู่";
            stopAutoUpdate();
        }
    }
}

async function saveSettings() {
    const latInput = document.getElementById('settingLat');
    const lonInput = document.getElementById('settingLon');
    const cityInput = document.getElementById('settingCityName');
    const intervalInput = document.getElementById('settingUpdateInterval');

    if (cityInput?.value && !autoDetectLocation) {
        cityName = cityInput.value;
        await geocodeCity(cityName);
    } else if (latInput?.value && lonInput?.value && !autoDetectLocation) {
        LOCATION.lat = parseFloat(latInput.value);
        LOCATION.lon = parseFloat(lonInput.value);
    }

    if (intervalInput?.value) {
        updateIntervalMinutes = parseInt(intervalInput.value);
        stopAutoUpdate();
        startAutoUpdate();
    }

    localStorage.setItem('settings', JSON.stringify({
        theme: currentTheme,
        autoDetectLocation,
        cityName,
        lat: LOCATION.lat,
        lon: LOCATION.lon,
        updateIntervalMinutes
    }));

    closeSettings();
    showToast("💾 บันทึกการตั้งค่าสำเร็จ", "success");

    setTimeout(() => {
        fetchWeatherData();
    }, 500);
}

async function geocodeCity(city) {
    try {
        const url = `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${OPENWEATHER_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.length > 0) {
            LOCATION.lat = data[0].lat;
            LOCATION.lon = data[0].lon;
            LOCATION.name = data[0].name;
            showToast(`📍 พบตำแหน่ง: ${LOCATION.name}`, "success");
        } else {
            showToast("❌ ไม่พบเมืองที่ระบุ", "error");
        }
    } catch (error) {
        console.error("Geocoding error:", error);
        showToast("⚠️ เกิดข้อผิดพลาดในการค้นหาตำแหน่ง", "error");
    }
}

function loadSettings() {
    const savedSettings = localStorage.getItem('settings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        currentTheme = settings.theme || 'dark';
        autoDetectLocation = settings.autoDetectLocation !== false;
        cityName = settings.cityName || '';
        updateIntervalMinutes = settings.updateIntervalMinutes || 5;

        if (!autoDetectLocation && settings.lat && settings.lon) {
            LOCATION.lat = settings.lat;
            LOCATION.lon = settings.lon;
        }

        document.body.className = `${currentTheme}-theme`;
    }
}

function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        currentTheme = savedTheme;
        document.body.className = `${currentTheme}-theme`;
    }
}

// ==========================================
// AUTO UPDATE
// ==========================================

function startAutoUpdate() {
    if (!autoUpdateEnabled) return;

    stopAutoUpdate();

    autoUpdateInterval = setInterval(() => {
        console.log("🔄 Auto update triggered");
        fetchWeatherData();
        checkNetworkPerformance();
    }, updateIntervalMinutes * 60 * 1000);

    console.log(`✅ Auto update enabled (every ${updateIntervalMinutes} minutes)`);
}

function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
        console.log("❌ Auto update stopped");
    }
}

// ==========================================
// ACTIONS
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

    } catch (err) {
        console.error("Refresh Error:", err);
        showToast("⚠️ เกิดข้อผิดพลาด", "error");
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
            feelsLike: 24,
            humidity: 0,
            cloudCover: 0,
            weatherCode: 0,
            weatherDescription: "",
            windSpeed: 0,
            windDeg: 0,
            pressure: 0,
            visibility: 0,
            uvIndex: 0,
            sunrise: 0,
            sunset: 0,
            forecast: [],
            forecast7days: []
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
    console.log("🌤️ STORM CHECKER PRO - Weather Info");
    console.log("=".repeat(50));
    console.log(`📍 Location: ${LOCATION.name}`);
    console.log(`🌡️ Temp: ${weatherData.currentTemp}°C (Feels: ${weatherData.feelsLike}°C)`);
    console.log(`💧 Humidity: ${weatherData.humidity}%`);
    console.log(`☁️ Cloud: ${weatherData.cloudCover}%`);
    console.log(`💨 Wind: ${(weatherData.windSpeed * 3.6).toFixed(1)} km/h (${weatherData.windDeg}°)`);
    console.log(`🌡️ Pressure: ${weatherData.pressure} hPa`);
    console.log(`☀️ UV Index: ${weatherData.uvIndex}`);
    console.log(`👁️ Visibility: ${(weatherData.visibility/1000).toFixed(1)} km`);
    console.log(`🌫️ AQI: ${aqiData.aqi}`);
    console.log(`📶 Ping: ${networkStats.ping} ms`);
    console.log(`⏱️ Delay: ${networkStats.delay.toFixed(1)} ms`);
    console.log("=".repeat(50));
}

// ==========================================
// INIT APP
// ==========================================

async function initApp() {
    console.log("⛈️ Storm Checker Pro Premium v2.0 Starting...");

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

document.addEventListener("DOMContentLoaded", initApp);
