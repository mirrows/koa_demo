const { imgUrlToBase64 } = require('../../utils/imgTool');

const router = require('koa-router')(); //引入并实例化

router.get('/', ctx => {
  ctx.body = 'common';
})

router.get('/url2base64', async (ctx) => {
  const { url } = ctx.request.query
  console.log(url)
  if(!url) return ctx.body = { code: 400, msg: 'url is required' }
  const data = await imgUrlToBase64(url)
  ctx.body = {code: data ? 0 : 500, data: data.data || 'parse error', metadata: data?.metadata };
})

module.exports = router;

