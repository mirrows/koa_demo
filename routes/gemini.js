const router = require('koa-router')(); //引入并实例化
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { gemini } = require('../utils/config');
const md5 = require('md5');

const genAI = new GoogleGenerativeAI(gemini)
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
const longChat = model.startChat({})
const questions = {}

const aiMap = {

}

let lastTime = 0

let times = 60

function initTimes() {
  const now = Date.now()
  if (now - lastTime > 1000 * 60 * 60) {
    lastTime = now
    times = 60
  }
}

function countTimes() {
  initTimes()
  times -= 1
}

async function streamToStdout(ctx, content) {
  console.log("Streaming...\n");
  for await (const chunk of content) {
    // Get first candidate's current text chunk
    const chunkText = chunk.text();
    console.log(chunkText)
    // Print to console without adding line breaks
    ctx.res.write(`data: ${chunkText}\n\n`);
  }
  ctx.res.end()
}

async function streamToStdoutTimeout(key, content) {
  try {
    for await (const chunk of content) {
      // Get first candidate's current text chunk
      const chunkText = chunk.text();
      console.log(chunkText)
      // Print to console without adding line breaks
      questions[key].answer.push({ text: chunkText })
    }
  } catch(err) {
    console.log(err);
    questions[key].answer.push({ text: '\n...我的脑瓜不足以细想这个问题，你换一个...\n' })
  }
  
}

async function displayTokenCount(model, request) {
  const { totalTokens } = await model.countTokens(request);
  console.log("Token count: ", totalTokens);
}

async function displayChatTokenCount(model, chat, msg) {
  const history = await chat.getHistory();
  const msgContent = { role: "user", parts: [{ text: msg }] };
  await displayTokenCount(model, { contents: [...history, msgContent] });
}

router.get('/text', async (ctx) => {
  const { msg } = ctx.request.query
  ctx.request.socket.setTimeout(0);
  ctx.req.socket.setNoDelay(true);
  ctx.req.socket.setKeepAlive(true);
  ctx.status = 200;
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  console.log('请求进入');
  // 当客户端关闭连接时清除定时器
  ctx.req.on('close', () => {
    console.log('连接关闭')
    // ctx.body=""
  });
  const chat = model.startChat({})
  // displayChatTokenCount(model, chat, msg);
  countTimes()
  if (times < 0) {
    return ctx.body = {
      code: 400,
      msg: '次数已用完，请等一小时后再使用'
    }
  }
  const result1 = await chat.sendMessageStream(msg);
  await streamToStdout(ctx, result1.stream);

})

router.post('/question_old', async (ctx) => {
  const { msg } = ctx.request.body
  // displayChatTokenCount(model, chat, msg);
  const key = md5(msg)
  if (!questions[key] || Date.now() - questions[key].timestamp > 30 * 60 * 1000) {
    questions[key] = {
      id: key,
      question: msg,
      answer: [],
      timestamp: Date.now(),
    }
    countTimes()
    if (times < 0) {
      return ctx.body = {
        code: 400,
        msg: '次数已用完，请等一小时后再使用'
      }
    }
    const result1 = await longChat.sendMessageStream(msg);
    streamToStdoutTimeout(key, result1.stream);
  }
  ctx.body = {
    code: 0,
    id: key,
    times,
  }
})

router.post('/answer_old', async (ctx) => {
  const { id } = ctx.request.body
  Object.keys(questions).forEach(key => {
    if (Date.now() - questions[key].timestamp > 30 * 60 * 1000) {
      delete questions[key]
    }
  })
  const history = await longChat.getHistory();
  ctx.body = {
    code: 0,
    data: questions[id] || [],
    history,
    times,
  }
})

router.post('/history_old', async (ctx) => {
  const history = await longChat.getHistory();
  ctx.body = {
    code: 0,
    history,
    times,
  }
})




router.post('/question', async (ctx) => {
  const { token } = ctx.headers;
  const { msg } = ctx.request.body
  // displayChatTokenCount(model, chat, msg);
  if (!aiMap[token]) {
    return ctx.body = {
      code: 400,
      msg: '请初始化gemini'
    }
  }
  const key = md5(msg)
  if (!questions[key] || Date.now() - questions[key].timestamp > 30 * 60 * 1000) {
    questions[key] = {
      id: key,
      question: msg,
      answer: [],
      timestamp: Date.now(),
    }
    countTimes()
    if (times < 0) {
      return ctx.body = {
        code: 400,
        msg: '次数已用完，请等一小时后再使用'
      }
    }
    const oldHistory = await aiMap[token].chat.getHistory()
    // 去除问答失败的对话
    const protectedHistory = oldHistory.filter((e, i) => e.parts?.length && (!oldHistory[i + 1] || oldHistory[i + 1].parts?.length))
    if(protectedHistory.length !== oldHistory) {
      aiMap[token].chat = aiMap[token].model.startChat({
        history: protectedHistory,
      })
    }
    const result1 = await aiMap[token].chat.sendMessageStream(msg);
    streamToStdoutTimeout(key, result1.stream);
  }
  ctx.body = {
    code: 0,
    id: key,
    times,
  }
})

router.post('/answer', async (ctx) => {
  const { token } = ctx.headers;
  const { id } = ctx.request.body;
  Object.keys(questions).forEach(key => {
    if (Date.now() - questions[key].timestamp > 30 * 60 * 1000) {
      delete questions[key]
    }
  })
  if (!aiMap[token]) {
    return ctx.body = {
      code: 400,
      msg: '请初始化gemini'
    }
  }
  // const history = await aiMap[token].chat.getHistory();
  ctx.body = {
    code: 0,
    data: questions[id] || [],
    times,
    // history,
  }
})

router.post('/history', async (ctx) => {
  const { token } = ctx.headers;
  if (!aiMap[token]) {
    return ctx.body = {
      code: 400,
      msg: '请初始化gemini'
    }
  }
  const history = await aiMap[token].chat.getHistory();
  ctx.body = {
    code: 0,
    history,
    times,
  }
})

router.post('/init', async (ctx) => {
  const { token } = ctx.headers;
  if (!aiMap[token]) {
    aiMap[token] = {}
    aiMap[token].genAI = new GoogleGenerativeAI(token)
    aiMap[token].model = aiMap[token].genAI.getGenerativeModel({ model: "gemini-pro" });
    aiMap[token].chat = aiMap[token].model.startChat({})
    try {
      await aiMap[token].model.countTokens({
        contents: [{ role: "user", parts: [{ text: 'hello' }] }],
      })
    } catch (err) {
      // console.log(token)
      console.log(err)
      delete aiMap[token]
      return ctx.body = {
        code: 400,
        msg: err,
      }
    }

  }
  const history = await aiMap[token].chat.getHistory();
  ctx.body = {
    code: 0,
    history,
    times,
  }
})


// 下面是自身生成chat对象

function clearCache() {
  Object.keys(aiMap).forEach((ai) => {
    if (Date.now - aiMap[ai].data > 1000 * 60 * 60 * 24) {
      delete aiMap[ai]
    }
  })
}

router.post('/init_global', async (ctx) => {
  const { token, authorization } = ctx.headers;
  const { history = [] } = ctx.request.body || {};
  clearCache();
  initTimes();
  // if (!aiMap[token]) {
  aiMap[token] = {}
  console.log(authorization || gemini)
  aiMap[token].genAI = new GoogleGenerativeAI(authorization || gemini)
  aiMap[token].model = aiMap[token].genAI.getGenerativeModel({ model: "gemini-pro" });
  aiMap[token].chat = aiMap[token].model.startChat({
    history,
  })
  aiMap[token].date = Date.now()
  try {
    await aiMap[token].model.countTokens({
      contents: [{ role: "user", parts: [{ text: 'hello' }] }],
    })
  } catch (err) {
    console.log(err)
    delete aiMap[token]
    return ctx.body = {
      code: 400,
      msg: err,
    }
  }
  // }
  const oldData = await aiMap[token].chat.getHistory();
  ctx.body = {
    code: 0,
    history: oldData,
    times,
  }
})


module.exports = router;

