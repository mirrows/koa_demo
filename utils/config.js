const env = process.argv.find(arg => arg.match(/^--mode=/))?.replace(/^--mode=/, '')
require('dotenv').config({ path: `.env.${env || 'development'}` })

module.exports = {
  cibaKey: process.env.CIBA_KEY,
  githubClientID: process.env.GITHUB_CLIENT_ID,
  githubSecret: process.env.GITHUB_SECRET,
  githubToken: process.env.GITHUB_TOKEN,
  useGitee: process.env.USE_GITEE,
  gUser: process.env.GITHUB_USER,
  cdnMap: {
    photo: process.env.PIC_CDN,
    private: process.env.PRIVATE_CDN
  },
  dbName: process.env.DBNAME,
  mongoUri: process.env.MONGO_URI,
  gemini: process.env.GEMINI_API_KEY,
  tencentId: process.env.TX_API_ID,
  tencentKey: process.env.TX_API_KEY,
}