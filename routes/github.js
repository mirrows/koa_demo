const { githubClientID, githubSecret, githubToken, gUser } = require('../utils/config');
const https = require("https");
const { req } = require('../utils/req');
const router = require('koa-router')(); //引入并实例化

router.post('/token', async (ctx, next) => {
  const { code } = JSON.parse(ctx.request.body)
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
  const { number, body } = JSON.parse(ctx.request.body)
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
  const { number, page } = ctx.request.query
  const { authorization } = ctx.request.headers
  const totalSql = `
  query { 
    repository(owner: "${gUser}", name: "${gUser}.github.io"){
      issue(number: ${number}){
        comments(first: 30){
          totalCount
        }
      }
    }
  }
  `
  const { data: totalData } = await req.post('https://api.github.com/graphql', {
    query: totalSql,
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    }
  })
  // const listReq = req.get(`https://api.github.com/repos/mirrows/mirrows.github.io/issues/${number}/comments`, {
  //   headers: {
  //     Accept: "application/vnd.github+json",
  //     Authorization: authorization || githubToken,
  //   },
  //   params: {
  //     page,
  //     sort: 'updated',
  //     direction: 'desc'
  //   }
  // })
  // const [{ value: { data: totalData } }, { value: { data } }] = await Promise.allSettled([totalReq, listReq])
  const { totalCount } = totalData.data.repository.issue.comments
  const sql = `
  query { 
    repository(owner: "${gUser}", name: "${gUser}.github.io"){
      issue(number: ${number}){
        comments(first: ${totalCount}, orderBy: { direction: DESC, field: UPDATED_AT }){
          edges{
            node{
              body
              id
              updatedAt
              author{
                login
                avatarUrl
                url
              }
            }
          }
        }
      }
    }
  }
  `
  const { data } = await req.post('https://api.github.com/graphql', {
    query: sql,
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    }
  })
  const list = data.data.repository.issue.comments.edges.map(comment => comment.node)
  ctx.body = {
    code: 0,
    data: list,
    total: totalCount,
  }
})

router.get('/listArticals', async (ctx) => {
  const { authorization } = ctx.request.headers
  const { number } = ctx.request.query
  const totalSql = `query { 
    repository(owner: "mirrows", name: "mirrows.github.io"){
      issues(filterBy: {labels: ["blog"]}){
      	totalCount
      }
    }
  }`
  const totalReq = req.post('https://api.github.com/graphql', {
    query: totalSql,
  }, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    }
  })
  const dataReq = req.get(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues${+String(number) + 1 ? `/${number}` : ''}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: authorization || githubToken,
    },
    params: { labels: 'blog' }
  }).catch(err => {
    console.log(err)
  })
  const [{value: {data: totalData}}, {value: {data}}] = await Promise.allSettled([totalReq, dataReq])
  console.log(totalData, data)
  const total = totalData.data.repository.issues.totalCount
  const result = (+String(number) + 1?[data]:data)?.map(artical => {
    let msg = {}
    try {
      msg = JSON.parse(artical.title)
    } catch {
      msg = { title: artical.title, img: 'https://empty.t-n.top/pub_lic/2022_09_06/pic1662469258268048.jpg' }
    }
    return { ...artical, ...msg }
  })
  ctx.body = {
    code: 0,
    data: +String(number) + 1 ? result[0] : result,
    total,
  }
})

router.post('/addArtical', async (ctx) => {
  const params = JSON.parse(ctx.request.body)
  const { authorization } = ctx.request.headers
  const { data } = await req.post(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues`, params, {
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

router.post('/editArtical', async (ctx) => {
  const { number, ...params } = JSON.parse(ctx.request.body)
  const { authorization } = ctx.request.headers
  const { data } = await req.patch(`https://api.github.com/repos/${gUser}/${gUser}.github.io/issues/${number}`, params, {
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

module.exports = router;

