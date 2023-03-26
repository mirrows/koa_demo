const env = process.argv.find(arg => arg.match(/^--mode=/))?.replace(/^--mode=/, '')
require('dotenv').config({ path: `.env.${env || 'development'}` })

module.exports = {
  cibaKey: process.env.CIBA_KEY,
  githubClientID: process.env.GITHUB_CLIENT_ID,
  githubSecret: process.env.GITHUB_SECRET
}