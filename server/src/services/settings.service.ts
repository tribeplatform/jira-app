import { Injectable, Scope } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { LiquidConvertor } from '@tribeplatform/slate-kit/convertors'
import { Model } from 'mongoose'
import { LoadBlockDTO } from 'src/dtos/load-block.dto'
import { WebhookDTO } from 'src/dtos/webhook.dto'
import { Atlassian } from 'src/schemas/atlassian.schema'
import { COMPLETED_SETTINGS_BLOCK, EMPTY_SETTINGS_BLOCK } from 'src/templates/settings.block'
import { concat, fromPairs } from 'lodash'
import { LoggerService } from '@tribeplatform/nest-logger'
import { AtlassianClientService } from './atlassian.service'
import { CallbackId } from 'src/enums/callback.enum'
import { LoadBlockWebhookResponse, Webhook, WebhookResponse } from 'src/interfaces'
import { ErrorCode, WebhookStatus, WebhookType } from 'src/enums'
export const DEFAULT_FIELDS = [
  { name: 'id', label: 'Member ID', type: 'string' },
  { name: 'firstname', label: 'First name', type: 'string' },
  { name: 'lastname', label: 'Last name', type: 'string' },
  { name: 'tagline', label: 'Tagline', type: 'string' },
  { name: 'createdAt', label: 'Membership date', type: 'date' },
  { name: 'url', label: 'Profile URL', type: 'string' },
]

export const COMPUTED_FIELDS = [{ name: 'spaces', label: 'Spaces' }]

export const DEFAULT_FIELDS_KEYS = DEFAULT_FIELDS.map(field => field.name)
export const BASIC_FIELDS_KEYS = concat(DEFAULT_FIELDS, COMPUTED_FIELDS).map(field => field.name)
export const BASIC_FIELDS_MAPPING = fromPairs(
  concat(DEFAULT_FIELDS, COMPUTED_FIELDS).map((field: { name: string; label: string }) => [
    field.name,
    field.label,
  ]),
)

@Injectable({ scope: Scope.REQUEST })
export class SettingService {
  constructor(
    @InjectModel(Atlassian.name) private atlassianModel: Model<Atlassian>,
    private readonly loggerService: LoggerService,
    private readonly atlassianClientService: AtlassianClientService,
  ) {
    this.loggerService.setContext('SettingService')
  }
  async loadBlock(
    input: LoadBlockDTO,
    currentSettings: Atlassian = null,
    options: {
      webhookType?: WebhookType.LoadBlock | WebhookType.Callback
      status?: WebhookStatus.Succeeded | WebhookStatus.Failed
      template?: string
    } = {
      webhookType: WebhookType.LoadBlock,
      status: WebhookStatus.Succeeded,
    },
  ): Promise<LoadBlockWebhookResponse> {
    const connectUrl = `${input.serverUrl}/api/auth?jwt=${input.jwt}&redirect=https://${input?.network?.domain}/manage/apps/salesforce`
    const settings = currentSettings || (await this.findSettings(input.network.id))
    let template: string = EMPTY_SETTINGS_BLOCK
    let extraParams: any = {}
    if (settings?.refreshToken) {
      template = COMPLETED_SETTINGS_BLOCK
    }
    const convertor = new LiquidConvertor(template)
    const slate = await convertor.toSlate({
      variables: {
        connectUrl,
        network: input?.network,
        ...extraParams,
        settings,
        settingsString: JSON.stringify(settings),
      },
    })
    if (options.status == WebhookStatus.Failed) {
      return {
        type: options.webhookType,
        status: WebhookStatus.Failed,
        errorCode: ErrorCode.BackendError,
        errorMessage: 'Something went wrong',
      }
    }
    return {
      type: options.webhookType || WebhookType.LoadBlock,
      status: WebhookStatus.Succeeded,
      data: {
        slate,
      },
    }
  }

  async handleCallback(input: LoadBlockDTO): Promise<LoadBlockWebhookResponse> {
    let settings: Atlassian = await this.findSettings(input.network.id)
    this.loggerService.verbose(`settings ${JSON.stringify(settings)}`)
    return this.loadBlock(input)
  }

  async handleInteraction(payload: WebhookDTO): Promise<WebhookResponse> {
    return {
      type: payload.type,
      status: WebhookStatus.Succeeded,
      data: payload.data,
    }
  }
  async getShortcutStates(payload: WebhookDTO): Promise<WebhookResponse> {
    const { entities } = payload.data

    return {
      type: payload.type,
      status: WebhookStatus.Succeeded,
      data: entities,
    }
  }

  public async findSettings(networkId: string): Promise<Atlassian> {
    return this.atlassianModel.findOne({ networkId }).lean()
  }
  public async uninstall(networkId: string) {
    await this.atlassianModel.findOneAndRemove({ networkId })
  }
  public async saveSettings(networkId: string, settings: Atlassian) {
    return this.atlassianModel.findOneAndUpdate({ networkId }, settings, { upsert: true, new: true })
  }
}
