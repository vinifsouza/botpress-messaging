import { SocketManager, SocketRequest } from '../socket/manager'
import { UserService } from '../users/service'
import { Schema } from './schema'
import { ConversationService } from './service'

export class ConversationSocket {
  constructor(private sockets: SocketManager, private users: UserService, private conversations: ConversationService) {}

  setup() {
    this.sockets.handle('conversations.create', Schema.Socket.Create, this.create.bind(this))
    this.sockets.handle('conversations.get', Schema.Socket.Get, this.get.bind(this))
    this.sockets.handle('conversations.list', Schema.Socket.List, this.list.bind(this))
    this.sockets.handle('conversations.delete', Schema.Socket.Delete, this.delete.bind(this))
  }

  async create(socket: SocketRequest) {
    const user = await this.users.get(socket.userId)
    const conversation = await this.conversations.create(user!.clientId, user!.id)

    socket.reply(conversation)
  }

  async get(socket: SocketRequest) {
    const { id } = socket.data
    const conversation = await this.conversations.get(id)

    if (!conversation || conversation.userId !== socket.userId) {
      return socket.reply(undefined)
    }

    socket.reply(conversation)
  }

  async list(socket: SocketRequest) {
    const { limit } = socket.data

    const user = await this.users.get(socket.userId)
    const conversations = await this.conversations.listByUserId(user!.clientId, socket.userId, +limit)

    socket.reply(conversations)
  }

  async delete(socket: SocketRequest) {
    const { id } = socket.data
    const conversation = await this.conversations.get(id)

    if (!conversation) {
      return socket.reply(false)
    } else if (conversation.userId !== socket.userId) {
      return socket.forbid('Conversation does not belong to user')
    }

    await this.conversations.delete(id)
    socket.reply(true)
  }
}