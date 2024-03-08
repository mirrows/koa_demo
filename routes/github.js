const { randomString } = require('../utils/common');
const { githubClientID, githubSecret, githubToken, gUser } = require('../utils/config');
const { req } = require('../utils/req');
const router = require('koa-router')(); //引入并实例化

router.post('/token', async (ctx, next) => {
  const { code } = ctx.request.body
  if (!code) {
    ctx.status = 403
    return ctx.body = {
      code: 403,
      msg: '请输入code'
    }
  }
  try {
    const { status, data } = await req.post('https://github.com/login/oauth/access_token', {
      client_id: githubClientID,
      client_secret: githubSecret,
      code,
    }, { headers: { Accept: "application/vnd.github+json" } }
    )
    if (status === 200) {
      ctx.body = data
    } else {
      ctx.status = 500
      ctx.body = {
        code: 500,
        msg: '请求失败,请稍后再试',
        data,
      }
    }
  } catch (err) {
    ctx.body = {
      code: 500,
      msg: err
    }
  }
})

router.post('/addComment', async (ctx) => {
  const { number, body } = ctx.request.body
  const { authorization } = ctx.request.headers
  const { data } = await req.post(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/${number}/comments`, {
    body,
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
  }).catch(err => {
    console.log(err)
  })
  ctx.body = {
    code: 0,
    data,
  }
})


router.get('/queryComments', async (ctx) => {
  const { number, per_page, page } = ctx.request.query
  const { authorization } = ctx.request.headers
  const { data: comments } = await req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/${number}/comments`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
    params: {
      per_page,
      page
    },
  }).catch(err => {
    console.log(err)
  })
  const list = comments.map(comment => {
    let result = {
      ...comment,
    }
    let author = comment.user
    try {
      const { body, ...actor } = JSON.parse(result.body)
      if(!body) {throw Error('数字会被解析的')}
      author = actor
      author.avatar_url = actor.avatarUrl || `https://ui-avatars.com/api/?name=${author.login}`
      result.body = body
    } catch {
      if (gUser === author.login) {
        author.login = randomString()
        author.avatar_url = `https://ui-avatars.com/api/?name=${author.login}`
        author.email = ''
      }
    }
    result.author = author
    return result
  })
  ctx.body = {
    code: 0,
    data: list,
    total: comments.totalCount,
  }
})

router.get('/listArticals', async (ctx) => {
  const { authorization } = ctx.request.headers
  const { number } = ctx.request.query
  if(+String(number) + 1) {
    // issue详情
    const data = await req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/${number}`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: authorization || githubToken,
      },
      params: { labels: 'blog' }
    }).catch(err => {
      console.log(err)
    })
    let msg = {}
    try {
      msg = JSON.parse(data.data.title)
    } catch {
      msg = { title: data.data?.title || '', img: 'https://empty.t-n.top/pub_lic/2022_09_06/pic1662469258268048.jpg' }
    }
    const result = {
      ...data.data,
      ...msg
    }
    ctx.body = {
      code: 0,
      data: result,
    }
  } else {
    // issue列表
    const { data: issues } = await req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues`, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: authorization || githubToken,
      },
      params: {
        labels: 'blog',
        ...ctx.request.query
    }
    }).catch(err => {
      console.log(err)
    })
    const query = `query{
      repository(owner: "${gUser}", name: "${gUser}.github.io"){
        issues(labels: "blog"){
          totalCount
        }
      }
    }`
    const data = await req.post('https://api.github.com/graphql', { query }, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: authorization || githubToken,
      }
    }).catch((err) => {
      console.log(err)
    })
    const { totalCount: total } = data.data.data.repository.issues
    const result = issues.map(artical => {
      let msg = {}
      try {
        msg = JSON.parse(artical.title)
      } catch {
        msg = { title: artical.title, img: 'https://empty.t-n.top/pub_lic/2022_09_06/pic1662469258268048.jpg' }
      }
      return {
        ...artical,
        ...msg,
      }
    })
    ctx.body = {
      code: 0,
      data: result,
      total,
    }
  }
})

// router.get('/queryComments', async (ctx) => {
//   const { number, type, cursor } = ctx.request.query
//   const { authorization } = ctx.request.headers
//   const sql = `
//   query{
//     repository(owner: "mirrows", name: "mirrows.github.io"){
//       issue(number: ${number}){
//         comments(first: 30,${type ? ` ${type}: "${cursor}",` : ''} orderBy: { direction: DESC, field: UPDATED_AT }){
//           totalCount
//           pageInfo{
//             endCursor
//             startCursor
//             hasNextPage
//             hasPreviousPage
//           }
//           edges{
//             node{
//               body
//               id
//               updatedAt
//               author{
//                 login
//                 avatarUrl
//                 url
//               }
//             }
//           }
//         }
//       }
      
//     }
//   }
//   `
//   const { data } = await req.post('https://api.github.com/graphql', {
//     query: sql,
//   }, {
//     headers: {
//       Accept: "application/vnd.github+json",
//       Authorization: authorization || githubToken,
//     }
//   })
//   const comments = data.data.repository.issue.comments
//   const list = comments.edges.map(comment => {
//     let result = {
//       ...comment.node,
//     }
//     let author = comment.node.author
//     try {
//       const { body, ...actor } = JSON.parse(result.body)
//       if(!body) {throw Error('数字会被解析的')}
//       author = actor
//       author.avatarUrl = actor.avatarUrl || `https://ui-avatars.com/api/?name=${author.login}`
//       result.body = body
//     } catch {
//       if (gUser === author.login) {
//         author.login = randomString()
//         author.avatarUrl = `https://ui-avatars.com/api/?name=${author.login}`
//         author.email = ''
//       }
//     }
//     result.author = author
//     return result
//   })
//   ctx.body = {
//     code: 0,
//     data: list,
//     total: comments.totalCount,
//     pageInfo: comments.pageInfo
//   }
// })

// router.get('/listArticals', async (ctx) => {
//   const { authorization } = ctx.request.headers
//   const { number } = ctx.request.query
//   if(+String(number) + 1) {
//     // issue详情
//     const data = await req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/${number}`, {
//       headers: {
//         Accept: "application/vnd.github+json",
//         Authorization: authorization || githubToken,
//       },
//       params: { labels: 'blog' }
//     }).catch(err => {
//       console.log(err)
//     })
//     let msg = {}
//     try {
//       msg = JSON.parse(data.data.title)
//     } catch {
//       msg = { title: data.data?.title || '', img: 'https://empty.t-n.top/pub_lic/2022_09_06/pic1662469258268048.jpg' }
//     }
//     const result = {
//       ...data.data,
//       ...msg
//     }
//     ctx.body = {
//       code: 0,
//       data: result,
//     }
//   } else {
//     // issue列表
//     const { type, cursor } = ctx.request.query
//     const query = `query{
//       repository(owner: "${gUser}", name: "${gUser}.github.io"){
//         issues(labels: "blog", first: 30,${type ? ` ${type}: "${cursor}",` : ''} orderBy: {field: CREATED_AT, direction: DESC}){
//           totalCount
//           pageInfo{
//             endCursor
//             startCursor
//             hasNextPage
//             hasPreviousPage
//           }
//           nodes{
//             body
//             number
//             state
//             locked
//             id
//             createdAt
//             updatedAt
//             title
//             labels(first: 10){
//               nodes{
//                 name
//                 color
//                 id
//               }
//             }
//             comments{
//               totalCount
//             }
//           }
//         }
//       }
//     }`
//     const data = await req.post('https://api.github.com/graphql', { query }, {
//       headers: {
//         Accept: "application/vnd.github+json",
//         Authorization: authorization || githubToken,
//       }
//     }).catch((err) => {
//       console.log(err)
//     })
//     const issues = data.data.data.repository.issues
//     const total = issues.totalCount
//     const result = issues.nodes?.map(artical => {
//       let msg = {}
//       try {
//         msg = JSON.parse(artical.title)
//       } catch {
//         msg = { title: artical.title, img: 'https://empty.t-n.top/pub_lic/2022_09_06/pic1662469258268048.jpg' }
//       }
//       return {
//         ...artical,
//         ...msg,
//         labels: artical.labels.nodes,
//         created_at: artical.createdAt,
//         updated_at: artical.updatedAt,
//         comments: artical.comments.totalCount,
//       }
//     })
//     ctx.body = {
//       code: 0,
//       data: result,
//       total,
//       pageInfo: issues.pageInfo
//     }
//   }
// })

router.post('/addArtical', async (ctx) => {
  const params = ctx.request.body
  const { authorization } = ctx.request.headers
  const { data } = await req.post(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues`, params, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization,
    },
  }).catch(err => {
    console.log(err)
  })
  ctx.body = {
    code: 0,
    data,
  }
})

router.post('/editArtical', async (ctx) => {
  const { number, ...params } = ctx.request.body
  const { authorization } = ctx.request.headers
  const { data } = await req.patch(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/${number}`, params, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization,
    },
  }).catch(err => {
    console.log(err)
  })
  ctx.body = {
    code: 0,
    data,
  }
})

module.exports = router;

