const { default: axios } = require("axios");
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false
});

const req = axios.create({
  httpsAgent: agent
});

req.interceptors.request.use(config => {
  return config;
}, err => {
  console.log('req error:', err);
});

// 创建实例时配置默认值
exports.req = req;
