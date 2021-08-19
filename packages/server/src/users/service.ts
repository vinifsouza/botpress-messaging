import { User, uuid } from '@botpress/messaging-base'
import { v4 as uuidv4 } from 'uuid'
import { Service } from '../base/service'
import { Batcher } from '../batching/batcher'
import { BatchingService } from '../batching/service'
import { ServerCache } from '../caching/cache'
import { CachingService } from '../caching/service'
import { DatabaseService } from '../database/service'
import { UserTable } from './table'

export class UserService extends Service {
  public batcher!: Batcher<User>
  private cache!: ServerCache<uuid, User>

  private table: UserTable

  constructor(
    private db: DatabaseService,
    private cachingService: CachingService,
    private batchingService: BatchingService
  ) {
    super()
    this.table = new UserTable()
  }

  async setup() {
    this.batcher = await this.batchingService.newBatcher('batcher_users', [], this.handleBatchFlush.bind(this))

    this.cache = await this.cachingService.newServerCache('cache_user_by_id')

    await this.db.registerTable(this.table)
  }

  private async handleBatchFlush(batch: User[]) {
    await this.query().insert(batch)
  }

  async create(clientId: uuid): Promise<User> {
    const user = {
      id: uuidv4(),
      clientId
    }

    await this.batcher.push(user)
    this.cache.set(user.id, user)

    return user
  }

  public async get(id: uuid): Promise<User | undefined> {
    const cached = this.cache.get(id)
    if (cached) {
      return cached
    }

    await this.batcher.flush()

    const rows = await this.query().where({ id })
    if (rows?.length) {
      const user = rows[0] as User
      this.cache.set(id, user)
      return user
    }

    return undefined
  }

  private query() {
    return this.db.knex(this.table.id)
  }
}
