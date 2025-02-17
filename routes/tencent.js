const crypto = require("crypto")
const router = require('koa-router')(); //引入并实例化
const { req } = require('../utils/req');
const { tencentId, tencentKey } = require("../utils/config");

function sha256(message, secret = "", encoding) {
  const hmac = crypto.createHmac("sha256", secret)
  return hmac.update(message).digest(encoding)
}
function getHash(message, encoding = "hex") {
  const hash = crypto.createHash("sha256")
  return hash.update(message).digest(encoding)
}
// 获取当前时间戳在0时区的日期字符串
function getDate(timestamp) {
  // 当前时间相对零时区的偏移
  // const date = new Date((timestamp + new Date().getTimezoneOffset() * 60) * 1000)
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = ("0" + (date.getMonth() + 1)).slice(-2)
  const day = ("0" + date.getDate()).slice(-2)
  return `${year}-${month}-${day}`
}

const SECRET_ID = tencentId
const SECRET_KEY = tencentKey
const TOKEN = ""

const host = "tmt.ap-guangzhou.tencentcloudapi.com"
const service = "tmt"
const region = "ap-guangzhou"
const action = "TextTranslate"
const version = "2018-03-21"
let timestamp = parseInt(String(new Date().getTime() / 1000))
let date = getDate(timestamp)
// const payload = "{\"SourceText\":\"早上好\",\"Source\":\"zh\",\"Target\":\"en\",\"ProjectId\":0}"

function beforeReq(queryString) {
  // ************* 步骤 1：拼接规范请求串 *************
  const signedHeaders = "content-type;host"
  const hashedRequestPayload = getHash(queryString)
  const httpRequestMethod = "POST"
  const canonicalUri = "/"
  const canonicalQueryString = ""
  const canonicalHeaders =
    "content-type:application/json; charset=utf-8\n" + "host:" + host + "\n"

  const canonicalRequest =
    httpRequestMethod +
    "\n" +
    canonicalUri +
    "\n" +
    canonicalQueryString +
    "\n" +
    canonicalHeaders +
    "\n" +
    signedHeaders +
    "\n" +
    hashedRequestPayload

  // ************* 步骤 2：拼接待签名字符串 *************
  const algorithm = "TC3-HMAC-SHA256"
  const hashedCanonicalRequest = getHash(canonicalRequest)
  const credentialScope = date + "/" + service + "/" + "tc3_request"
  const stringToSign =
    algorithm +
    "\n" +
    timestamp +
    "\n" +
    credentialScope +
    "\n" +
    hashedCanonicalRequest

  // ************* 步骤 3：计算签名 *************
  const kDate = sha256(date, "TC3" + SECRET_KEY)
  const kService = sha256(service, kDate)
  const kSigning = sha256("tc3_request", kService)
  const signature = sha256(stringToSign, kSigning, "hex")

  // ************* 步骤 4：拼接 Authorization *************
  const authorization =
    algorithm +
    " " +
    "Credential=" +
    SECRET_ID +
    "/" +
    credentialScope +
    ", " +
    "SignedHeaders=" +
    signedHeaders +
    ", " +
    "Signature=" +
    signature

  // ************* 步骤 5：构造并发起请求 *************
  const headers = {
    Authorization: authorization,
    "Content-Type": "application/json; charset=utf-8",
    Host: host,
    "X-TC-Action": action,
    "X-TC-Timestamp": timestamp,
    "X-TC-Version": version,
  }

  if (region) {
    headers["X-TC-Region"] = region
  }
  if (TOKEN) {
    headers["X-TC-Token"] = TOKEN
  }
  return headers
}

router.post('/translation', async (ctx) => {
  const { SourceText, Source, Target } = ctx.request.body
  const query = {
    SourceText, Source, Target, ProjectId: 0,
  };
  timestamp = parseInt(String(new Date().getTime() / 1000))
  date = getDate(timestamp)
  const headers = beforeReq(JSON.stringify(query));
  // https://tmt.ap-guangzhou.tencentcloudapi.com/
  // https://tmt.eu-frankfurt.tencentcloudapi.com/
  const { data } = await req.post('https://tmt.ap-guangzhou.tencentcloudapi.com/', query, {
    headers,
  })
  ctx.body = {
    code: 0,
    data,
    date,
    timestamp,
  }
})


module.exports = router;

