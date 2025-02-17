const sharp = require('sharp');
const { req } = require('./req');

function imgUrlToBase64(url, cb=async () => {}) {
  return new Promise(function (resolve) {
    req.get(url, { responseType: 'arraybuffer' })
      .then(async res => {
        // const suffix = getImageSuffix(res.data)
        // console.log(suffix)
        const imageBuffer = Buffer.from(res.data);
        const metadata = await sharp(imageBuffer).metadata();
        const data = await cb(imageBuffer, metadata)
        resolve({metadata, data: (data || Buffer.from(res.data, 'binary')).toString('base64')})
      })
      .catch(e => {
        console.log(e)
        resolve()
      })
  })
}

function fileCompressor (file, options){
  return new Promise((resolve, reject) => {
    new Compressor(file, {
      ...options,
      success(blob) {
        resolve(blob)
      },
      error(err) {
        reject(err);
      }
    })
  })
}


const base64ToFile = (base64, fileName) => {
  let arr = base64.split(','),
    type = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], fileName, {
    type
  });
};

const imageBufferHeaders = [
  { bufBegin: [0xff, 0xd8], bufEnd: [0xff, 0xd9], suffix: '.jpeg', base64h: 'data:image/jpeg;base64,' },
  { bufBegin: [0x00, 0x00, 0x02, 0x00, 0x00], suffix: '.tga', base64h: 'data:image/tga;base64,' },
  { bufBegin: [0x00, 0x00, 0x10, 0x00, 0x00], suffix: '.rle', base64h: 'data:image/rle;base64,' },
  {
    bufBegin: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    suffix: '.png',
    base64h: 'data:image/png;base64,'
  },
  { bufBegin: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], suffix: '.gif', base64h: 'data:image/gif;base64,' },
  { bufBegin: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], suffix: '.gif', base64h: 'data:image/gif;base64,' },
  { bufBegin: [0x42, 0x4d], suffix: '.bmp', base64h: 'data:image/bmp;base64,' },
  { bufBegin: [0x0a], suffix: '.pcx', base64h: 'data:image/pcx;base64,' },
  { bufBegin: [0x49, 0x49], suffix: '.tif', base64h: 'data:image/tiff;base64,' },
  { bufBegin: [0x4d, 0x4d], suffix: '.tif', base64h: 'data:image/tiff;base64,' },
  {
    bufBegin: [0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x20, 0x20],
    suffix: '.ico',
    base64h: 'data:image/x-icon;base64,'
  },
  {
    bufBegin: [0x00, 0x00, 0x02, 0x00, 0x01, 0x00, 0x20, 0x20],
    suffix: '.cur',
    base64h: 'data:image/x-icon;base64,'
  },
  { bufBegin: [0x46, 0x4f, 0x52, 0x4d], suffix: '.iff', base64h: 'data:image/iff;base64,' },
  { bufBegin: [0x52, 0x49, 0x46, 0x46], suffix: '.ani', base64h: 'data:image/ani;base64,' },
  // svg: data:image/svg+xml;base64,
  // webp: data:image/webp;base64,
]

function getImageSuffix(fileBuffer) {
  // 将上文提到的 文件标识头 按 字节 整理到数组中

  for (const imageBufferHeader of imageBufferHeaders) {
    let isEqual
    // 判断标识头前缀
    if (imageBufferHeader.bufBegin) {
      const buf = Buffer.from(imageBufferHeader.bufBegin)
      isEqual = buf.equals(
        //使用 buffer.slice 方法 对 buffer 以字节为单位切割
        fileBuffer.slice(0, imageBufferHeader.bufBegin.length)
      )
    }
    // 判断标识头后缀
    if (isEqual && imageBufferHeader.bufEnd) {
      const buf = Buffer.from(imageBufferHeader.bufEnd)
      isEqual = buf.equals(fileBuffer.slice(-imageBufferHeader.bufEnd.length))
    }
    if (isEqual) {
      return imageBufferHeader.suffix
    }
  }
  // 未能识别到该文件类型
  return ''
}

module.exports = {
  imgUrlToBase64,
  base64ToFile,
  getImageSuffix,
  fileCompressor
}