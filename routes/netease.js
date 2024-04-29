const { curCache } = require('../utils/cache');
const { req } = require('../utils/req');
const encrypt = require('../utils/crypto')
const crypto = require('crypto')
const http = require('http')
const https = require('https')

const router = require('koa-router')(); //引入并实例化
// 
const typeMap = {
  song: 1,
  singer: 100,
  album: 10,
  playlist: 1000,
  mv: 1004,
  lyric: 1006,
};
// 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频

const langMap = {
  0: 'all',
  7: 'cn',
  96: 'au',
  8: 'jp',
  16: 'ko',
};

const getCookie = () => {
  const org = {
    __remember_me: true,
    NMTID: crypto.randomBytes(16).toString('hex'),
    _ntes_nuid: crypto.randomBytes(16).toString('hex'),
    MUSIC_A: "bf8bfeabb1aa84f9c8c3906c04a04fb864322804c83f5d607e91a04eae463c9436bd1a17ec353cf780b396507a3f7464e8a60f4bbc019437993166e004087dd32d1490298caf655c2353e58daa0bc13cc7d5c198250968580b12c1b8817e3f5c807e650dd04abd3fb8130b7ae43fcc5b",
  }
  return Object.keys(org)
  .map(
    (key) =>
      encodeURIComponent(key) +
      '=' +
      encodeURIComponent(org[key]),
  )
  .join('; ')
}


const options = {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Referer': 'https://music.163.com',
    'Cookie': '__remember_me=true; NMTID=xxx',
  },
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
}

router.get('/', ctx => {
  ctx.body = 'Hello World';
})

router.get('/newsong', async ctx => {
  const { all = false, page = 1, pagesize = (all ? 100 : 30) } = ctx.request.query
  const cacheKey = `netease_newsong_${page}_${pagesize}_${all}`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  const { 0 : allType , ...otherType } = langMap
  const data = await Promise.allSettled((all ? [0] : Object.keys(otherType)).map((type) => req.post(`https://music.163.com/weapi/v1/discovery/new/songs`, new URLSearchParams(encrypt.weapi({
    areaId: type, // 全部:0 华语:7 欧美:96 日本:8 韩国:16
    // limit: pagesize,
    // offset: (page - 1) * pagesize,
    // ...(all ? { total: true } : {}),
  })).toString(), options)))
  const list = data.filter(songs => songs.status === 'fulfilled').map(songs => songs.value.data?.data?.filter(song => song.fee !== 1).map(song => ({ ...song, url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3` })) || [])
  const body = {
    code: 0,
    data: list,
  }
  curCache.set(cacheKey, body, 60 * 12);
  ctx.body = body;
})

router.get('/cookie', (ctx) => {
  ctx.body = getCookie();
})

router.get('/encode', (ctx) => {
  const { keyword, page = 1, pagesize = 30, type = 'song' } = ctx.request.query
  ctx.body = encrypt.weapi({
    s: keyword,
    type: typeMap[type], // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
    limit: pagesize,
    offset: (page - 1) * pagesize,
  });
})

router.get('/search', async ctx => {
  const { keyword, page = 1, pagesize = 30, type = 'song' } = ctx.request.query
  const cacheKey = `netease_search_${keyword}_${page}_${pagesize}_${type}`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  let ip = ctx.request.ip;
  if (ip.substr(0, 7) == '::ffff:') {
    ip = ip.substr(7)
  }
  const { status, data: { result: data } } = await req.post('https://music.163.com/weapi/search/get', new URLSearchParams(encrypt.weapi({
    s: keyword,
    type: typeMap[type], // 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频
    limit: pagesize,
    offset: (page - 1) * pagesize,
  })).toString(), {
    ...options,
    headers: {
      ...options.headers,
      'X-Real-IP': ip,
      'X-Forwarded-For': ip,
      Cookie: getCookie(),
    }
  })
  if (status === 200) {
    const body = {
      code: 0,
      data: data?.songs?.filter(song => song.fee !== 1).map(song => ({ ...song, url: `https://music.163.com/song/media/outer/url?id=${song.id}.mp3` })) || [],
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

// router.get('/song', async ctx => {
//   const { id: cid } = ctx.request.query
//   const { status, data: { resource: [item] } } = await req.get('https://c.musicapp.migu.cn/MIGUM2.0/v1.0/content/resourceinfo.do', {
//     ...options,
//     params: {
//       resourceType: 2,
//       copyrightId: cid,
//     },
//   })
//   if (status === 200) {
//     ctx.body = {
//       code: 0,
//       data: item,
//     }
//   } else {
//     ctx.status = 500
//     ctx.body = {
//       code: 500,
//       msg: '请求失败'
//     }
//   }
// })

// router.get('/rank', async ctx => {
//   const { status, data: { rank } } = await req.get('http://m.kugou.com/rank/list&json=true')
//   if (status === 200) {
//     ctx.body = {
//       code: 0,
//       total: rank?.total || 0,
//       data: rank?.list.map(r => ({
//         rankid: r.rankid,
//         rankname: r.rankname,
//         imgurl: r.imgurl.replace('{size}', '240'),
//         intro: r.intro,
//       })) || [],
//     }
//   } else {
//     ctx.status = 500
//     ctx.body = {
//       code: 500,
//       msg: '请求失败'
//     }
//   }
// })

// router.get('/rank/list', async ctx => {
//   const { rankid, page = 1 } = ctx.request.query
//   const { status, data } = await req.get('http://m.kugou.com/rank/info', {
//     params: {
//       json: true,
//       rankid,
//       page,
//     },
//   })
//   if (status === 200) {
//     ctx.body = {
//       code: 0,
//       total: data?.songs?.total || 0,
//       data: data?.songs?.list?.filter(e => e.trans_param?.musicpack_advance !== 1) || [],
//     }
//   } else {
//     ctx.status = 500
//     ctx.body = {
//       code: 500,
//       msg: '请求失败'
//     }
//   }
// })

// router.get('/plist', async ctx => {
//   const { page = 1 } = ctx.request.query
//   const { status, data: { plist } } = await req.get('http://m.kugou.com/plist/index', {
//     params: {
//       json: true,
//       page,
//     },
//   })
//   if (status === 200) {
//     ctx.body = {
//       code: 0,
//       total: plist?.list?.total || 0,
//       data: plist?.list?.info.map(r => ({
//         specialid: r.specialid,
//         specialname: r.specialname,
//         imgurl: r.imgurl.replace('{size}', '240'),
//         intro: r.intro,
//         play_count_text: r.play_count_text,
//         songcount: r.songcount,
//         encode_id: r.encode_id,
//       })) || [],
//     }
//   } else {
//     ctx.status = 500
//     ctx.body = {
//       code: 500,
//       msg: '请求失败'
//     }
//   }
// })

// router.get('/plist/list', async ctx => {
//   const { specialid } = ctx.request.query
//   const { status, data } = await req.get(`http://m.kugou.com/plist/list/${specialid}`, {
//     params: { json: true },
//     headers: {
//       'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
//     }
//   })
//   if (status === 200) {
//     ctx.body = {
//       code: 0,
//       total: data?.list?.list?.total || 0,
//       data: data?.list?.list?.info?.filter(e => e.trans_param?.musicpack_advance !== 1) || [],
//     }
//   } else {
//     ctx.status = 500
//     ctx.body = {
//       code: 500,
//       msg: '请求失败'
//     }
//   }
// })



module.exports = router;

