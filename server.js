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

/* ---------------------------------------------------
   ⭐ 城市映射表：英文 → 中央氣象署 API 中文名稱
--------------------------------------------------- */
const cityMap = {
  taipei: '臺北市',
  newtaipei: '新北市',
  kaohsiung: '高雄市',
};

/* ---------------------------------------------------
   ⭐ 取得天氣（通用）
--------------------------------------------------- */
const getWeatherByCity = async (req, res) => {
  try {
    const cityKey = req.params.city.toLowerCase();
    const cityName = cityMap[cityKey];

    if (!cityName) {
      return res.status(400).json({
        success: false,
        error: `不支援的城市：${cityKey}`,
        supported: Object.keys(cityMap),
      });
    }

    // 呼叫 CWA API — 36 小時天氣預報
    const response = await axios.get(`${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`, {
      params: {
        Authorization: CWA_API_KEY,
        locationName: cityName,
      },
    });

    const locationData = response.data.records.location[0];

    if (!locationData) {
      return res.status(404).json({
        success: false,
        error: `查無 ${cityName} 的天氣資料`,
      });
    }

    /* ---------------------------------------------------
      ⭐ 整理資料 — 只保留 36 小時預報需要的欄位
    --------------------------------------------------- */
    const weatherData = {
      city: locationData.locationName,
      forecasts: [],
    };

    const elements = locationData.weatherElement;
    const count = elements[0].time.length;

    for (let i = 0; i < count; i++) {
      const block = {
        startTime: elements[0].time[i].startTime,
        endTime: elements[0].time[i].endTime,
        weather: '',
        rain: '',
        minTemp: '',
        maxTemp: '',
      };

      elements.forEach((el) => {
        const val = el.time[i].parameter?.parameterName;

        switch (el.elementName) {
          case 'Wx':
            block.weather = val;
            break;
          case 'PoP':
            block.rain = val + '%';
            break;
          case 'MinT':
            block.minTemp = val + '°C';
            break;
          case 'MaxT':
            block.maxTemp = val + '°C';
            break;
        }
      });

      weatherData.forecasts.push(block);
    }

    return res.json({
      success: true,
      data: weatherData,
    });
  } catch (err) {
    console.error('🌩 取得天氣資料失敗:', err.message);

    return res.status(500).json({
      success: false,
      error: '伺服器錯誤或 API 連線異常',
      detail: err.message,
    });
  }
};

/* ---------------------------------------------------
   ⭐ Routes
--------------------------------------------------- */

// 首頁：列出支援城市
app.get('/', (req, res) => {
  res.json({
    service: '豆子星際氣象中心 API',
    cities: Object.keys(cityMap),
    example: '/api/weather/taipei',
  });
});

// ⭐ 動態城市天氣 API
app.get('/api/weather/:city', getWeatherByCity);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '找不到此路徑',
  });
});

/* ---------------------------------------------------
   ⭐ Start Server
--------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 豆子星際氣象中心啟動成功`);
  console.log(`⭐ Port: ${PORT}`);
});
