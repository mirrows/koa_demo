const { cibaKey } = require('../utils/config');
const { req } = require('../utils/req');

const router = require('koa-router')(); //引入并实例化

router.get('/sentence', async ctx => {
  const now = new Date().toLocaleDateString().split('/').map(str => str.padStart(2, 0)).join('-')
  const { time = now } = ctx.request.query
  const { status, data } = await req.get('https://sentence.iciba.com/index.php', {
    params: {
      c: 'dailysentence',
      m: 'getdetail',
      title: time,
    },
  })
  if (status === 200 && data.title) {
    ctx.body = {
      code: 0,
      data: {
        cn: data.note,
        en: data.content,
        pic: [data.picture, data.picture2, data.picture3],
        audio: data.tts,
        time: data.title,
      },
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败, 请检查时间格式: YYYY-MM-DD'
    }
  }
})

router.get('/translation', async ctx => {
  const { w } = ctx.request.query
  if (!w) {
    ctx.status = 500
    return ctx.body = {
      code: 500,
      msg: '文本为空,请输入翻译文本'
    }
  }
  const { status, data } = await req.get('http://dict-co.iciba.com/api/dictionary.php', {
    params: {
      w: w,
      key: cibaKey,
      type: 'json',
    },
  })
  if (status === 200) {
    ctx.body = {
      code: 0,
      data,
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败,请稍后再试'
    }
  }
})

module.exports = router;