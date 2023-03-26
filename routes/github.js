const { default: axios } = require('axios');
const { githubClientID, githubSecret } = require('../utils/config');
const https = require("https");
const router = require('koa-router')(); //引入并实例化

router.post('/token', async (ctx, next) => {
  const { code } = JSON.parse(ctx.request.body)
  console.log(code, ctx.request.body)
  if (!code) {
    ctx.status = 403
    return ctx.body = {
      code: 403,
      msg: '请输入code'
    }
  }
  console.log(githubClientID, githubSecret)
  try {
    // 在 axios 请求时，选择性忽略 SSL
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    const { status, data } = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: githubClientID,
      client_secret: githubSecret,
      code,
    }, { headers: { Accept: "application/vnd.github+json" }, httpsAgent: agent }
    )
    console.log(status, data)
    if (status === 200) {
      ctx.body = data
    } else {
      ctx.status = 500
      ctx.body = {
        code: 500,
        msg: '请求失败,请稍后再试',
        data,
      }
    }
  } catch (err) {
    ctx.body = {
      code: 500,
      msg: err
    }
  }
})

module.exports = router;

