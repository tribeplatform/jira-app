import { Controller, Post, Body } from '@nestjs/common'
import { WebhookService } from 'src/services/webhook.service'
import { WebhookDTO } from 'src/dtos/webhook.dto'
import { SettingService } from 'src/services/settings.service'
import { LoggerService } from '@tribeplatform/nest-logger'
import { InteractionWebhook, ShortcutStatesWebhook, Webhook, WebhookResponse } from 'src/interfaces'
import { WebhookStatus, WebhookType } from 'src/enums'

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
  async getWebhook(@Body() payload: Webhook): Promise<WebhookResponse> {
    this.loggerService.log(
      `Incoming getWebhook request with type ${payload?.type}: ${JSON.stringify(payload)}`,
    )
    try {
      switch (payload.type) {
        case WebhookType.Subscription:
          return await this.webhookService.handleSubscription(payload)
        case WebhookType.Test:
          return this.webhookService.passChallenge(payload)
        case WebhookType.AppInstalled:
          await this.settingService.uninstall(payload.networkId)
        case WebhookType.Interaction:
          return this.webhookService.handleInteraction(payload as InteractionWebhook)
        // case WebhookType.ShortcutsStates:
        //   await this.settingService.getShortcutStates(payload as ShortcutStatesWebhook)
      }
    } catch (err) {
      this.loggerService.error(err)
    }
    return {
      type: payload.type,
      status: WebhookStatus.Succeeded,
      // data: payload.data,
    }
  }
}
