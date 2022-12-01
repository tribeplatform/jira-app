import { Injectable, Scope } from '@nestjs/common'
import { WebhookDTO } from 'src/dtos/webhook.dto'
// import { WebhookResponseStatus } from 'src/enums/response.enum'
// import { WEBHOOK_ACTION } from 'src/enums/webhookActions.enum'
// import { WebhookResponse } from 'src/interfaces/webhook.interface'
import { SettingService } from './settings.service'
import { TribeClientService } from './tribe.service'
import { LoggerService } from '@tribeplatform/nest-logger'
import { AtlassianClientService } from './atlassian.service'
import { Atlassian } from 'src/schemas/atlassian.schema'
import { Model } from 'mongoose'
import { InjectModel } from '@nestjs/mongoose'
import { ShortcutKey } from 'src/enums/shortcut.enum'
import { LiquidConvertor } from '@tribeplatform/slate-kit/convertors'
import { CREATE_ISSUE_MODEAL } from 'src/templates/issues.block'
import { WebhookResponse } from 'src/interfaces'
import { ErrorCode, WebhookStatus, WebhookType } from 'src/enums'
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
      type: WebhookType.Test,
      status: WebhookStatus.Succeeded,
      data: {
        challenge: tribePayload?.data?.challenge,
      },
    }
  }
  public async handleInteraction(payload: WebhookDTO): Promise<WebhookResponse> {
    this.loggerService.verbose(
      `Handling interaction ${payload?.data?.interactionId}: ${JSON.stringify(payload)}`,
    )
    if (payload?.data?.shortcutKey) {
      return this.handleShortcut(payload)
    }
    return this.settingsService.handleInteraction(payload)
  }

  public async handleShortcut(payload: WebhookDTO): Promise<WebhookResponse> {
    this.loggerService.verbose(`Handling shortcut ${payload?.data?.shortcutKey}: ${JSON.stringify(payload)}`)
    let settings: Atlassian
    try {
      settings = await this.settingsService.findSettings(payload.networkId)
    } catch (err) {
      this.loggerService.error(err)
      return {
        type: WebhookType.Subscription,
        status: WebhookStatus.Failed,
        errorCode: ErrorCode.BackendError,
        errorMessage: 'An error occurred while fetching settings',
      }
    }
    try {
      if (!settings || !settings.refreshToken) {
        return Promise.resolve({
          type: payload.type,
          status: WebhookStatus.Succeeded,
          data: payload.data,
        })
      }
    } catch (err) {
      this.loggerService.error(err)
    }
    switch (payload?.data?.shortcutKey) {
      case ShortcutKey.CreateIssue:
        return this.showCreateIssueModal(payload, settings)
    }

    return {
      type: payload.type,
      status: WebhookStatus.Succeeded,
      data: payload.data,
    }
  }
  public async showCreateIssueModal(payload: WebhookDTO, settings: Atlassian): Promise<WebhookResponse> {
    const convertor = new LiquidConvertor(CREATE_ISSUE_MODEAL)
    const slate = await convertor.toSlate({
      variables: {
        settings,
        settingsString: JSON.stringify(settings),
      },
    })
    return {
      type: payload.type,
      status: WebhookStatus.Succeeded,
      data: payload.data,
    }
  }
  public async handleSubscription(payload: WebhookDTO): Promise<WebhookResponse> {
    let settings: Atlassian
    try {
      settings = await this.settingsService.findSettings(payload.networkId)
    } catch (err) {
      this.loggerService.error(err)
      return {
        type: WebhookType.Subscription,
        status: WebhookStatus.Failed,
        errorCode: ErrorCode.BackendError,
        errorMessage: 'An error occurred while fetching settings',
      }
    }
    try {
      if (!settings || !settings.refreshToken) {
        return Promise.resolve({
          type: payload.type,
          status: WebhookStatus.Succeeded,
          data: payload.data,
        })
      }
    } catch (err) {
      this.loggerService.error(err)
    }

    return {
      type: payload.type,
      status: WebhookStatus.Succeeded,
      data: payload.data,
    }
  }
}
