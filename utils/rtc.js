const { Server } = require("socket.io")

const rooms = new Map()
const socketInstance = {}

function initRtc(server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
    }
  })

  io.on('connection', (socket) => {
    socket.emit('connected', socket.id)

    socket.on('create_or_join_room', (info) => {
      const { roomId, socketId } = info
      const curRoomUsers = rooms.get(roomId) || []
      if(curRoomUsers.length >= 2) {
        socket.emit('room_full', roomId)
      } else {
        socket.join(roomId)
        io.to(roomId).emit(curRoomUsers.length ? 'room_joined' : 'room_created', info)
        rooms.set(roomId, [...curRoomUsers, info])
        // 客户端socketId绑定服务端socket
        socketInstance[socketId] = socket
      }
    })

    socket.on('request_video', (info) => io.to(info.roomId).emit('receive_video', info))
    socket.on('receive_video', (info) => io.to(info.roomId).emit('receive_video', info))
    socket.on('accept_video', (info) => io.to(info.roomId).emit('accept_video', info))

    socket.on('offer', ({info: { socketId, roomId }, offer}) => {
      const other = rooms.get(roomId).find(item => item.socketId !== socketId)
      socketInstance[other.socketId].emit('receive_offer', offer)
    })

    socket.on('answer', ({info: { socketId, roomId }, answer}) => {
      const other = rooms.get(roomId).find(item => item.socketId !== socketId)
      socketInstance[other.socketId].emit('receive_answer', answer)
    })

    socket.on('add_candidate', ({info: { socketId, roomId }, candidate}) => {
      const other = rooms.get(roomId).find(item => item.socketId !== socketId)
      socketInstance[other.socketId].emit('add_candidate', candidate)
    })
  })
}

module.exports = {
  initRtc
}
