const randomString = (length = 4, chars = 'abcdefghijklmnopqrstuvwxyz') => {
    return [...Array(length)].map(_ => chars.charAt(Math.floor(Math.random() * chars.length))).join('')
}

module.exports = {
    randomString
}