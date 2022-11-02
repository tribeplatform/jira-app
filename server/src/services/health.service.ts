import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'

@Injectable()
export class HealthService {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  checkStatus() {
    const isDbConnected = this.connection.readyState == 1
    const healthChecks = [isDbConnected]
    const isHealthy = healthChecks.reduce((prev, cur) => prev && cur, true)
    return {
      status: isHealthy ? 'ok' : 'down',
    }
  }
}
