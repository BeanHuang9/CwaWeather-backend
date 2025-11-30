require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const CWA_API_BASE_URL = 'https://opendata.cwa.gov.tw/api';
const CWA_API_KEY = process.env.CWA_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ⭐ 城市映射表
const cityMap = {
  taipei: '臺北市',
  newtaipei: '新北市',
  kaohsiung: '高雄市',
};

const getWeatherByCity = async (req, res) => {
  try {
    const cityKey = req.params.city;
    const locationName = cityMap[cityKey];

    if (!locationName) {
      return res.status(400).json({
        success: false,
        message: `無效的城市代碼：${cityKey}（可用：taipei / newtaipei / kaohsiung）`,
      });
    }

    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: '伺服器設定錯誤',
        message: '請在 .env 設定 CWA_API_KEY',
      });
    }

    const response = await axios.get(`${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`, {
      params: {
        Authorization: CWA_API_KEY,
        locationName: locationName,
      },
    });

    const locationData = response.data.records.location[0];

    if (!locationData) {
      return res.status(404).json({
        success: false,
        message: `查無城市資料：${locationName}`,
      });
    }

    const weatherData = {
      city: locationData.locationName,
      forecasts: [],
    };

    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const block = {
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

    res.json({ success: true, data: weatherData });
  } catch (err) {
    console.error('取得天氣資料失敗:', err.message);
    res.status(500).json({
      success: false,
      error: '伺服器錯誤或 API 連線異常',
      details: err.message,
    });
  }
};

app.get('/', (req, res) => {
  res.json({
    service: '豆子星際氣象中心 API',
    cities: Object.keys(cityMap),
    example: '/api/weather/taipei',
  });
});

app.get('/api/weather/:city', getWeatherByCity);

app.listen(PORT, () => {
  console.log(`🚀 伺服器啟動成功，Port: ${PORT}`);
});
