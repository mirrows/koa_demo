const router = require('koa-router')();
const sharp = require('sharp');
const { githubToken, gUser, cdnMap } = require("../utils/config");
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
  const { content, path, mode } = ctx.request.body
  const { authorization, timestamp } = ctx.request.headers
  if (!timestamp || Date.now() - timestamp > 5000) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '非法请求'
    }
    return
  }
  let realContent = ''
  if(path.match('mini') && content.length > 1024 * 1024) {
    let buffer = Buffer.from(content, 'utf-8')
    const img = sharp(buffer)
    const buf = await (['gif', 'raw', 'tile'].includes(meta.format)
    ? img.toBuffer()
      : img[meta.format]({ quality: path.match('mini') ? 30 : 80 }).toBuffer());
    realContent = buf.toString('base64')
  } else {
    realContent = content
  }
  const res = await req.put(`https://api.github.com/repos/${gUser}/${mode}/contents/${path}`, {
    content: realContent,
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
    const f = res.data.content
    ctx.body = {
      code: 0,
      data: {
        ...f,
        cdn_url: f.download_url?.replace(
          `https://raw.githubusercontent.com/${gUser}/${mode}/main`,
          cdnMap[mode]
        ),
      },
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
  const { url, path, mode } = ctx.request.body
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
  const realPath = `${path}.${base64.metadata.format}`
  const res = await req.put(`https://api.github.com/repos/${gUser}/${mode}/contents/${realPath}`, {
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
    const f = res.data.content
    ctx.body = {
      code: 0,
      data: {
        ...f,
        cdn_url: f.download_url?.replace(
          `https://raw.githubusercontent.com/${gUser}/${mode}/main`,
          cdnMap[mode]
        ),
      },
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
  const { path, mode } = ctx.request.body
  const { authorization } = ctx.request.headers
  let error = ''
  const res = await req.get(`https://api.github.com/repos/${gUser}/${mode}/contents/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
  }).catch(err => {
    error += err
  })
  ctx.body = {
    code: error ? 500 : 0,
    ...(error ? {error} : {data: res?.data.reverse().map(f => ({
      ...f,
      name: f.name.replaceAll('_', '-'),
      cdn_url: f.download_url?.replace(
        `https://raw.githubusercontent.com/${gUser}/${mode}/main`,
        cdnMap[mode]
      ),
      ...(path.match('mini') ? {
        normal_url: f.download_url?.replace(
          `https://raw.githubusercontent.com/${gUser}/${mode}/main`,
          cdnMap[mode]
        ).replace('mini', 'normal')
      } : {})
    }))}),
  }
})

router.post('/deletePic', async (ctx) => {
  // const { content, path } = JSON.parse(ctx.request.body)
  const { sha, path, mode } = ctx.request.body
  const { authorization, timestamp } = ctx.request.headers
  if (!timestamp || Date.now() - timestamp > 5000) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '非法请求'
    }
    return
  }
  let error = ''
  await req.delete(`https://api.github.com/repos/${gUser}/${mode}/contents/${path.replace('mini', 'normal')}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken || authorization,
    },
    params: {
      sha,
      message: `create ${path.split('/')[0]} img`
    },
  }).catch(err => {
    console.log(err)
    error += String(err)
  })
  const res = await req.delete(`https://api.github.com/repos/${gUser}/${mode}/contents/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken || authorization,
    },
    params: {
      sha,
      message: `create ${path.split('/')[0]} img`
    },
  }).catch(err => {
    console.log(err)
    error += String(err)
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
      msg: '请求出错，请联系管理员',
      error,
    }
  }
})

module.exports = router;