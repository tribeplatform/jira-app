import { Controller, Post, Body } from '@nestjs/common'
import { WebhookService } from 'src/services/webhook.service'
import { WebhookDTO } from 'src/dtos/webhook.dto'
import { WEBHOOK_ACTION } from 'src/enums/webhookActions.enum'
import { WebhookResponse } from 'src/interfaces/webhook.interface'
import { SettingService } from 'src/services/settings.service'
import { ConfigService } from '@nestjs/config'
import { TribeClientService } from 'src/services/tribe.service'
import { JwtService } from '@nestjs/jwt'
import { LoadBlockDTO } from 'src/dtos/load-block.dto'
import { WebhookResponseStatus } from 'src/enums/response.enum'
import { LoggerService } from '@tribeplatform/nest-logger'

@Controller('/api/settings')
export class SettingsController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly settings: SettingService,
    private readonly configService: ConfigService,
    private readonly tribeService: TribeClientService,
    private readonly jwtService: JwtService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext(SettingsController.name)
  }

  @Post()
  async getSetting(@Body() payload: WebhookDTO): Promise<WebhookResponse> {
    this.loggerService.log(`Incoming getSetting request ${JSON.stringify(payload)}`)
    if (payload.type === WEBHOOK_ACTION.TEST) return this.webhookService.passChallenge(payload)
    this.tribeService.setNetwork(payload.networkId)
    const network = await this.tribeService.getNetwork()
    const jwt = this.jwtService.sign({
      sub: network.id,
      usr: payload?.data?.actorId,
    })
    const loadBlockPayload: LoadBlockDTO = {
      serverUrl: this.configService.get('server.url'),
      network,
      jwt,
    }

    try {
      switch (payload.type) {
        case WEBHOOK_ACTION.LOAD_BLOCK:
          return await this.settings.loadBlock(loadBlockPayload)
        case WEBHOOK_ACTION.Callback:
          return await this.settings.handleCallback(payload, loadBlockPayload)
        default:
          return {
            type: payload.type,
            status: WebhookResponseStatus.SUCCEEDED,
            data: payload.data,
          }
      }
    } catch (err) {
      this.loggerService.error(err)
    }
  }
}
