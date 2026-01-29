        const LOCATION = {
            lat: 18.7883,
            lon: 98.9853,
            name: 'Chiang Mai'
        };

        // Settings
        let currentTheme = 'dark';
        let autoDetectLocation = true;
        let cityName = '';

        // ตัวแปรสำหรับเก็บข้อมูล
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

        // ตัวแปรป้องกันการอัพเดทซ้ำซ้อน
        let isUpdatingForecast = false;
        let forecastUpdateTimeouts = [];

        async function detectUserLocation() {
            console.log('🛰️ ตรวจหาตำแหน่งจาก IP...');
        
            try {
                const res = await fetch('https://ipapi.co/json/');
                const data = await res.json();
        
                if (!data || !data.latitude || !data.longitude) {
                    throw new Error('Invalid IP location data');
                }
        
                const lat = data.latitude;
                const lon = data.longitude;
        
                LOCATION.lat = lat;
                LOCATION.lon = lon;
                LOCATION.name = data.city || data.country_name || 'Approximate location';
                cityName = LOCATION.name;
        
                // save
                localStorage.setItem('locationLat', lat);
                localStorage.setItem('locationLon', lon);
                localStorage.setItem('locationName', LOCATION.name);
                localStorage.setItem('locationSource', 'ip');
        
                showToast(`🛰️ ใช้ตำแหน่งโดยประมาณ: ${LOCATION.name}`, 'info');
        
                fetchWeatherData();
        
                return {
                    lat,
                    lon,
                    name: LOCATION.name,
                    source: 'ip'
                };
        
            } catch (err) {
                console.warn('❌ IP location failed:', err);
                showToast('❌ ไม่สามารถระบุตำแหน่งจาก IP', 'error');
                return null;
            }
        }
        

        // ฟังก์ชันอัพเดทอุณหภูมิหลัก
        function updateMainTemp(temp) {
            const mainTempElement = document.getElementById('mainTemp');
            if (mainTempElement) {
                // เพิ่ม animation เวลาเปลี่ยนอุณหภูมิ
                mainTempElement.style.opacity = '0.5';
                setTimeout(() => {
                    mainTempElement.textContent = Math.round(temp);
                    mainTempElement.style.opacity = '1';
                }, 300);
            }
        }

        // ฟังก์ชันอัพเดท Network Stats
        function updateNetworkStats(delay, ping) {
            const delayEl = document.getElementById('delay');
            const pingEl = document.getElementById('ping');
            const apiStatusEl = document.getElementById('apiStatus');
            const connectionStatusEl = document.getElementById('connectionStatus');
            
            if (delayEl) delayEl.textContent = delay.toFixed(1) + ' ms';
            if (pingEl) pingEl.textContent = ping + ' ms';
            
            // เช็คสถานะ API (ดีเลย์)
            if (apiStatusEl) {
                if (delay < 200) {
                    apiStatusEl.textContent = 'ดี';
                    apiStatusEl.className = 'stat-value status-good';
                } else if (delay < 500) {
                    apiStatusEl.textContent = 'ปานกลาง';
                    apiStatusEl.className = 'stat-value status-warning';
                } else {
                    apiStatusEl.textContent = 'แย่';
                    apiStatusEl.className = 'stat-value status-bad';
                }
            }
            
            // เช็คสถานะอินเทอร์เน็ต (ping)
            if (connectionStatusEl) {
                if (ping < 100) {
                    connectionStatusEl.textContent = 'ดี';
                    connectionStatusEl.className = 'stat-value status-good';
                } else if (ping < 300) {
                    connectionStatusEl.textContent = 'ปานกลาง';
                    connectionStatusEl.className = 'stat-value status-warning';
                } else {
                    connectionStatusEl.textContent = 'แย่';
                    connectionStatusEl.className = 'stat-value status-bad';
                }
            }
        }

        // ฟังก์ชันสร้างการ์ดความชื้นในอากาศ
        function createHumidityCard(humidity) {
            const item = document.createElement('div');
            item.className = 'forecast-item';

            const bar = document.createElement('div');
            bar.className = 'forecast-bar';

            const fill = document.createElement('div');
            fill.className = 'forecast-fill';
            
            // คำนวณความสูงของแถบตามความชื้น (0-100%)
            const barHeight = Math.max(10, Math.min(90, humidity));
            
            // กำหนดสีตามความชื้น
            if (humidity >= 70) {
                fill.classList.add('high');
            } else if (humidity >= 40) {
                fill.classList.add('medium');
            } else {
                fill.classList.add('low');
            }
            
            fill.style.height = barHeight + '%';
            bar.appendChild(fill);

            const icon = document.createElement('div');
            icon.className = 'forecast-icon';
            icon.textContent = '💧';

            const temp = document.createElement('div');
            temp.className = 'forecast-temp';
            temp.textContent = Math.round(humidity) + '%';

            const title = document.createElement('div');
            title.className = 'forecast-title';
            title.textContent = 'ความชื้น';

            item.title = `ความชื้นในอากาศ: ${Math.round(humidity)}%`;

            item.appendChild(bar);
            item.appendChild(icon);
            item.appendChild(temp);
            item.appendChild(title);

            return item;
        }

        // ฟังก์ชันสร้างการ์ดอุณหภูมิ
        function createTemperatureCard(temp) {
            const item = document.createElement('div');
            item.className = 'forecast-item';

            const bar = document.createElement('div');
            bar.className = 'forecast-bar';

            const fill = document.createElement('div');
            fill.className = 'forecast-fill';
            
            // คำนวณความสูงของแถบตามอุณหภูมิ (15-40 องศา)
            const minTemp = 15;
            const maxTemp = 40;
            const normalizedTemp = ((temp - minTemp) / (maxTemp - minTemp)) * 100;
            const barHeight = Math.max(10, Math.min(90, normalizedTemp));
            
            // กำหนดสีตามอุณหภูมิ
            if (temp >= 32) {
                fill.classList.add('high');
            } else if (temp >= 24) {
                fill.classList.add('medium');
            } else {
                fill.classList.add('low');
            }
            
            fill.style.height = barHeight + '%';
            bar.appendChild(fill);

            const icon = document.createElement('div');
            icon.className = 'forecast-icon';
            icon.textContent = '🌡️';

            const tempDisplay = document.createElement('div');
            tempDisplay.className = 'forecast-temp';
            tempDisplay.textContent = Math.round(temp) + '°';

            const title = document.createElement('div');
            title.className = 'forecast-title';
            title.textContent = 'อุณหภูมิ';

            item.title = `อุณหภูมิ: ${Math.round(temp)}°C`;

            item.appendChild(bar);
            item.appendChild(icon);
            item.appendChild(tempDisplay);
            item.appendChild(title);

            return item;
        }

        // ฟังก์ชันสร้างการ์ดโอกาสฝนตก
        function createRainChanceCard(weatherCode, cloudCover) {
            const item = document.createElement('div');
            item.className = 'forecast-item';

            const bar = document.createElement('div');
            bar.className = 'forecast-bar';

            const fill = document.createElement('div');
            fill.className = 'forecast-fill';
            
            // คำนวณโอกาสฝนตกจาก weatherCode และ cloudCover
            let rainChance = 0;
            if (weatherCode >= 95) {
                rainChance = 90; // พายุฝนฟ้าคะนอง
            } else if (weatherCode >= 80) {
                rainChance = 70; // ฝนตกหนัก
            } else if (weatherCode >= 61) {
                rainChance = 60; // ฝนตก
            } else if (weatherCode >= 51) {
                rainChance = 40; // ฝนปรอยๆ
            } else {
                // คำนวณจากเมฆปกคลุม
                rainChance = Math.min(30, Math.round(cloudCover * 0.3));
            }
            
            const barHeight = Math.max(10, Math.min(90, rainChance));
            
            // กำหนดสีตามโอกาสฝนตก
            if (rainChance >= 60) {
                fill.classList.add('high');
            } else if (rainChance >= 30) {
                fill.classList.add('medium');
            } else {
                fill.classList.add('low');
            }
            
            fill.style.height = barHeight + '%';
            bar.appendChild(fill);

            const icon = document.createElement('div');
            icon.className = 'forecast-icon';
            icon.textContent = getWeatherIcon(weatherCode, cloudCover);

            const rainDisplay = document.createElement('div');
            rainDisplay.className = 'forecast-temp';
            rainDisplay.textContent = rainChance + '%';

            const title = document.createElement('div');
            title.className = 'forecast-title';
            title.textContent = 'โอกาสฝน';

            item.title = `โอกาสฝนตก: ${rainChance}%`;

            item.appendChild(bar);
            item.appendChild(icon);
            item.appendChild(rainDisplay);
            item.appendChild(title);

            return item;
        }

        // ฟังก์ชันเลือกไอคอนสภาพอากาศ
        function getWeatherIcon(weatherCode, cloudCover) {
            // Weather codes จาก Open-Meteo
            // 0: Clear sky
            // 1-3: Partly cloudy
            // 45,48: Fog
            // 51,53,55: Drizzle
            // 61,63,65: Rain
            // 71,73,75: Snow
            // 80,81,82: Rain showers
            // 95,96,99: Thunderstorm
            
            if (weatherCode === 0) return '☀️';
            if (weatherCode <= 3) return cloudCover > 50 ? '☁️' : '⛅';
            if (weatherCode <= 48) return '🌫️';
            if (weatherCode <= 67) return '🌧️';
            if (weatherCode <= 77) return '❄️';
            if (weatherCode <= 82) return '🌦️';
            if (weatherCode >= 95) return '⛈️';
            
            return '🌡️';
        }

        // ฟังก์ชันอัพเดทพยากรณ์อากาศ - แยกวันนี้และพรุ่งนี้
        function updateForecast(forecastArray) {
            // ป้องกันการอัพเดทซ้ำซ้อน
            if (isUpdatingForecast) {
                console.log('⚠️ กำลังอัพเดทอยู่แล้ว ข้ามการเรียกนี้');
                return;
            }

            const containerToday = document.getElementById('forecastContainerToday');
            const containerTomorrow = document.getElementById('forecastContainerTomorrow');
            if (!containerToday || !containerTomorrow) return;
            
            // ตั้งค่าสถานะว่ากำลังอัพเดท
            isUpdatingForecast = true;
            
            // ยกเลิก timeout ทั้งหมดที่ค้างอยู่
            forecastUpdateTimeouts.forEach(timeout => clearTimeout(timeout));
            forecastUpdateTimeouts = [];
            
            // ลบการ์ดเก่าทั้งหมดก่อน
            containerToday.innerHTML = '';
            containerTomorrow.innerHTML = '';

            // สร้างการ์ดวันนี้ (ข้อมูลปัจจุบัน)
            const cardsToday = [];
            
            // 1. การ์ดความชื้นในอากาศ (วันนี้)
            if (weatherData.humidity !== undefined) {
                const humidityCard = createHumidityCard(weatherData.humidity);
                humidityCard.style.opacity = '0';
                humidityCard.style.transform = 'translateY(20px)';
                cardsToday.push({ card: humidityCard, index: 0 });
            }
            
            // 2. การ์ดอุณหภูมิ (วันนี้)
            if (weatherData.currentTemp !== undefined) {
                const tempCard = createTemperatureCard(weatherData.currentTemp);
                tempCard.style.opacity = '0';
                tempCard.style.transform = 'translateY(20px)';
                cardsToday.push({ card: tempCard, index: 1 });
            }
            
            // 3. การ์ดโอกาสฝนตก (วันนี้)
            if (weatherData.weatherCode !== undefined) {
                const rainCard = createRainChanceCard(weatherData.weatherCode, weatherData.cloudCover);
                rainCard.style.opacity = '0';
                rainCard.style.transform = 'translateY(20px)';
                cardsToday.push({ card: rainCard, index: 2 });
            }
            
            // สร้างการ์ดพรุ่งนี้ (ข้อมูลวันถัดไป)
            const cardsTomorrow = [];
            
            if (forecastArray && forecastArray.length > 1) {
                const tomorrowData = forecastArray[1]; // วันถัดไป (index 1)
                
                // 1. การ์ดความชื้นในอากาศ (พรุ่งนี้)
                if (tomorrowData.humidity !== undefined) {
                    const humidityCard = createHumidityCard(tomorrowData.humidity);
                    humidityCard.style.opacity = '0';
                    humidityCard.style.transform = 'translateY(20px)';
                    cardsTomorrow.push({ card: humidityCard, index: 0 });
                }
                
                // 2. การ์ดอุณหภูมิ (พรุ่งนี้)
                if (tomorrowData.temp !== undefined) {
                    const tempCard = createTemperatureCard(tomorrowData.temp);
                    tempCard.style.opacity = '0';
                    tempCard.style.transform = 'translateY(20px)';
                    cardsTomorrow.push({ card: tempCard, index: 1 });
                }
                
                // 3. การ์ดโอกาสฝนตก (พรุ่งนี้)
                if (tomorrowData.weatherCode !== undefined) {
                    const rainCard = createRainChanceCard(tomorrowData.weatherCode, tomorrowData.cloudCover || 0);
                    rainCard.style.opacity = '0';
                    rainCard.style.transform = 'translateY(20px)';
                    cardsTomorrow.push({ card: rainCard, index: 2 });
                }
            }
            
            // เพิ่มการ์ดวันนี้พร้อม animation
            cardsToday.forEach(({ card, index }) => {
                containerToday.appendChild(card);
                
                const timeoutId = setTimeout(() => {
                    card.style.transition = 'all 0.4s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
                
                forecastUpdateTimeouts.push(timeoutId);
            });
            
            // เพิ่มการ์ดพรุ่งนี้พร้อม animation
            cardsTomorrow.forEach(({ card, index }) => {
                containerTomorrow.appendChild(card);
                
                const timeoutId = setTimeout(() => {
                    card.style.transition = 'all 0.4s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, (cardsToday.length + index) * 100);
                
                forecastUpdateTimeouts.push(timeoutId);
            });

            // ปลดล็อกหลังจาก animation เสร็จ
            const unlockTimeout = setTimeout(() => {
                isUpdatingForecast = false;
            }, (cardsToday.length + cardsTomorrow.length) * 100 + 500);
            forecastUpdateTimeouts.push(unlockTimeout);
        }

        // ฟังก์ชันดึงข้อมูลจาก Open-Meteo API
        async function fetchWeatherData() {
            try {
                console.log('🌤️ กำลังดึงข้อมูลอากาศจาก Open-Meteo API...');
                
                // API URL สำหรับ Open-Meteo (ไม่ต้อง API Key!)
                const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${LOCATION.lat}&longitude=${LOCATION.lon}&current=temperature_2m,relative_humidity_2m,cloud_cover&daily=temperature_2m_max,temperature_2m_min,weather_code,relative_humidity_2m_mean,cloud_cover_mean&timezone=Asia/Bangkok&forecast_days=16`;
                
                const startTime = performance.now();
                const response = await fetch(apiUrl);
                const endTime = performance.now();
                
                // คำนวณ delay
                const delay = endTime - startTime;
                networkStats.delay = delay;
                networkStats.ping = Math.round(delay);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('✅ ดึงข้อมูลสำเร็จ:', data);
                
                // อัพเดทอุณหภูมิปัจจุบัน
                if (data.current) {
                    weatherData.currentTemp = data.current.temperature_2m;
                    weatherData.humidity = data.current.relative_humidity_2m;
                    weatherData.cloudCover = data.current.cloud_cover;
                    
                    updateMainTemp(weatherData.currentTemp);
                    
                    console.log(`🌡️ อุณหภูมิปัจจุบัน: ${weatherData.currentTemp}°C`);
                    console.log(`💧 ความชื้น: ${weatherData.humidity}%`);
                    console.log(`☁️ เมฆ: ${weatherData.cloudCover}%`);
                }
                
                // อัพเดทพยากรณ์อากาศ
                if (data.daily) {
                    weatherData.forecast = [];
                    
                    for (let i = 0; i < data.daily.time.length; i++) {
                        const avgTemp = (data.daily.temperature_2m_max[i] + data.daily.temperature_2m_min[i]) / 2;
                        
                        weatherData.forecast.push({
                            date: data.daily.time[i],
                            temp: avgTemp,
                            maxTemp: data.daily.temperature_2m_max[i],
                            minTemp: data.daily.temperature_2m_min[i],
                            weatherCode: data.daily.weather_code[i],
                            humidity: data.daily.relative_humidity_2m_mean[i] || 0,
                            cloudCover: data.daily.cloud_cover_mean[i] || 0
                        });
                    }
                    
                    // เก็บ weatherCode ของวันนี้ไว้ใน weatherData
                    if (weatherData.forecast.length > 0) {
                        weatherData.weatherCode = weatherData.forecast[0].weatherCode;
                    }
                    
                    updateForecast(weatherData.forecast);
                    console.log(`📅 พยากรณ์อากาศ ${weatherData.forecast.length} วัน`);
                }
                
                // อัพเดท Network Stats
                updateNetworkStats(networkStats.delay, networkStats.ping);
                
            } catch (error) {
                console.error('❌ เกิดข้อผิดพลาดในการดึงข้อมูล:', error);
                
                // แสดงข้อผิดพลาดบน UI
                const mainTemp = document.getElementById('mainTemp');
                if (mainTemp) {
                    mainTemp.textContent = '--';
                }
                
                // อัพเดท ping เป็น 999 เมื่อมีข้อผิดพลาด
                updateNetworkStats(0, 999);
            }
        }

        // ฟังก์ชันเช็ค Network Performance (Ping test)
        async function checkNetworkPerformance() {
            try {
                const startTime = performance.now();
                
                // ใช้ HEAD request เพื่อเช็คความเร็ว
                await fetch('https://api.open-meteo.com/v1/forecast?latitude=0&longitude=0', {
                    method: 'HEAD'
                });
                
                const endTime = performance.now();
                const ping = Math.round(endTime - startTime);
                
                networkStats.ping = ping;
                networkStats.delay = (endTime - startTime) / 2; // RTT/2
                
                updateNetworkStats(networkStats.delay, networkStats.ping);
                
            } catch (error) {
                console.warn('⚠️ ไม่สามารถเช็ค network performance:', error);
                updateNetworkStats(0, 999);
            }
        }

        // ฟังก์ชันแสดงข้อมูลเพิ่มเติม
        function displayWeatherInfo() {
            console.log('='.repeat(50));
            console.log('🌤️ STORM CHECKER - ข้อมูลสภาพอากาศ');
            console.log('='.repeat(50));
            console.log(`📍 ตำแหน่ง: ${LOCATION.name}`);
            console.log(`🌡️ อุณหภูมิ: ${weatherData.currentTemp}°C`);
            console.log(`💧 ความชื้น: ${weatherData.humidity}%`);
            console.log(`☁️ เมฆปกคลุม: ${weatherData.cloudCover}%`);
            console.log(`📶 Ping: ${networkStats.ping} ms`);
            console.log(`⏱️ Delay: ${networkStats.delay.toFixed(1)} ms`);
            console.log('='.repeat(50));
        }

        // ==========================================
        // TIME-BASED BACKGROUND SYSTEM
        // ==========================================
        
        // ฟังก์ชันเช็คเวลาและเปลี่ยน background
        function updateTimeBasedBackground() {
            const now = new Date();
            const hour = now.getHours();
            const minutes = now.getMinutes();
            const totalMinutes = hour * 60 + minutes;
            
            const body = document.body;
            const sun = document.getElementById('sun');
            const moon = document.getElementById('moon');
            const skyContainer = document.getElementById('skyContainer');
            
            // ลบ class เก่าทั้งหมด
            body.classList.remove('night', 'morning', 'day', 'evening');
            
            // ลบดาวเก่า
            const oldStars = skyContainer.querySelectorAll('.star, .shooting-star');
            oldStars.forEach(star => star.remove());
            
            // กำหนดช่วงเวลา:
            // กลางคืน: 20:00 - 05:59 (20:00 - 23:59 และ 00:00 - 05:59)
            // เช้า: 06:00 - 08:59
            // กลางวัน: 09:00 - 16:59
            // เย็น: 17:00 - 19:59
            
            if (hour >= 20 || hour < 6) {
                // กลางคืน
                body.classList.add('night');
                
                // แสดงพระจันทร์
                if (moon) {
                    moon.style.opacity = '1';
                    // คำนวณตำแหน่งพระจันทร์ตามเวลา
                    // เที่ยงคืน (00:00) = ตรงกลาง (50%)
                    // 18:00 = ซ้ายสุด (0%)
                    // 06:00 = ขวาสุด (100%)
                    let moonX, moonY;
                    
                    if (hour >= 20) {
                        // 20:00 - 23:59: พระจันทร์ขึ้นจากซ้าย
                        const nightMinutes = (hour - 20) * 60 + minutes;
                        const nightProgress = nightMinutes / (4 * 60); // 4 ชั่วโมง
                        moonX = 10 + (nightProgress * 40); // จาก 10% ไป 50%
                        moonY = 15 + (nightProgress * 5); // จาก 15% ไป 20%
                    } else {
                        // 00:00 - 05:59: พระจันทร์เคลื่อนไปขวา
                        const nightMinutes = hour * 60 + minutes;
                        const nightProgress = nightMinutes / (6 * 60); // 6 ชั่วโมง
                        moonX = 50 + (nightProgress * 40); // จาก 50% ไป 90%
                        moonY = 20 - (nightProgress * 5); // จาก 20% ไป 15%
                    }
                    
                    moon.style.left = moonX + '%';
                    moon.style.top = moonY + '%';
                    // หมุนพระจันทร์ตามเวลา (1 รอบต่อ 24 ชั่วโมง)
                    const rotationDegrees = (totalMinutes / 4) % 360;
                    moon.style.transform = `rotate(${rotationDegrees}deg)`;
                }
                
                // สร้างดาว
                createStars(skyContainer);
                
                // สร้างดาวตก
                createShootingStars(skyContainer);
                
            } else if (hour >= 6 && hour < 9) {
                // เช้า
                body.classList.add('morning');
                
                // แสดงพระอาทิตย์
                if (sun) {
                    sun.style.opacity = '1';
                    // พระอาทิตย์ขึ้นจากซ้ายล่าง
                    const morningMinutes = (hour - 6) * 60 + minutes;
                    const morningProgress = morningMinutes / (3 * 60); // 3 ชั่วโมง
                    const sunX = 10 + (morningProgress * 30); // จาก 10% ไป 40%
                    const sunY = 70 - (morningProgress * 50); // จาก 70% ไป 20%
                    
                    sun.style.left = sunX + '%';
                    sun.style.top = sunY + '%';
                }
                
            } else if (hour >= 9 && hour < 17) {
                // กลางวัน
                body.classList.add('day');
                
                // แสดงพระอาทิตย์
                if (sun) {
                    sun.style.opacity = '1';
                    // พระอาทิตย์อยู่บนฟ้า
                    const dayMinutes = (hour - 9) * 60 + minutes;
                    const dayProgress = dayMinutes / (8 * 60); // 8 ชั่วโมง
                    const sunX = 40 + (dayProgress * 20); // จาก 40% ไป 60%
                    const sunY = 20 + (dayProgress * 10); // จาก 20% ไป 30%
                    
                    sun.style.left = sunX + '%';
                    sun.style.top = sunY + '%';
                }
                
            } else {
                // เย็น
                body.classList.add('evening');
                
                // แสดงพระอาทิตย์ (กำลังตก)
                if (sun) {
                    sun.style.opacity = '1';
                    const eveningMinutes = (hour - 17) * 60 + minutes;
                    const eveningProgress = eveningMinutes / (3 * 60); // 3 ชั่วโมง
                    const sunX = 60 + (eveningProgress * 30); // จาก 60% ไป 90%
                    const sunY = 30 + (eveningProgress * 40); // จาก 30% ไป 70%
                    
                    sun.style.left = sunX + '%';
                    sun.style.top = sunY + '%';
                }
            }
        }
        
        // ฟังก์ชันสร้างดาว
        function createStars(container) {
            const starCount = 50;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 60 + '%'; // ไม่ให้ดาวอยู่ต่ำเกินไป
                star.style.animationDelay = Math.random() * 3 + 's';
                star.style.opacity = '1';
                container.appendChild(star);
            }
        }
        
        // ฟังก์ชันสร้างดาวตก
        function createShootingStars(container) {
            const shootingStarCount = 3;
            for (let i = 0; i < shootingStarCount; i++) {
                const shootingStar = document.createElement('div');
                shootingStar.className = 'shooting-star';
                shootingStar.style.left = Math.random() * 30 + '%';
                shootingStar.style.top = Math.random() * 30 + '%';
                shootingStar.style.animationDelay = (Math.random() * 3 + i * 1) + 's';
                shootingStar.style.opacity = '1';
                container.appendChild(shootingStar);
            }
        }
        
        // ฟังก์ชันเลือก Theme
        function selectTheme(theme) {
            currentTheme = theme;
            
            // อัพเดท UI
            const themeOptions = document.querySelectorAll('.theme-option');
            if (themeOptions.length > 0) {
                themeOptions.forEach(option => {
                    option.classList.remove('active');
                });
                const selectedOption = document.querySelector(`[data-theme="${theme}"]`);
                if (selectedOption) {
                    selectedOption.classList.add('active');
                }
            }
            
            // เปลี่ยน theme ของ body
            document.body.classList.remove('dark-theme', 'light-theme', 'galaxy-theme');
            document.body.classList.add(`${theme}-theme`);
            
            // บันทึกใน localStorage
            localStorage.setItem('theme', theme);
        }

        // ฟังก์ชันโหลด Theme จาก localStorage
        function loadTheme() {
            const savedTheme = localStorage.getItem('theme') || 'dark';
            selectTheme(savedTheme);
        }

        // โหลด Settings จาก localStorage
        function loadSettings() {
            const savedAutoDetect = localStorage.getItem('autoDetectLocation');
            const savedCityName = localStorage.getItem('cityName');
            const savedInterval = localStorage.getItem('updateInterval');
            const savedLat = localStorage.getItem('locationLat');
            const savedLon = localStorage.getItem('locationLon');
            const savedLocationName = localStorage.getItem('locationName');
            
            // โหลด location จาก localStorage
            if (savedLat && savedLon) {
                LOCATION.lat = parseFloat(savedLat);
                LOCATION.lon = parseFloat(savedLon);
                if (savedLocationName) {
                    LOCATION.name = savedLocationName;
                }
            }
            
            if (savedAutoDetect !== null) {
                autoDetectLocation = savedAutoDetect === 'true';
            }
            
            if (savedCityName) {
                cityName = savedCityName;
            }
            
            if (savedInterval) {
                updateIntervalMinutes = parseInt(savedInterval);
            }
            
            // ถ้าเปิด auto detect ให้ detect location (แต่ไม่บังคับ)
            if (autoDetectLocation && !savedLat) {
                detectUserLocation();
            }
        }

        // ฟังก์ชันซ่อน Loading Screen
        function hideLoadingScreen() {
            const loadingScreen = document.getElementById('loadingScreen');
            if (!loadingScreen) return;

            loadingScreen.classList.add('hidden');

            loadingScreen.addEventListener('transitionend', () => {
                loadingScreen.remove();
            }, { once: true });
        }

        // เริ่มต้นแอพพลิเคชั่น
        async function initApp() {
            console.log('⛈️ Storm Checker เริ่มทำงาน...');
            console.log('📍 ตำแหน่ง: Chiang Mai, Thailand');
            
            // โหลด theme
            loadTheme();
            
            // โหลด settings
            loadSettings();
            
            // อัพเดท background ตามเวลา
            updateTimeBasedBackground();
            
            // อัพเดท background ทุกนาที
            setInterval(updateTimeBasedBackground, 60000);
            
            // Timeout fallback สำหรับ loading screen (ไม่ให้ค้างเกิน 5 วินาที)
            const loadingTimeout = setTimeout(() => {
                console.warn('⚠️ Loading timeout, hiding loading screen');
                hideLoadingScreen();
            }, 5000);
            
            // ดึงข้อมูลครั้งแรก (ไม่รอให้เสร็จก่อนซ่อน loading)
            Promise.all([
                fetchWeatherData().catch(err => {
                    console.error('Error fetching weather data:', err);
                    return null;
                }),
                checkNetworkPerformance().catch(err => {
                    console.error('Error checking network:', err);
                    return null;
                })
            ]).finally(() => {
                // ยกเลิก timeout ถ้าโหลดเสร็จก่อน
                clearTimeout(loadingTimeout);
                
                // ซ่อน loading screen เมื่อโหลดเสร็จ (รออย่างน้อย 1 วินาทีเพื่อให้เห็น loading)
                setTimeout(() => {
                    hideLoadingScreen();
                }, 1000);
            });
            
            // เริ่ม Auto Update
            startAutoUpdate();
            
            // เช็ค network ทุก 10 วินาที
            setInterval(checkNetworkPerformance, 10000);
            
            // แสดงข้อมูลทุก 5 นาที
            setInterval(displayWeatherInfo, 300000);
        }

        // ==========================================
        // ACTION BUTTONS FUNCTIONS
        // ==========================================
        
        let autoUpdateInterval = null;
        let autoUpdateEnabled = true;
        let updateIntervalMinutes = 5;

        // ฟังก์ชันแสดง Toast Notification
        function showToast(message, type = 'info') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = `toast ${type} show`;
            
            setTimeout(() => {
                toast.classList.remove('show');
            }, 3000);
        }

        // ฟังก์ชันรีเฟรชข้อมูล
        async function refreshWeatherData() {
            const btn = document.getElementById('refreshBtn');
            btn.classList.add('loading');
            btn.disabled = true;
            
            try {
                showToast('🔄 กำลังดึงข้อมูลใหม่...', 'info');
                await fetchWeatherData();
                await checkNetworkPerformance();
                showToast('✅ ดึงข้อมูลสำเร็จ!', 'success');
            } catch (error) {
                showToast('❌ เกิดข้อผิดพลาดในการดึงข้อมูล', 'error');
                console.error('Error refreshing data:', error);
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }

        // ฟังก์ชันรีเซ็ต API
        function resetAPI() {
            if (confirm('คุณต้องการรีเซ็ต API และข้อมูลทั้งหมดหรือไม่?')) {
                // รีเซ็ตข้อมูล
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
                
                // รีเซ็ต UI
                updateMainTemp(24);
                updateNetworkStats(0, 999);
                
                const containerToday = document.getElementById('forecastContainerToday');
                const containerTomorrow = document.getElementById('forecastContainerTomorrow');
                if (containerToday) containerToday.innerHTML = '';
                if (containerTomorrow) containerTomorrow.innerHTML = '';
                
                showToast('🔄 กำลังดึงข้อมูลใหม่...', 'info');
                
                // ดึงข้อมูลใหม่ (ไม่รีโหลดหน้าเว็บ)
                setTimeout(() => {
                    fetchWeatherData();
                    checkNetworkPerformance();
                }, 500);
            }
        }

        // ฟังก์ชันเปิด Settings Modal
        function openSettings() {
            const modal = document.getElementById('settingsModal');
            const latInput = document.getElementById('settingLat');
            const lonInput = document.getElementById('settingLon');
            const intervalInput = document.getElementById('settingUpdateInterval');
            
            // โหลดค่าปัจจุบัน
            latInput.value = LOCATION.lat;
            lonInput.value = LOCATION.lon;
            intervalInput.value = updateIntervalMinutes;
            
            modal.classList.add('show');
            
            // ปิด modal เมื่อคลิกนอก
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeSettings();
                }
            });
        }

        // ฟังก์ชันปิด Settings Modal
        function closeSettings() {
            const modal = document.getElementById('settingsModal');
            modal.classList.remove('show');
        }

        // ฟังก์ชัน Toggle Auto Update
        function toggleAutoUpdate() {
            const toggle = document.getElementById('autoUpdateToggle');
            const status = document.getElementById('autoUpdateStatus');
            
            autoUpdateEnabled = !autoUpdateEnabled;
            toggle.classList.toggle('active');
            status.textContent = autoUpdateEnabled ? 'เปิดอยู่' : 'ปิดอยู่';
            
            if (autoUpdateEnabled) {
                startAutoUpdate();
                showToast('✅ เปิดการอัพเดทอัตโนมัติ', 'success');
            } else {
                stopAutoUpdate();
                showToast('⏸️ ปิดการอัพเดทอัตโนมัติ', 'info');
            }
        }

        // ฟังก์ชันเริ่ม Auto Update
        function startAutoUpdate() {
            stopAutoUpdate(); // หยุด interval เก่าก่อน
            
            if (autoUpdateInterval) {
                clearInterval(autoUpdateInterval);
            }
            
            autoUpdateInterval = setInterval(() => {
                if (autoUpdateEnabled) {
                    fetchWeatherData();
                    checkNetworkPerformance();
                }
            }, updateIntervalMinutes * 60000);
        }

        // ฟังก์ชันหยุด Auto Update
        function stopAutoUpdate() {
            if (autoUpdateInterval) {
                clearInterval(autoUpdateInterval);
                autoUpdateInterval = null;
            }
        }

        // ฟังก์ชันบันทึก Settings
        async function saveSettings() {
            const latInput = document.getElementById('settingLat');
            const lonInput = document.getElementById('settingLon');
            const intervalInput = document.getElementById('settingUpdateInterval');
            const cityInput = document.getElementById('settingCityName');
            
            const newInterval = parseInt(intervalInput.value);
            
            // Validate interval
            if (isNaN(newInterval) || newInterval < 1) {
                showToast('❌ ช่วงเวลาอัพเดทต้องมากกว่า 0 นาที', 'error');
                return;
            }
            
            updateIntervalMinutes = newInterval;
            
            // จัดการ location
            if (autoDetectLocation) {
                // ถ้าเปิด auto detect ให้ detect location
                detectUserLocation();
            } else {
                // ถ้าปิด auto detect
                if (cityInput.value.trim()) {
                    // ถ้ามีชื่อเมือง ให้ค้นหาพิกัด
                    showToast('🔍 กำลังค้นหาพิกัดของเมือง...', 'info');
                    const cityData = await searchCityCoordinates(cityInput.value.trim());
                    
                    if (cityData) {
                        LOCATION.lat = cityData.lat;
                        LOCATION.lon = cityData.lon;
                        LOCATION.name = cityData.name;
                        cityName = cityInput.value.trim();
                        showToast(`✅ พบเมือง: ${cityData.name}`, 'success');
                    } else {
                        showToast('❌ ไม่พบเมืองที่ระบุ', 'error');
                        return;
                    }
                } else {
                    // ถ้าไม่มีชื่อเมือง ให้ใช้พิกัดที่ใส่เอง
                    const newLat = parseFloat(latInput.value);
                    const newLon = parseFloat(lonInput.value);
                    
                    if (isNaN(newLat) || newLat < -90 || newLat > 90) {
                        showToast('❌ Latitude ไม่ถูกต้อง (ต้องอยู่ระหว่าง -90 ถึง 90)', 'error');
                        return;
                    }
                    
                    if (isNaN(newLon) || newLon < -180 || newLon > 180) {
                        showToast('❌ Longitude ไม่ถูกต้อง (ต้องอยู่ระหว่าง -180 ถึง 180)', 'error');
                        return;
                    }
                    
                    LOCATION.lat = newLat;
                    LOCATION.lon = newLon;
                    LOCATION.name = `ตำแหน่งกำหนดเอง (${newLat.toFixed(4)}, ${newLon.toFixed(4)})`;
                }
            }
            
            // บันทึก settings ใน localStorage
            localStorage.setItem('autoDetectLocation', autoDetectLocation);
            localStorage.setItem('cityName', cityName);
            localStorage.setItem('updateInterval', updateIntervalMinutes);
            localStorage.setItem('locationLat', LOCATION.lat.toString());
            localStorage.setItem('locationLon', LOCATION.lon.toString());
            localStorage.setItem('locationName', LOCATION.name);
            
            // อัพเดท Auto Update
            if (autoUpdateEnabled) {
                startAutoUpdate();
            }
            
            showToast('💾 บันทึกการตั้งค่าสำเร็จ!', 'success');
            closeSettings();
            
            // ดึงข้อมูลใหม่ด้วยตำแหน่งใหม่
            setTimeout(() => {
                refreshWeatherData();
            }, 500);
        }

        // เรียกใช้เมื่อโหลดหน้าเว็บเสร็จ
        document.addEventListener('DOMContentLoaded', initApp);