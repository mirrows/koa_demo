const router = require('koa-router')(); //引入并实例化
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { gemini } = require('../utils/config');

const genAI = new GoogleGenerativeAI(gemini)
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

async function streamToStdout(ctx, stream) {
  console.log("Streaming...\n");
  for await (const chunk of stream) {
    // Get first candidate's current text chunk
    const chunkText = chunk.text();
    // Print to console without adding line breaks
    ctx.res.write(chunkText);
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

router.get('/text', async (ctx) => {
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  console.log('请求进入');
  const { msg } = ctx.request.query
  const chat = model.startChat({})
  displayChatTokenCount(model, chat, msg);
  const result1 = await chat.sendMessageStream(msg);
  await streamToStdout(ctx, result1.stream);

  // 当客户端关闭连接时清除定时器
  ctx.req.on('close', () => {
    clearInterval(interval);
  });
})


module.exports = router;

