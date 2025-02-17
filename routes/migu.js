const { curCache } = require('../utils/cache');
const { req } = require('../utils/req');

const router = require('koa-router')(); //引入并实例化
// 
const typeMap = {
  song: 2,
  singer: 1,
  album: 4,
  playlist: 6,
  mv: 5,
  lyric: 7,
};

const options = {
  headers: {
    referer: 'http://m.music.migu.cn/v3',
    'Content-Type': 'application/json',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  withCredentials: true,
}

router.get('/', ctx => {
  ctx.body = 'Hello World';
})

router.get('/newsong', async ctx => {
  const { page = 1, pagesize = 30 } = ctx.request.query
  const cacheKey = `migu_newsong_${page}_${pagesize}`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  const { status, data: { result: data } } = await req.get('http://m.music.migu.cn/migu/remoting/cms_list_tag', {
    ...options,
    params: {
      pageNo: page - 1,
      pageSize: pagesize,
      nid: 11248351
    },
  })
  if (status === 200) {
    const body = {
      code: 0,
      // data,
      data: data?.results?.filter(e => e.songData?.listenUrl).map(e => e.songData) || []
    }
    curCache.set(cacheKey, body, 60 * 12);
    ctx.body = body;
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

router.get('/search', async ctx => {
  const { keyword, page = 1, pagesize = 30, type = 'song' } = ctx.request.query
  const cacheKey = `migu_search_${keyword}_${page}_${pagesize}_${type}`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  const { status, data } = await req.get('https://m.music.migu.cn/migu/remoting/scr_search_tag', {
    ...options,
    params: {
      keyword,
      pgc: page,
      rows: pagesize,
      type: typeMap[type]
    },
  })
  if (status === 200) {
    const body = {
      code: 0,
      data: data?.musics?.filter(e => e.mp3) || []
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
//   // const { status, data } = await req.get('https://music.migu.cn/v3/api/music/audioPlayer/songs', {
//   //   ...options,
//   //   params: {
//   //     type: 1,
//   //     copyrightId: cid,
//   //   },
//   // })
//   if (status === 200) {
//     // let data = {};
//     // const typeMap = {
//     //   PQ: '128',
//     //   HQ: '320',
//     //   SQ: 'flac',
//     // };
//     // (item.newRateFormats || item.rateFormats || []).forEach(({ formatType, androidUrl, url = androidUrl }) => {
//     //   if (typeMap[formatType]) {
//     //     data[typeMap[formatType]] = url.replace(/ftp:\/\/[^/]+/, 'https://freetyst.nf.migu.cn');
//     //   }
//     // })
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

