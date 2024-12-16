const { Server } = require("socket.io")

const rooms = new Map()
const socketInstance = {}

function initRtc(server) {
  const io = new Server(server)

  io.on('connection', (socket) => {
    socket.emit('connected', socket.id)

    socket.on('create_or_join_room', ({ info, roomId: targetRoomId }) => {
      const { roomId, socketId } = info
      const curRoomUsers = rooms.get(targetRoomId || info.roomId) || []
      console.log(
        targetRoomId,
        roomId,
        curRoomUsers.length,
        rooms.get(targetRoomId),
        rooms.get(roomId)
      )
      if (targetRoomId && curRoomUsers.length === 0) {
        socket.emit('room_joined', { user: info, another: info, result: 404 })
        return
      }
      console.log(curRoomUsers)
      if(curRoomUsers.length >= 2) {
        socket.emit('room_full', roomId)
      } else {
        socket.join(roomId)
        if (curRoomUsers.length) {
          io.to(roomId).emit('room_joined', {
            user: info,
            another: curRoomUsers[0],
            ...(targetRoomId ? {result: 200} : {})
          })
        } else {
          io.to(roomId).emit('room_created', info)
        }
        // io.to(roomId).emit(curRoomUsers.length ? 'room_joined' : 'room_created', info)
        rooms.set(roomId, [...curRoomUsers, info])
        // 客户端socketId绑定服务端socket
        socketInstance[socketId] = socket
      }
      console.log('当前房间有用户', rooms.get(roomId))
    })
    socket.on('join', ({ info }) => {
      const { socketId } = info
      const curRoomUsers = rooms.get("common_room") || []
      socket.emit('join', {
        user: info,
        another: curRoomUsers.filter(user => user.socketId !== socketId),
      })
    })
    

    socket.on('request_video', (info) => io.to(info.roomId).emit('receive_video', info))
    socket.on('receive_video', (info) => io.to(info.roomId).emit('receive_video', info))
    socket.on('accept_video', (info) => io.to(info.roomId).emit('accept_video', info))

    socket.on('offer', ({info, offer, to: other}) => {
      socketInstance[other.socketId].emit('receive_offer', {info, offer, to: other})
    })

    socket.on('answer', ({info, answer, to: other}) => {
      socketInstance[other.socketId].emit('receive_answer', {info, answer, to: other})
    })

    socket.on('add_candidate', ({info, candidate, to: other}) => {
      socketInstance[other.socketId].emit('add_candidate', {info, candidate, to: other})
    })

    socket.on('room_leave', (info) => {
      if (socketInstance[info.socketId]) {
        socketInstance[info.socketId].leave(info.roomId);
        delete socketInstance[info.socketId]
      }
      const curRoomUsers = rooms.get(info.roomId) || []
      if (!curRoomUsers.some(item => item.socketId === info.socketId)) return
      const other = curRoomUsers.filter(item => item.socketId !== info.socketId)
      console.log('room leave', curRoomUsers, info)
      if (other && other.length) {
        rooms.set(info.roomId, [...other])
        other.forEach(user => {
          socketInstance[user.socketId].emit('room_leave', info)
        })
        // socketInstance[other.socketId].emit('room_leave', info)
      } else {
        rooms.delete(info.roomId)
      }
    })
    socket.on('leave', (info) => {
      if (socketInstance[info.socketId]) {
        socketInstance[info.socketId].leave(info.roomId);
        delete socketInstance[info.socketId]
      }
      const curRoomUsers = rooms.get('common_room') || []
      if (!curRoomUsers.some(item => item.socketId === info.socketId)) return
      const other = curRoomUsers.filter(item => item.socketId !== info.socketId)
      console.log('room leave', curRoomUsers, info)
      if (other && other.length) {
        rooms.set(info.roomId, [...other])
        other.forEach(user => {
          socketInstance[user.socketId].emit('leave', info)
        })
        // socketInstance[other.socketId].emit('room_leave', info)
      } else {
        rooms.delete(info.roomId)
      }
    })

    // 监听 disconnect 事件
    socket.on('disconnect', (reason) => {
      console.log('User disconnected', reason);
      // 这里可以执行清理工作，比如移除用户相关的状态信息
    });

    // 监听 disconnect 事件
    socket.on('close', (reason) => {
      console.log('connection closed', reason);
      // 这里可以执行清理工作，比如移除用户相关的状态信息
    });
  })
}

module.exports = {
  initRtc
}
