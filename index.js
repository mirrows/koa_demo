const Koa = require('koa');
const app = new Koa();
const { koaBody } = require('koa-body');
const static = require('koa-static');
const { loadRoutes, router } = require('./utils/routes');

app.use(koaBody());

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
  ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  if (ctx.method == 'OPTIONS') {
    ctx.body = 200;
  } else {
    try {
      await next();   // 执行后代的代码
      if (!ctx.body) {  // 没有资源
        ctx.status = 404;
        ctx.body = { code: 404, msg: 'page has loss' };
      }
    } catch (e) {
      // 如果后面的代码报错 返回500
      ctx.status = 500;
      ctx.body = { code: 500, msg: 'service error' };
    }
  }
});

app.use(static(__dirname + '/static'));
loadRoutes(__dirname + '/routes');
app.use(router.routes(), router.allowedMethods())

app.listen(16001, () => {
  console.log('service starts at http://localhost:16001')
});