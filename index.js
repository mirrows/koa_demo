const Koa = require('koa');
const app = new Koa();
const { koaBody } = require('koa-body');
const static = require('koa-static');
const { loadRoutes, router } = require('./utils/routes');
const { initRtc } = require('./utils/rtc');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

app.use(koaBody({jsonLimit: '50mb'}));

app.use(async (ctx, next) => {
  ctx.set('Access-Control-Allow-Origin', '*');
  ctx.set('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild, timestamp, token');
  ctx.set('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  const filePath = decodeURIComponent(ctx.request.path);
  if (filePath.startsWith('/download/')) { 
    console.log(filePath, 'will be downloaded');
    const fileName = path.basename(filePath);
    const fullPath = path.join(__dirname + '/static', filePath.substring(1));
    const size = fs.statSync(fullPath).size;
    console.log(fullPath, size);
    if (!fs.existsSync(fullPath)) {
      ctx.status = 404;
      ctx.body = { code: 404, msg: 'file not found' };
      return;
    }
    ctx.set({
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Type': mime.lookup(fullPath) || 'application/octet-stream',
      'Content-Length': size.toString(),
      'Transfer-Encoding': 'chunked',
    });
    ctx.body = fs.createReadStream(fullPath);
    return;
  }
  if (ctx.method == 'OPTIONS') {
    ctx.body = 200;
  } else {
    // try {
      await next();   // 执行后代的代码
      if (!ctx.body && ctx.response.get('connection') !== 'keep-alive') {  // 没有资源
        ctx.status = 404;
        ctx.body = { code: 404, msg: 'page has loss' };
      }
    // } catch (e) {
    //   // 如果后面的代码报错 返回500
    //   ctx.status = 500;
    //   ctx.body = { code: 500, msg: 'service error' };
    // }
  }
});

app.use(static(__dirname + '/static'));
loadRoutes(__dirname + '/routes');
app.use(router.routes(), router.allowedMethods())

const server = app.listen(16001, () => {
  console.log('service starts at http://localhost:16001 !!!')
});

initRtc(server)