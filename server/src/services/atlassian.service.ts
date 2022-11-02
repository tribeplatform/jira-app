import { HttpService } from '@nestjs/axios'
import { Injectable, Scope } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '@tribeplatform/nest-logger'

@Injectable({ scope: Scope.TRANSIENT })
export class AtlassianClientService {
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly loggerService: LoggerService,
  ) {}
}
