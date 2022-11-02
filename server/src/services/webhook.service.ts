import { Injectable, Scope } from '@nestjs/common'
import { WebhookDTO } from 'src/dtos/webhook.dto'
import { WebhookResponseStatus } from 'src/enums/response.enum'
import { WEBHOOK_ACTION } from 'src/enums/webhookActions.enum'
import { WebhookResponse } from 'src/interfaces/webhook.interface'
import { SettingService } from './settings.service'
import { TribeClientService } from './tribe.service'
import { LoggerService } from '@tribeplatform/nest-logger'
import { AtlassianClientService } from './atlassian.service'
import { Atlassian } from 'src/schemas/atlassian.schema'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
@Injectable({ scope: Scope.REQUEST })
export class WebhookService {
  constructor(
    private readonly tribeClientService: TribeClientService,
    private readonly settingsService: SettingService,
    private readonly loggerService: LoggerService,
    private readonly atlassianClientService: AtlassianClientService,
    @InjectModel(Atlassian.name) private atlassianModel: Model<Atlassian>,
  ) {
    this.loggerService.setContext(WebhookService.name)
  }

  public passChallenge(tribePayload: WebhookDTO): WebhookResponse {
    return {
      type: WEBHOOK_ACTION.TEST,
      status: WebhookResponseStatus.SUCCEEDED,
      data: {
        challenge: tribePayload?.data?.challenge,
      },
    }
  }

  public async handleSubscription(payload: WebhookDTO): Promise<WebhookResponse> {
    let settings: Atlassian
    try {
      settings = await this.settingsService.findSettings(payload.networkId)
    } catch (err) {
      this.loggerService.error(err)
      return {
        type: WEBHOOK_ACTION.SUBSCRIPTION,
        status: WebhookResponseStatus.FAILED,
        data: {
          message: 'An error occurred while fetching settings',
        },
      }
    }
    try {
      if (!settings || !settings.refreshToken) {
        return Promise.resolve({
          type: payload.type,
          status: WebhookResponseStatus.SUCCEEDED,
          data: payload.data,
        })
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
