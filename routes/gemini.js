const router = require('koa-router')(); //引入并实例化
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { gemini } = require('../utils/config');
const { PassThrough } = require("stream");

const genAI = new GoogleGenerativeAI(gemini)
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function streamToStdout(ctx, content) {
  console.log("Streaming...\n");
  for await (const chunk of content) {
    // Get first candidate's current text chunk
    const chunkText = chunk.text();
    // Print to console without adding line breaks
    ctx.res.write(`data: ${chunkText}\n\n`);
  }
  // Print blank line
  // console.log("\n");
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

router.post('/text', async (ctx) => {
  const { msg } = ctx.request.body
  ctx.request.socket.setTimeout(0);
  ctx.req.socket.setNoDelay(true);
  ctx.req.socket.setKeepAlive(true);
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  console.log('请求进入');
  // 当客户端关闭连接时清除定时器
  ctx.req.on('close', () => {
    console.log('连接关闭')
    ctx.status = 200;
    ctx.body = '';
    // ctx.body=""
  });
  const chat = model.startChat({})
  // displayChatTokenCount(model, chat, msg);
  const result1 = await chat.sendMessageStream(msg);
  
  await streamToStdout(ctx, result1.stream);
  
})


module.exports = router;

