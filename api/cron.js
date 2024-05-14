import { Format } from "../utils/common"
import { githubToken } from "../utils/config"
import { imgUrlToBase64 } from "../utils/imgTool"
import { req } from "../utils/req"

export default async function handler(request, response) {
  // const { name } = request.query
  // response.status(200).send(`Hello ${name}!`)
  const { status, data } = await req.get('https://bing.com/HPImageArchive.aspx', {
    params: { format: 'js', n: 1 },
  })
  if (status !== 200) {
    return response.status(500).send('请求失败')
    // ctx.status = 500
    // return ctx.body = {
    //   code: 500,
    //   msg: '请求失败'
    // }
  } else {
    const binPicData = {
      ...data.images[0],
      url: `https://bing.com${data.images[0].url}`
    }
    const base64 = await imgUrlToBase64(binPicData.url)
    const mode = 'photo'
    const realPath = `normal/${Format(new Date(), 'YYYY_MM_DD')}/bing.jpg`
    // https://wsrv.nl/?url=raw.githubusercontent.com/mirrows/photo/main/normal/2024_05_09/pic1715235436149104.png&w=300&fit=cover&n=-1&q=80
    const res = await req.put(`https://api.github.com/repos/${gUser}/${mode}/contents/${realPath}`, {
      content: base64.data,
      message: `create ${realPath} img`
    }, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: githubToken,
      },
    }).catch(err => {
      console.log(err.response.data)
      return err.response?.data || err
    })
    if (res?.data) {
      const f = res.data.content
      return response.status(200).send('success')
      // ctx.body = {
      //   code: 0,
      //   data: f,
      // }
    } else {
      return response.status(403).send('请求出错，请联系管理员')
      // ctx.status = 403
      // // console.log(res)
      // ctx.body = {
      //   code: 403,
      //   msg: '请求出错，请联系管理员',
      //   err: res,
      // }
    }
  }
}