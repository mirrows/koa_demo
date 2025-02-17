const { curCache } = require('../utils/cache');
const { req } = require('../utils/req');

const router = require('koa-router')(); //引入并实例化

router.get('/', ctx => {
  ctx.body = 'Hello World';
})

router.get('/newsong', async ctx => {
  // const { n = 1 } = ctx.request.query
  const cacheKey = `kugou_newsong`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  const data = await Promise.allSettled([...Array(4)].map((_, i) => req.get(`https://m.kugou.com/newsong/index/${i+1}?json=true`, {
    params: { json: true },
    headers:  {
      'Referer': 'https://m.kugou.com/',
    },
  })))
  const list = data.filter(songs => songs.status === 'fulfilled').map(songs => songs.value.data?.newSongList?.filter(e => e.trans_param?.musicpack_advance !== 1) || [])
  // const { status, data: { newSongList } } = await req.get(`https://m.kugou.com/newsong/index/${n}?json=true`, { params: { json: true } })
  const body = {
    code: 0,
    data: list,
  }
  curCache.set(cacheKey, body, 60 * 12);
  ctx.body = body;
})

router.get('/search', async ctx => {
  const { keyword, page = 1, pagesize = 30 } = ctx.request.query
  const cacheKey = `kugou_search_${keyword}_${page}_${pagesize}`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  const { status, data: { data } } = await req.get('http://mobilecdn.kugou.com/api/v3/search/song', {
    params: {
      format: 'json',
      keyword,
      page,
      pagesize,
    },
  })
  if (status === 200) {
    const body = {
      code: 0,
      data: data?.info?.filter(e => e.trans_param?.musicpack_advance !== 1) || []
    }
    curCache.set(cacheKey, body, 120);
    ctx.body = body;
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

router.get('/song', async ctx => {
  const { id: hash } = ctx.request.query
  const { status, data } = await req.get('http://m.kugou.com/app/i/getSongInfo.php', {
    params: {
      cmd: 'playInfo',
      hash,
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
      msg: '请求失败'
    }
  }
})

router.get('/rank', async ctx => {
  const { status, data: { rank } } = await req.get('http://m.kugou.com/rank/list&json=true')
  if (status === 200) {
    ctx.body = {
      code: 0,
      total: rank?.total || 0,
      data: rank?.list.map(r => ({
        rankid: r.rankid,
        rankname: r.rankname,
        imgurl: r.imgurl.replace('{size}', '240'),
        intro: r.intro,
      })) || [],
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

router.get('/rank/list', async ctx => {
  const { rankid, page = 1 } = ctx.request.query
  const { status, data } = await req.get('http://m.kugou.com/rank/info', {
    params: {
      json: true,
      rankid,
      page,
    },
  })
  if (status === 200) {
    ctx.body = {
      code: 0,
      total: data?.songs?.total || 0,
      data: data?.songs?.list?.filter(e => e.trans_param?.musicpack_advance !== 1) || [],
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

router.get('/plist', async ctx => {
  const { page = 1 } = ctx.request.query
  const { status, data: { plist } } = await req.get('http://m.kugou.com/plist/index', {
    params: {
      json: true,
      page,
    },
  })
  if (status === 200) {
    ctx.body = {
      code: 0,
      total: plist?.list?.total || 0,
      data: plist?.list?.info.map(r => ({
        specialid: r.specialid,
        specialname: r.specialname,
        imgurl: r.imgurl.replace('{size}', '240'),
        intro: r.intro,
        play_count_text: r.play_count_text,
        songcount: r.songcount,
        encode_id: r.encode_id,
      })) || [],
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

router.get('/plist/list', async ctx => {
  const { specialid } = ctx.request.query
  const { status, data } = await req.get(`http://m.kugou.com/plist/list/${specialid}`, {
    params: { json: true },
    headers: {
      'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
    }
  })
  if (status === 200) {
    ctx.body = {
      code: 0,
      total: data?.list?.list?.total || 0,
      data: data?.list?.list?.info?.filter(e => e.trans_param?.musicpack_advance !== 1) || [],
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})



module.exports = router;

