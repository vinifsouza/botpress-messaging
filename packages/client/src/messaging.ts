import axios, { AxiosInstance, AxiosRequestConfig } from 'axios'
import { ChatClient } from './chat'
import { ConversationClient } from './conversations'
import { HealthClient } from './health'
import { MessageClient } from './messages'
import { SyncClient } from './sync'
import { UserClient } from './users'

export class MessagingClient {
  http: AxiosInstance
  authHttp: AxiosInstance
  syncs: SyncClient
  health: HealthClient
  chat: ChatClient
  users: UserClient
  conversations: ConversationClient
  messages: MessageClient

  constructor(options: MessagingOptions) {
    const { url, auth, client } = options

    this.http = this.configureHttpClient(client, this.getAxiosConfig({ url }))
    this.authHttp = this.configureHttpClient(client, this.getAxiosConfig({ url, auth }))

    this.syncs = new SyncClient(this.http)
    this.health = new HealthClient(this.authHttp)
    this.chat = new ChatClient(this.authHttp)
    this.users = new UserClient(this.authHttp)
    this.conversations = new ConversationClient(this.authHttp)
    this.messages = new MessageClient(this.authHttp)
  }

  private configureHttpClient(client: MessagingOptions['client'], config: AxiosRequestConfig) {
    if (client) {
      client.defaults = Object.assign(client.defaults, config)

      return client
    } else {
      return axios.create(config)
    }
  }

  private getAxiosConfig({ url, auth }: Pick<MessagingOptions, 'url' | 'auth'>): AxiosRequestConfig {
    const config: AxiosRequestConfig = { baseURL: `${url}/api`, headers: {} }

    if (auth) {
      config.headers['x-bp-messaging-client-id'] = auth.clientId
      config.headers['x-bp-messaging-client-token'] = auth.clientToken
    }

    return config
  }
}

export interface MessagingOptions {
  /** Base url of the messaging server */
  url: string
  /** Client authentication to access client owned resources. Optional */
  auth?: {
    clientId: string
    clientToken: string
  }
  /** A custom axios instance giving more control over the HTTP client used internally. Optional */
  client?: AxiosInstance
}
