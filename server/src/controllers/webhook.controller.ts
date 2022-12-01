import { Controller, Post, Body } from '@nestjs/common'
import { WebhookService } from 'src/services/webhook.service'
import { WebhookDTO } from 'src/dtos/webhook.dto'
import { WEBHOOK_ACTION } from 'src/enums/webhookActions.enum'
import { WebhookResponse } from 'src/interfaces/webhook.interface'
import { SettingService } from 'src/services/settings.service'
import { WebhookResponseStatus } from 'src/enums/response.enum'
import { LoggerService } from '@tribeplatform/nest-logger'

@Controller('/api/webhook')
export class WebhookController {
  constructor(
    private readonly webhookService: WebhookService,
    private readonly loggerService: LoggerService,
    private readonly settingService: SettingService,
  ) {
    this.loggerService.setContext(WebhookController.name)
  }

  @Post()
  async getWebhook(@Body() payload: WebhookDTO): Promise<WebhookResponse> {
    this.loggerService.log(
      `Incoming getWebhook request with type ${payload?.type}: ${JSON.stringify(payload)}`,
    )
    try {
      switch (payload.type) {
        case WEBHOOK_ACTION.SUBSCRIPTION:
          return await this.webhookService.handleSubscription(payload)
        case WEBHOOK_ACTION.TEST:
          return this.webhookService.passChallenge(payload)
        case WEBHOOK_ACTION.APP_UNINSTALLED:
          await this.settingService.uninstall(payload.networkId)
        case WEBHOOK_ACTION.INTERACTION:
          await this.webhookService.handleInteraction(payload)
        case WEBHOOK_ACTION.SHORTCUTS_STATES:
          await this.settingService.getShortcutStates(payload)
      }
    } catch (err) {
      this.loggerService.error(err)
    }
    return {
      type: payload.type,
      status: WebhookResponseStatus.SUCCEEDED,
      data: payload.data,
    }
  }
}
