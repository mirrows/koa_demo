const router = require('koa-router')(); //引入并实例化
const fs = require('fs');
const path = require('path');

function loadRoutes(filePath, routePath = '') { //封装递归
  //将当前目录下 都读出来
  const files = fs.readdirSync(filePath);
  files.forEach(file => {
    let newFilePath = path.join(path.resolve(filePath), file);
    if (fs.statSync(newFilePath).isDirectory()) {
      // 是目录
      let newRoutePath = `${routePath}/${file}`;
      loadRoutes(newFilePath, newRoutePath);
    } else {
      // 是文件
      // 兼容其他文件，除了index.js 同级的其他文件生成的接口会添加文件名前缀
      newRoutePath = file.match(/^index./) ? routePath : `${routePath}/${file.split('.')[0]}`;
      let route = require(newFilePath);
      //注册路由
      router.use(newRoutePath, route.routes())
      router.use(route.allowedMethods())
    }
  })
}

module.exports = {
  loadRoutes,
  router
}