require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// CWA API 設定
const CWA_API_BASE_URL = 'https://opendata.cwa.gov.tw/api';
const CWA_API_KEY = process.env.CWA_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 取得指定城市的天氣預報
 * city 由 URL 動態帶入
 */
const getWeatherByCity = async (req, res) => {
  try {
    const city = req.params.city;

    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: '伺服器設定錯誤',
        message: '請在 .env 設定 CWA_API_KEY',
      });
    }

    // 呼叫 CWA API - 一般天氣預報（今明 36 小時）
    const response = await axios.get(`${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`, {
      params: {
        Authorization: CWA_API_KEY,
        locationName: city,
      },
    });

    const locationData = response.data.records.location[0];

    if (!locationData) {
      return res.status(404).json({
        success: false,
        error: `查無城市資料：${city}`,
      });
    }

    // 整理資料
    const weatherData = {
      city: locationData.locationName,
      forecasts: [],
    };

    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const timeBlock = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: '',
        rain: '',
        minTemp: '',
        maxTemp: '',
      };

      weatherElements.forEach((el) => {
        const val = el.time[i].parameter?.parameterName;

        switch (el.elementName) {
          case 'Wx':
            timeBlock.weather = val;
            break;
          case 'PoP':
            timeBlock.rain = val + '%';
            break;
          case 'MinT':
            timeBlock.minTemp = val + '°C';
            break;
          case 'MaxT':
            timeBlock.maxTemp = val + '°C';
            break;
        }
      });

      weatherData.forecasts.push(timeBlock);
    }

    return res.json({
      success: true,
      data: weatherData,
    });
  } catch (err) {
    console.error('取得天氣資料失敗:', err.message);
    res.status(500).json({
      success: false,
      error: '伺服器錯誤或 API 連線異常',
      details: err.message,
    });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({
    service: '豆子星際氣象中心 API',
    example: '/api/weather/臺北市',
    example2: '/api/weather/新北市',
    example3: '/api/weather/高雄市',
  });
});

// ⭐ 多城市 API（你要加入什麼城市都可以）
app.get('/api/weather/:city', getWeatherByCity);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 伺服器啟動成功`);
});
// console.log(`🌐 監聽中: http://localhost:${PORT}`);
