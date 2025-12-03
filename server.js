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

// ⭐ 城市映射表（前端傳英文，後端轉成氣象局正式地名）
const cityMap = {
  taipei: '臺北市',
  newtaipei: '新北市',
  kaohsiung: '高雄市',
  tainan: '臺南市',
};

// ⭐ 主函式：抓指定城市氣象
const getWeatherByCity = async (req, res) => {
  try {
    const cityKey = req.params.city; // "taipei"
    const locationName = cityMap[cityKey]; // "臺北市"

    if (!locationName) {
      return res.status(400).json({
        success: false,
        message: `無效城市：${cityKey}（可用：taipei / newtaipei / kaohsiung）`,
      });
    }

    const response = await axios.get(`${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`, {
      params: {
        Authorization: CWA_API_KEY,
        locationName,
      },
    });

    const loc = response.data.records.location[0];
    if (!loc) {
      return res.status(404).json({
        success: false,
        message: `查無城市資料：${locationName}`,
      });
    }

    const weatherData = {
      city: loc.locationName,
      forecasts: [],
    };

    const elements = loc.weatherElement;
    const count = elements[0].time.length;

    for (let i = 0; i < count; i++) {
      const f = {
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
            f.weather = val;
            break;
          case 'PoP':
            f.rain = val + '%';
            break;
          case 'MinT':
            f.minTemp = val + '°C';
            break;
          case 'MaxT':
            f.maxTemp = val + '°C';
            break;
        }
      });

      weatherData.forecasts.push(f);
    }

    res.json({ success: true, data: weatherData });
  } catch (err) {
    console.error('API錯誤：', err);
    res.status(500).json({
      success: false,
      error: '後端或 CWA 連線問題',
      details: err.message,
    });
  }
};

app.get('/', (req, res) => {
  res.json({
    service: '豆子氣象 API',
    availableCities: Object.keys(cityMap),
    example: '/api/weather/taipei',
  });
});

app.get('/api/weather/:city', getWeatherByCity);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
