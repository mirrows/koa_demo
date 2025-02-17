const { req } = require('../utils/req');
const { gUser, githubToken } = require("../utils/config");
const { Format, wait } = require('../utils/common');
const { imgUrlToBase64 } = require('../utils/imgTool');
const cron = require('node-cron')

const router = require('koa-router')(); //引入并实例化

router.get('/bing', async ctx => {
  const { time, url, name = 'bing.jpg' } = ctx.request.query
  let todayBingUrl = url
  if (!time) {
    const { status, data } = await req.get('https://bing.com/HPImageArchive.aspx', {
      params: {
        format: 'js',
        n: 1,
        mkt: 'zh-CN',
      },
    })
    if (status !== 200) {
      ctx.status = 500
      return ctx.body = {
        code: 500,
        msg: '请求失败'
      }
    }
    todayBingUrl = `https://bing.com${data.images[0].url}`
    bingTime = `${enddate.slice(0, 4)}_${enddate.slice(4, 6)}_${enddate.slice(6)}`
    // const binPicData = {
    //   ...data.images[0],
    //   url: `https://bing.com${data.images[0].url}`
    // }
  } else if (!url) {
    return ctx.body = {
      code: 403,
      msg: '请设置图片链接: url'
    }
  }

  const base64 = await imgUrlToBase64(todayBingUrl)
  const mode = 'photo'
  const realPath = `normal/${bingTime ? bingTime : Format(time ? new Date(time) : new Date(), 'YYYY_MM_DD')}/${name}`
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
})

// const task = cron.schedule('20 * * * * *', () => {
const task = cron.schedule('0 0 0 * * *', () => {
  queryBingImage()
}, {
  timezone: 'Asia/Shanghai'
})

task.start()

router.get('/corn_bing', async ctx => {
  await queryBingImage()
  ctx.body = {
    code: 0,
  }
})

async function getBingMsg(n = 1) {
  let res = {};
  try {
    res = await req.get('https://bing.com/HPImageArchive.aspx', {
      params: {
        format: 'js', n: 1, mkt: 'zh-CN',
      },
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36"
      },
    })
  } catch (err) {
    console.log('请求图片失败', err.code);
    if (n < 3) {
      await wait(1000);
      res = await getBingMsg(n+1);
    }
  }
  console.log(res.data);

  return res;
}

async function queryBingImage() {
  console.log('请求bing图片啦', new Date().toString())
  const { status, data } = await getBingMsg();
  if (status !== 200) {
    console.log('图片请求失败')
    return
    // ctx.status = 500
    // return ctx.body = {
    //   code: 500,
    //   msg: '图片请求失败'
    // }
  }
  const { status: addStatus, data: addData } = await req.post(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/1/comments`, {
    body: JSON.stringify(data?.images?.[0] || []),
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: githubToken,
    },
  }).catch(err => {
    console.log(err.name)
  })

  if (addStatus >= 400) {
    console.log('图片添加失败')
    return
    // ctx.status = 500
    // return ctx.body = {
    //   code: 500,
    //   msg: '图片添加失败'
    // }
  }
  console.log('图片添加成功')
  // ctx.body = {
  //   code: 0,
  //   data: addData,
  // }
}


module.exports = router;