const { req } = require('../utils/req');
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://pmstalt:test1234@cluster0.ck9bcgz.mongodb.net/?retryWrites=true&w=majority";


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const router = require('koa-router')(); //引入并实例化

router.get('/', ctx => {
  ctx.body = 'Hello World';
})

router.post('/awake', (ctx) => {
  ctx.body = {
    code: 0,
    msg: 'service has been awaked'
  }
})

router.get('/bing', async ctx => {
  const { n = 1 } = ctx.request.query
  const { status, data } = await req.get('https://bing.com/HPImageArchive.aspx', {
    params: { format: 'js', n },
  })
  if (status === 200) {
    ctx.body = {
      code: 0,
      data: data.images.map(msg => ({ ...msg, url: `https://bing.com${msg.url}` }))
    }
  } else {
    ctx.status = 500
    ctx.body = {
      code: 500,
      msg: '请求失败'
    }
  }
})

router.get('/ip', async (ctx) => {
  const { data } = await req.get('https://ip.useragentinfo.com/json').catch(err => {
    console.log(err)
  })
  console.log(data)
  ctx.body = {
    code: 0,
    data,
  }
})

router.get('/mongodb', async (ctx) => {
  const data = await run().catch(console.dir);
  ctx.body = {
    code: 0,
    ...data,
  }
})

async function run() {
  const res = {
    data: [],
    total: 0
  }
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const collection = client.db("ips").collection("vcdf")

    // await collection.insertOne({
    //   ip: `12.233.${String(Math.random()).slice(5,8)}.${String(Math.random()).slice(5,7)}`, 
    //   date: "2023-07-24"
    // });
    const total = await collection.countDocuments()
    res.total = total
    const data = await collection.findOne();
    console.log(data)
    res.data.push(data)
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
  return res
}

module.exports = router;

