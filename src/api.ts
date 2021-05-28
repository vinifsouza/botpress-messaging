import express, { Router } from 'express'
import { App } from './app'
import { ChannelApi } from './channels/api'
import { MessageApi } from './messages/api'

export class Api {
  private router!: Router

  messages: MessageApi
  channels: ChannelApi

  constructor(private app: App, private root: Router) {
    this.router = Router()
    this.messages = new MessageApi(this.router, app.clients, app.messages)
    this.channels = new ChannelApi(this.root, this.app)
  }

  async setup() {
    this.router.use(express.json())
    this.router.use(express.urlencoded({ extended: true }))
    this.root.use('/api', this.router)

    this.router.post('/send', async (req, res) => {
      const { token } = req.headers
      const { channel, conversationId, payload } = req.body

      const client = (await this.app.clients.getByToken(token as string))!
      const providerName = (await this.app.providers.getById(client.providerId))!.name
      const instance = await this.app.channels.getByName(channel).getInstance(providerName)
      await instance.send(conversationId, payload)

      res.sendStatus(200)
    })

    await this.messages.setup()
    await this.channels.setup()
  }
}
