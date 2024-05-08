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
  for await (const chunk of content) {
    // Get first candidate's current text chunk
    const chunkText = chunk.text();
    console.log(chunkText)
    // Print to console without adding line breaks
    questions[key].answer.push(chunkText)
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
  const result1 = await chat.sendMessageStream(msg);
  await streamToStdout(ctx, result1.stream);
  
})

router.post('/question_old', async (ctx) => {
  const { msg } = ctx.request.body
  // displayChatTokenCount(model, chat, msg);
  const key = md5(msg)
  if(!questions[key] || Date.now() - questions[key].timestamp > 30 * 60 * 1000) {
    questions[key] = {
      id: key,
      question: msg,
      answer: [],
      timestamp: Date.now(),
    }
    const result1 = await longChat.sendMessageStream(msg);
    streamToStdoutTimeout(key, result1.stream);
  }
  ctx.body = {
    code: 0,
    id: key,
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
  }
})

router.post('/history_old', async (ctx) => {
  const history = await longChat.getHistory();
  ctx.body = {
    code: 0,
    history,
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
  if(!questions[key] || Date.now() - questions[key].timestamp > 30 * 60 * 1000) {
    questions[key] = {
      id: key,
      question: msg,
      answer: [],
      timestamp: Date.now(),
    }
    const result1 = await aiMap[token].chat.sendMessageStream(msg);
    streamToStdoutTimeout(key, result1.stream);
  }
  ctx.body = {
    code: 0,
    id: key,
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
  const history = await aiMap[token].chat.getHistory();
  ctx.body = {
    code: 0,
    data: questions[id] || [],
    history,
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
  }
})

router.post('/init', async (ctx) => {
  const { token } = ctx.headers;
  if (!aiMap[token]) {
    aiMap[token] = {}
    aiMap[token].genAI = new GoogleGenerativeAI(token)
    aiMap[token].model = genAI.getGenerativeModel({ model: "gemini-pro" });
    aiMap[token].chat = model.startChat({})
    try {
      await aiMap[token].chat.sendMessageStream('hello')
    } catch(err) {
      return ctx.body = {
        code: 400,
        msg: err
      }
    }
  }
  const history = await aiMap[token].chat.getHistory();
  ctx.body = {
    code: 0,
    history,
  }
})


module.exports = router;

