const { default: axios } = require('axios');
const { githubClientID, githubSecret, githubToken } = require('../utils/config');
const https = require("https");
const { default: req } = require('../utils/req');
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
    // 在 axios 请求时，选择性忽略 SSL
    const agent = new https.Agent({
      rejectUnauthorized: false
    });
    const { status, data } = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: githubClientID,
      client_secret: githubSecret,
      code,
    }, { headers: { Accept: "application/vnd.github+json" }, httpsAgent: agent }
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
  console.log( ctx.request.headers, authorization, number )
  const { data } = await req.post(`https://api.github.com/repos/mirrows/mirrows.github.io/issues/${number}/comments`, {
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
  console.log(typeof authorization, authorization)
  const totalSql = `
  query { 
    repository(owner: "mirrows", name: "mirrows.github.io"){
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
    repository(owner: "mirrows", name: "mirrows.github.io"){
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

module.exports = router;

