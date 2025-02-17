const ssh = require('ssh2');

const router = require('koa-router')(); //引入并实例化

router.post('/shadowsock', async ctx => {
  const { config, port, method } = ctx.request.body
  await sshClient.open(config);
  if (port) {
    await sshClient.exec(`sed -i '3s/.*/    "server_port": ${port},/g' /etc/shadowsocks.json`);
    await sshClient.exec(`firewall-cmd --permanent --zone=public --add-port=${port}/tcp`);
    await sshClient.exec('firewall-cmd --reload');
  }
  if (method) {
    await sshClient.exec(`sed -i '8s/.*/    "method":"${method}"/g' /etc/shadowsocks.json`);
  }
  await sshClient.exec('cat /etc/shadowsocks.json');
  await sshClient.exec('ssserver -c /etc/shadowsocks.json -d restart');
  await sshClient.close();
  ctx.body = {
    code: 0,
    msg: 'success'
  }
})

const sshClient = {
  client: null,
  open(config) {
    return new Promise(res => {
      this.client = new ssh.Client()
      this.client.connect(config)
      this.client.on('ready', () => {
        console.log('connected')
        res();
      })
    })
  },
  exec(order, cb = () => {}) {
    return new Promise((res, rej) => {
      this.client.exec(order, (err, stream) => {
        if (err) throw console.log(err)
        stream.on('close', (code, signal) => {
          console.log('stream closed with code ' + code + ' and signal ' + signal);
          res();
        }).on('data', function (data) {
          console.log('sTDOUT:\n' + data);
          cb(data);
        })
      }).on('error', (err) => {
        console.log(err);
        rej(err);
      })
    })
  },
  close() {
    this.client.end();
  }
}

module.exports = router;