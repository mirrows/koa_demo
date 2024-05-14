const { req } = require('../utils/req');
const { gUser, githubToken } = require("../utils/config");
const { Format } = require('../utils/common');
const { imgUrlToBase64 } = require('../utils/imgTool');

const router = require('koa-router')(); //引入并实例化

router.get('/bing', async ctx => {
  const { status, data } = await req.get('https://bing.com/HPImageArchive.aspx', {
    params: { format: 'js', n: 1 },
  })
  if (status !== 200) {
    ctx.status = 500
    return ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  } else {
    const binPicData = {
      ...data.images[0],
      url: `https://bing.com${data.images[0].url}`
    }
    const base64 = await imgUrlToBase64(binPicData.url)
    const mode = 'photo'
    const realPath = `normal/${Format(new Date(), 'YYYY_MM_DD')}/bing.jpg`
    // https://wsrv.nl/?url=raw.githubusercontent.com/mirrows/photo/main/normal/2024_05_09/pic1715235436149104.png&w=300&fit=cover&n=-1&q=80
    const res = await req.put(`https://api.github.com/repos/${gUser}/${mode}/contents/${realPath}`, {
      content: base64.data,
      message: `create ${realPath} img`
    }, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: githubToken,
      },
    }).catch(err => {
      console.log(err.response.data)
      return err.response?.data || err
    })
    if (res?.data) {
      const f = res.data.content
      ctx.body = {
        code: 0,
        data: f,
      }
    } else {
      ctx.status = 403
      // console.log(res)
      ctx.body = {
        code: 403,
        msg: '请求出错，请联系管理员',
        err: res,
      }
    }
  }
})


module.exports = router;