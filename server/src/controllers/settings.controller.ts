import { Controller, Post, Body } from '@nestjs/common'
import { WebhookService } from 'src/services/webhook.service'
import { WebhookDTO } from 'src/dtos/webhook.dto'
import { SettingService } from 'src/services/settings.service'
import { ConfigService } from '@nestjs/config'
import { TribeClientService } from 'src/services/tribe.service'
import { JwtService } from '@nestjs/jwt'
import { LoadBlockDTO } from 'src/dtos/load-block.dto'
import { LoggerService } from '@tribeplatform/nest-logger'
import { WebhookStatus, WebhookType } from 'src/enums'
import { Webhook, WebhookResponse } from 'src/interfaces'

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
  async getSetting(@Body() payload: Webhook): Promise<WebhookResponse> {
    this.loggerService.log(`Incoming getSetting request ${JSON.stringify(payload)}`)
    if (payload.type === WebhookType.Test) return this.webhookService.passChallenge(payload)
    this.tribeService.setNetwork(payload.networkId)
    const network = await this.tribeService.getNetwork()
    const jwt = this.jwtService.sign({
      sub: network.id,
      usr: (payload?.data as any)?.actorId,
    })
    const loadBlockPayload: LoadBlockDTO = {
      serverUrl: this.configService.get('server.url'),
      network,
      jwt,
    }

    try {
      switch (payload.type) {
        case WebhookType.LoadBlock:
          return await this.settings.loadBlock(loadBlockPayload)
        case WebhookType.Callback:
          return await this.settings.handleCallback(loadBlockPayload)
        default:
          return {
            type: payload.type,
            status: WebhookStatus.Succeeded,
            data: {},
          }
      }
    } catch (err) {
      this.loggerService.error(err)
    }
  }
}
