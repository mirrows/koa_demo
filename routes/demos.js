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
  const { authorization, timestamp } = ctx.request.headers
  if (!timestamp || Date.now() - timestamp > 5000) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '非法请求'
    }
    return
  }
  const res = await req.put(`https://api.github.com/repos/${gUser}/photo/contents/${path}`, {
    content,
    message: `create ${path.split('/')[0]} img`
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken || authorization,
    },
  }).catch(err => {
    console.log(err)
  })
  if (res?.data) {
    ctx.body = {
      code: 0,
      data: res.data,
    }
  } else {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '请求出错，请联系管理员'
    }
  }
})

router.put('/uploadUrl', async (ctx) => {
  const { url, path } = ctx.request.body
  const { authorization, timestamp } = ctx.request.headers
  if (!timestamp || Date.now() - timestamp > 5000) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '非法请求'
    }
    return
  }
  const base64 = await imgUrlToBase64(url, async (buffer, meta) => {
    const img = sharp(buffer)
    const buf = await (['gif', 'raw', 'tile'].includes(meta.format)
    ? img.toBuffer()
      : img[meta.format]({ quality: path.match('mini') ? 10 : 80 }).toBuffer());
    return buf
  })
  const realPath = `${path}/${'pic' + Date.now() + String(Math.random()).slice(4, 7) + '.' + base64.metadata.format}`
  const res = await req.put(`https://api.github.com/repos/${gUser}/photo/contents/${realPath}`, {
    content: base64.data,
    message: `create ${realPath.split('/')[0]} img`
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken || authorization,
    },
  }).catch(err => {
    console.log(err)
  })
  if (res?.data) {
    ctx.body = {
      code: 0,
      data: res.data,
    }
  } else {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '请求出错，请联系管理员'
    }
  }
})

router.post('/queryPicList', async (ctx) => {
  const { path } = ctx.request.body
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