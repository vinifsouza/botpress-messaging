import { Router } from 'express'
import { ApiRequest, ClientScopedApi } from '../base/api'
import { ChannelService } from '../channels/service'
import { ClientService } from '../clients/service'
import { InstanceService } from '../instances/service'
import { MessageService } from './service'

export class MessageApi extends ClientScopedApi {
  constructor(
    router: Router,
    clients: ClientService,
    private channels: ChannelService,
    private instances: InstanceService,
    private messages: MessageService
  ) {
    super(router, clients)
  }

  async setup() {
    this.router.use('/messages', this.extractClient.bind(this))

    this.router.post('/messages', async (req, res) => {
      const { conversationId, payload, authorId } = req.body

      // TODO: validate ownership
      const message = await this.messages.create(conversationId, payload, authorId)

      res.send(message)
    })

    this.router.delete('/messages', async (req, res) => {
      const { id, conversationId } = req.query

      // TODO: validate ownership
      let deleted: number
      if (id) {
        deleted = await this.messages.delete(id as string)
      } else {
        deleted = await this.messages.deleteByConversationId(conversationId as string)
      }

      res.send({ count: deleted })
    })

    this.router.get('/messages/:messageId', async (req, res) => {
      const { messageId } = req.params

      // TODO: validate ownership
      const message = await this.messages.get(messageId)

      if (message) {
        res.send(message)
      } else {
        res.sendStatus(404)
      }
    })

    this.router.get('/messages/', async (req, res) => {
      const { conversationId, limit } = req.query

      // TODO: validate ownership
      const conversations = await this.messages.listByConversationId(conversationId as string, +limit!)

      res.send(conversations)
    })

    // TODO: probably should be in a "Chat" api instead
    this.router.post('/messages/send', async (req: ApiRequest, res) => {
      const { channel, conversationId, payload } = req.body

      const channelId = this.channels.getByName(channel).id
      const conduit = await this.instances.getInstanceByProviderId(req.client!.providerId, channelId)
      await conduit.send(conversationId, payload)

      res.sendStatus(200)
    })
  }
}
