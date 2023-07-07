const router = require('koa-router')();
const sharp = require('sharp');
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
  const { url, path } = ctx.request.body
  const { authorization } = ctx.request.headers
  const base64 = await imgUrlToBase64(url, async (buffer, meta) => {
    const img = sharp(buffer)
    const buf = await (['gif', 'raw', 'tile'].includes(meta.format)
    ? img.toBuffer()
      : img[meta.format]({ quality: path.match('mini') ? 10 : 80 }).toBuffer());
    return buf
  })
  const realPath = `${path}/${'pic' + Date.now() + String(Math.random()).slice(4, 7) + '.' + base64.metadata.format}`
  const { data } = await req.put(`https://api.github.com/repos/${gUser}/photo/contents/${realPath}`, {
    content: base64.data,
    message: `create ${realPath.split('/')[0]} img`
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

router.post('/queryPicList', async (ctx) => {
  const { path } = ctx.request.body
  console.log(path)
  const { authorization } = ctx.request.headers
  const { data } = await req.get(`https://api.github.com/repos/${gUser}/photo/contents/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
  })
  ctx.body = {
    code: 0,
    data: data.reverse().map(f => ({
      ...f,
      name: f.name.replaceAll('_', '-'),
      cdn_url: f.download_url?.replace(
        'https://raw.githubusercontent.com/mirrows/photo/main',
        'https://p.t-n.top/'
      )
    })),
  }
})

module.exports = router;