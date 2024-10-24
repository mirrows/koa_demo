const { Server } = require("socket.io")

const rooms = new Map()
const socketInstance = {}

function initRtc(server) {
  const io = new Server(server)

  io.on('connection', (socket) => {
    console.log(6666, socket.id);
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

    socket.on('request_video', (info) => io.to(info.roomId).emit('receive_video', info))
    socket.on('receive_video', (info) => io.to(info.roomId).emit('receive_video', info))
    socket.on('accept_video', (info) => io.to(info.roomId).emit('accept_video', info))

    socket.on('offer', ({info: { socketId, roomId }, offer}) => {
      const curRoomUsers = rooms.get(roomId) || []
      const other = curRoomUsers.find(item => item.socketId !== socketId)
      if (!other) {
        console.log(`发offer时，未找到${roomId}房间的其他用户`)
      } else {
        socketInstance[other.socketId].emit('receive_offer', offer)
      }
    })

    socket.on('answer', ({info, answer}) => {
      const curRoomUsers = rooms.get(info.roomId) || []
      const other = curRoomUsers.find(item => item.socketId !== info.socketId)
      console.log('收到来自以下用户的answer');
      console.log(info);
      console.log('即将给以下用户发送receive_answer');
      console.log(other);
      if (!other)  {
        console.log(`发answer时，未找到${info.roomId}房间的其他用户`)
      } else {
        socketInstance[other.socketId].emit('receive_answer', answer)
      }
    })

    socket.on('add_candidate', ({info: { socketId, roomId }, candidate}) => {
      const curRoomUsers = rooms.get(roomId) || []
      console.log(curRoomUsers)
      const other = curRoomUsers.find(item => item.socketId !== socketId)
      if (!other)  {
        console.log(`加candidate时，未找到${roomId}房间的其他用户???`)
      } else {
        socketInstance[other.socketId].emit('add_candidate', candidate)
      }
    })

    socket.on('room_leave', (info) => {
      if (!socketInstance[info.socketId]) return
      socketInstance[info.socketId].leave(info.roomId);
      delete socketInstance[info.socketId]
      const curRoomUsers = rooms.get(info.roomId) || []
      if (!curRoomUsers.some(item => item.socketId !== info.socketId)) return
      const other = curRoomUsers.find(item => item.socketId !== info.socketId)
      console.log('room leave', curRoomUsers, info)
      if (other) {
        rooms.set(info.roomId, [other])
        socketInstance[other.socketId].emit('room_leave', info)
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
