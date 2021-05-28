import { Channel } from '../base/channel'
import { SlackInstance } from './instance'

export class SlackChannel extends Channel<SlackInstance> {
  get name() {
    return 'slack'
  }

  get id() {
    return 'd6111009-712d-485e-a62d-1540f966f4f3'
  }

  protected createInstance() {
    return new SlackInstance()
  }

  async setupRoutes() {
    this.router.use('/interactive', (req, res) => {
      const instance = res.locals.instance as SlackInstance
      instance.interactiveListener(req, res)
    })
    this.printWebhook('interactive')

    this.router.use('/events', (req, res) => {
      const instance = res.locals.instance as SlackInstance
      instance.eventsListener(req, res)
    })
    this.printWebhook('events')
  }
}
