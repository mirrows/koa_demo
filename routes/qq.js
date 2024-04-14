const { curCache } = require('../utils/cache');
const { req } = require('../utils/req');

const router = require('koa-router')(); //引入并实例化
// 
const typeMap = {
  song: 0,
  singer: 9,
  album: 8,
  playlist: 2,
  mv: 12,
  lyric: 7,
};
// 1: 单曲, 10: 专辑, 100: 歌手, 1000: 歌单, 1002: 用户, 1004: MV, 1006: 歌词, 1009: 电台, 1014: 视频

const langMap = {
  'all': 5,
  'cn': 1,
  'hk': 6,
  'au': 2,
  'jp': 3,
  'ko': 4,
};


const options = {
  headers: {
    'Referer': 'https://y.qq.com/portal/player.html',
  },
  xsrfCookieName: 'XSRF-TOKEN',
  withCredentials: true,
}

router.get('/', ctx => {
  ctx.body = 'Hello World';
})

router.get('/newsong', async ctx => {
  const { all = false } = ctx.request.query
  const cacheKey = `qq_newsong_${all}`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  const { all: allType, ...otherType } = langMap
  const data = await Promise.allSettled((all ? ['all'] : Object.keys(otherType)).map((type) => req.get(`https://u.y.qq.com/cgi-bin/musicu.fcg`, {
    ...options,
    params: {
      data: JSON.stringify({
        comm: {
          ct: 24,
        },
        new_song: {
          module: 'newsong.NewSongServer',
          method: 'get_new_song_info',
          param: {
            type: langMap[type],
          },
        },
      }),
    },
  })))
  // const list = data.filter(songs => songs.status === 'fulfilled').map(songs => songs || [])
  const list = data.filter(songs => songs.status === 'fulfilled').map(songs => songs?.value?.data?.new_song?.data?.songlist || [])
  const body = {
    code: 0,
    data: list,
  }
  curCache.set(cacheKey, body, 60 * 12);
  ctx.body = body;
})

router.get('/search', async ctx => {
  const { keyword, page = 1, pagesize = 30, type = 'song' } = ctx.request.query
  const cacheKey = `qq_search_${keyword}_${page}_${pagesize}_${type}`;
  const cacheData = curCache.get(cacheKey);
  if (cacheData) {
    return ctx.body = cacheData;
  }
  const { status, data: { data } } = await req.get(type === 'playlist' ? 'https://c.y.qq.com/soso/fcgi-bin/client_music_search_songlist' : 'http://c.y.qq.com/soso/fcgi-bin/client_search_cp', {
    ...options,
    params: type === 'playlist' ? {
      format: 'json',
      remoteplace: 'txt.yqq.playlist',
      query: keyword,
      page_no: page - 1,
      num_per_page: pagesize,
    } : {
      format: 'json',
      n: pagesize,
      p: page,
      w: keyword,
      t: typeMap[type],
    }
  })
  if (status === 200) {
    const body = {
      code: 0,
      data: (type === 'playlist' ? data : data?.song)?.list?.filter(song => song?.pay?.payplay !== 1) || [],
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

const quarityMap = {
  m4a: {
    s: 'C400',
    e: '.m4a',
  },
  128: {
    s: 'M500',
    e: '.mp3',
  },
  320: {
    s: 'M800',
    e: '.mp3',
  },
  ape: {
    s: 'A000',
    e: '.ape',
  },
  flac: {
    s: 'F000',
    e: '.flac',
  },
};

router.get('/song', async ctx => {
  const { id, mediaId = id, type = '128' } = ctx.request.query
  let { uin, qqmusic_key } = { uin: '0' };

  const typeObj = quarityMap[type];
  const file = `${typeObj.s}${id}${mediaId}${typeObj.e}`;
  const guid = (Math.random() * 10000000).toFixed(0);
  let ip = ctx.request.ip;
  // console.log(ip);
  if (ip.substr(0, 7) == '::ffff:') {
    ip = ip.substr(7)
  }
  if (ip.match('::1')) { 
    ip = '127.0.0.1'
  }
  const { status, data } = await req.get('https://u.y.qq.com/cgi-bin/musicu.fcg', {
    ...options,
    headers: {
      'Referer': 'https://y.qq.com/portal/player.html',
      'origin': 'https://y.qq.com',
      'X-Real-IP': ip,
      'X-Forwarded-For': ip,
    },
    params: {
      '-': 'getplaysongvkey',
      // g_tk: 5381,
      loginUin: uin,
      hostUin: 0,
      format: 'json',
      inCharset: 'utf8',
      outCharset: 'utf-8-ice=0',  
      platform: 'yqq.json',
      needNewCode: 0,
      data: JSON.stringify({
        req_0: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: {
            filename: [file],
            guid: guid,
            songmid: [id],
            songtype: [0],
            loginflag: 1,
            platform: '20',
          },
        },
        comm: {
          uin,
          format: 'json',
          ct: 19,
          cv: 0,
          authst: qqmusic_key,
        },
      }),
    },
  })
  // console.log(555, data?.req_0?.data);
  const url = (data?.req_0?.data?.sip?.find(i => !i.startsWith('http://ws')) || data?.req_0?.data.sip?.[0] || '') + (data?.req_0?.data?.midurlinfo?.[0]?.purl || '')
  if (status === 200) {
    ctx.body = {
      code: 0,
      data: url,
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

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

