const router = require('koa-router')();
const { githubToken, gUser } = require("../utils/config");
const { imgUrlToBase64 } = require('../utils/imgTool');
const { req } = require("../utils/req")

router.get('/', async (ctx) => {
  ctx.body = {
    code: 0,
    msg: 'success',
  }
})

router.put('/uploadBase64', async (ctx) => {
  // const { content, path } = JSON.parse(ctx.request.body)
  const { content, path } = ctx.request.body
  const { authorization } = ctx.request.headers
  const { data } = await req.put(`https://api.github.com/repos/${gUser}/photo/contents/${path}`, {
    content,
    message: `create ${path.split('/')[0]} img`
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
  }).catch(err => {
    console.log(err)
  })
  ctx.body = {
    code: 0,
    data,
  }
})

router.put('/uploadUrl', async (ctx) => {
  // const { content, path } = JSON.parse(ctx.request.body)
  const { url, path } = ctx.request.body
  const { authorization } = ctx.request.headers
  const base64 = await imgUrlToBase64(url)
  console.log(base64.data.slice(0, 60))
  const realPath = `${path}/${'pic' + Date.now() + String(Math.random()).slice(4, 7) + '.' + base64.metadata.format}`
  await req.put(`https://api.github.com/repos/${gUser}/photo/contents/mini/${realPath}`, {
    content: base64.data,
    message: `create mini img`
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
  }).catch(err => {
    console.log(err)
  })
  const { data } = await req.put(`https://api.github.com/repos/${gUser}/photo/contents/normal/${realPath}`, {
    content: base64.data,
    message: `create normal img`
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
  }).catch(err => {
    console.log(err)
  })
  ctx.body = {
    code: 0,
    data,
  }
})

module.exports = router;