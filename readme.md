### 实现功能
1. 动态路由规则
接口名=文件夹/文件名（除了index）/对应接口
2. 可存放静态资源，优先使用静态文件
3. 已设置cros跨域请求通过
4. 已区分环境，通过--mode=env区分
5. 添加必应壁纸、金山词霸每日一句、金山词霸翻译、githubtoken获取



githubtoken 获取注意事项：
1. 在.env文件中添加 `GITHUB_SECRET` 和 `GITHUB_CLIENT_ID` 对应申请的key值
2. clientID在客户端和服务端的值需要保持一致

词霸接口注意事项：
1. 在.env文件中添加 `CIBA_KEY` 对应申请的key