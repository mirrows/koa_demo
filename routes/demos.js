const router = require('koa-router')();
const sharp = require('sharp');
const { githubToken, gUser, cdnMap } = require("../utils/config");
const { imgUrlToBase64 } = require('../utils/imgTool');
const { req } = require("../utils/req")
const illegalTime = 1000 * 60 * 3

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
  const current = Date.now()
  if (!timestamp || current - timestamp > illegalTime) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: `请求时间过长，it starts at ${new Date(timestamp).toLocaleString()} but now is ${new Date(current).toLocaleString()},`
    }
    return
  }
  const res = await req.put(`https://api.github.com/repos/${gUser}/${mode}/contents/${path}`, {
    content: content,
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
      },
    }
  } else {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '请求出错，请联系管理员',
      err: res,
    }
  }
})

router.put('/uploadUrl', async (ctx) => {
  const { url, path, mode } = ctx.request.body
  const { authorization, timestamp } = ctx.request.headers
  const current = Date.now()
  if (!timestamp || current - timestamp > illegalTime) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: `请求时间过长，it starts at ${new Date(timestamp).toLocaleString()} but now is ${new Date(current).toLocaleString()},`
    }
    return
  }
  const base64 = await imgUrlToBase64(url, async (buffer, meta) => {
    const img = sharp(buffer)
    const format = (meta?.format || path.split('.')[1] || 'jpeg').replace('jpg', 'jpeg')
    const buf = await (['gif', 'raw', 'tile', 'webp'].includes(format)
      ? img.toBuffer()
      : img[format]({ quality: path.match('mini') ? 30 : 80 }).toBuffer());
    return buf
  })
  const isPrivateName = path.split('.').length > 1
  const realPath = `${path}${isPrivateName ? '' : `.${base64.metadata.format}`}`
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
      },
    }
  } else {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '请求出错，请联系管理员',
      err: res,

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
    code: 0,
    ...(error ? { error, data: [] } : {
      data: (Array.isArray(res?.data) ? res?.data : []).reverse().map(f => ({
        ...f,
        name: f.name.replaceAll('_', '-'),
        ...(path.match('mini') ? {
          normal_url: f.download_url?.replace(
            `https://raw.githubusercontent.com/${gUser}/${mode}/main`,
            cdnMap[mode]
          ).replace('mini', 'normal')
        } : {})
      }))
    }),
  }
})


router.post('/queryPic', async (ctx) => {
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
    code: 0,
    ...(error || !res?.data ?
      {
        error, data: []
      } : {
        data: ({
          ...(res.data || {}),
        })
      }),
  }
})

router.post('/deletePic', async (ctx) => {
  // const { content, path } = JSON.parse(ctx.request.body)
  const { sha, path, mode } = ctx.request.body
  const { authorization, timestamp } = ctx.request.headers
  if (!timestamp || Date.now() - timestamp > illegalTime) {
    ctx.status = 403
    ctx.body = {
      code: 403,
      msg: '非法请求'
    }
    return
  }
  let error = ''
  await req.delete(`https://api.github.com/repos/${gUser}/${mode}/contents/${path.replace('normal', 'mini')}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken || authorization,
    },
    params: {
      sha,
      message: `delete ${path.split('/')[0]} img`
    },
  }).catch(err => {
    console.log(err)
    error += `mini: ${String(err)}, `
  })
  const res = await req.delete(`https://api.github.com/repos/${gUser}/${mode}/contents/${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken || authorization,
    },
    params: {
      sha,
      message: `delete ${path.split('/')[0]} img`
    },
  }).catch(err => {
    console.log(err)
    error += `normal: ${String(err)}`
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