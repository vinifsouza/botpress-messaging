import _ from 'lodash'
import { ConversationService } from '../../conversations/service'
import { Conversation } from '../../conversations/types'
import { KvsService } from '../../kvs/service'
import { MessageService } from '../../messages/service'
import { Message } from '../../messages/types'
import { Routers } from '../types'
import { ChannelConfig } from './config'
import { ChannelContext } from './context'
import { ChannelRenderer } from './renderer'
import { ChannelSender } from './sender'

export abstract class Channel<C extends ChannelConfig, CTX extends ChannelContext<any>> {
  abstract get id(): string

  // TODO: keep this public?
  public config!: C
  protected renderers: ChannelRenderer<CTX>[] = []
  protected senders: ChannelSender<CTX>[] = []

  // TODO: change this
  protected botId = 'default'

  constructor(
    protected kvs: KvsService,
    protected conversations: ConversationService,
    protected messages: MessageService,
    protected routers: Routers
  ) {}

  async setup(): Promise<void> {
    await this.setupConnection()
    this.renderers = this.setupRenderers().sort((a, b) => a.priority - b.priority)
    this.senders = this.setupSenders().sort((a, b) => a.priority - b.priority)
  }

  protected abstract setupConnection(): Promise<void>
  protected abstract setupRenderers(): ChannelRenderer<CTX>[]
  protected abstract setupSenders(): ChannelSender<CTX>[]

  async receive(payload: any) {
    const map = this.map(payload)

    const conversation = await this.conversations.forBot(this.botId).recent(map.userId)
    const message = await this.messages.forBot(this.botId).create(conversation.id, map.content, map.userId)

    await this.afterReceive(payload, conversation, message)

    console.log(`${this.id} send webhook`, message)
  }

  protected async afterReceive(payload: any, conversation: Conversation, message: Message) {}

  async send(conversationId: string, payload: any): Promise<void> {
    const conversation = (await this.conversations.forBot(this.botId).get(conversationId))!

    const context: CTX = {
      handlers: [],
      payload: _.cloneDeep(payload),
      // TODO: bot url
      botUrl: 'https://duckduckgo.com/',
      ...(await this.context(conversation))
    }

    for (const renderer of this.renderers) {
      if (renderer.handles(context)) {
        renderer.render(context)

        // TODO: do we need ids?
        context.handlers.push('id')
      }
    }

    for (const sender of this.senders) {
      if (sender.handles(context)) {
        await sender.send(context)
      }
    }

    const message = await this.messages.forBot(this.botId).create(conversation.id, payload, conversation.userId)
    console.log(`${this.id} message sent`, message)
  }

  protected abstract context(conversation: Conversation): Promise<any>
  protected abstract map(payload: any): { userId: string; content: any }
}
