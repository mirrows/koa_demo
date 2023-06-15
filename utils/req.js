const { default: axios } = require("axios");
const https = require("https");

const agent = new https.Agent({
  rejectUnauthorized: false
});
// 创建实例时配置默认值
exports.req = axios.create({
  httpsAgent: agent
});
