const randomString = (length = 4, chars = 'abcdefghijklmnopqrstuvwxyz') => {
  return [...Array(length)].map(_ => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
}


const Format = function (time, fmt = "YYYY-MM-DD") {
  var o = {
    "M+": time.getMonth() + 1, //月份
    "D+": time.getDate(), //日
    "H+": time.getHours(), //小时
    "m+": time.getMinutes(), //分
    "s+": time.getSeconds(), //秒
    "q+": Math.floor((time.getMonth() + 3) / 3), //季度
    "S": time.getMilliseconds() //毫秒
  }
  if (/(Y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (time.getFullYear() + "").substr(4 - RegExp.$1.length));
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
  return fmt;
}

const wait = (timeout = 500) => {
  return new Promise(res => {
    const timer = setTimeout(() => {
      clearTimeout(timer)
      res()
    }, timeout)
  })
}

module.exports = {
    randomString,
    Format,
    wait,
}