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
import {
  CloseInteraction,
  Interaction,
  InteractionWebhook,
  InteractionWebhookResponse,
  OpenModalInteraction,
  OpenToastInteraction,
  ShowInteraction,
  SubscriptionWebhook,
  TestWebhook,
  TestWebhookResponse,
  Webhook,
  WebhookResponse,
} from 'src/interfaces'
import { ErrorCode, InteractionType, WebhookStatus, WebhookType } from 'src/enums'
import { Network, ToastStatus } from '@tribeplatform/gql-client/types'
import { randomUUID } from 'crypto'
import { dynamicBlockKey } from 'src/enums/dynamic-block.enum'
import { COMPLETED_SETTINGS_BLOCK, EMPTY_SETTINGS_BLOCK } from 'src/templates/settings.block'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { CallbackId } from 'src/enums/callback.enum'
@Injectable({ scope: Scope.REQUEST })
export class WebhookService {
  constructor(
    private readonly bettermodeService: TribeClientService,
    private readonly settingsService: SettingService,
    private readonly loggerService: LoggerService,
    private readonly atlassianClientService: AtlassianClientService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectModel(Atlassian.name) private atlassianModel: Model<Atlassian>,
  ) {
    this.loggerService.setContext(WebhookService.name)
  }

  public passChallenge(webhook: TestWebhook): TestWebhookResponse {
    return {
      type: WebhookType.Test,
      status: WebhookStatus.Succeeded,
      data: {
        challenge: webhook?.data?.challenge,
      },
    }
  }
  public async handleInteraction(payload: InteractionWebhook): Promise<InteractionWebhookResponse> {
    this.loggerService.verbose(
      `Handling interaction ${payload?.data?.interactionId}: ${JSON.stringify(payload)}`,
    )
    if (payload?.data?.shortcutKey) {
      return this.handleShortcut(payload)
    }
    if (payload?.data?.dynamicBlockKey === dynamicBlockKey.Settings) {
      return this.handleSettingsInteraction(payload)
    }
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Succeeded,
      data: {
        interactions: [],
      },
    }
  }
  public async handleSettingsInteraction(webhook: InteractionWebhook): Promise<InteractionWebhookResponse> {
    let settings: Atlassian
    const {
      networkId,
      entityId,
      data: { actorId, callbackId, interactionId },
    } = webhook
    let network: Network
    try {
      this.bettermodeService.setNetwork(networkId)
      network = await this.bettermodeService.getNetwork()
    } catch (err) {
      this.loggerService.error(err)
      const openToastInteraction: OpenToastInteraction = {
        type: InteractionType.OpenToast,
        id: randomUUID(),
        props: {
          title: 'Error',
          status: ToastStatus.Error,
          description: `Something went wrong. Please try again later.`,
        },
      }
      return {
        type: WebhookType.Interaction,
        status: WebhookStatus.Succeeded,
        data: {
          interactions: [openToastInteraction],
        },
      }
    }
    const jwt = this.jwtService.sign({
      sub: network.id,
      usr: actorId,
    })
    const connectUrl = `${this.configService.get('server.url')}/api/auth?jwt=${jwt}&redirect=https://${
      network?.domain
    }/manage/apps/jira`
    try {
      settings = await this.settingsService.findSettings(networkId)
      // this.loggerService.verbose(`Settings: ${JSON.stringify(settings)}`)
    } catch (err) {
      this.loggerService.error(err)
      const openToastInteraction: OpenToastInteraction = {
        type: InteractionType.OpenToast,
        id: interactionId,
        props: {
          title: 'Error',
          status: ToastStatus.Error,
          description: `Something went wrong. Please try again later.`,
        },
      }
      return {
        type: WebhookType.Interaction,
        status: WebhookStatus.Succeeded,
        data: {
          interactions: [openToastInteraction],
        },
      }
    }
    if (!settings || !settings?.refreshToken) {
      const convertor = new LiquidConvertor(EMPTY_SETTINGS_BLOCK)
      const slate = await convertor.toSlate({
        variables: {
          connectUrl,
          network,
        },
      })
      const showEmptySettingInteraction: ShowInteraction = {
        type: InteractionType.Show,
        id: interactionId,
        slate,
      }
      return {
        type: WebhookType.Interaction,
        status: WebhookStatus.Succeeded,
        data: {
          interactions: [showEmptySettingInteraction],
        },
      }
    }
    if (callbackId) {
    }
    if (settings?.refreshToken) {
      const convertor = new LiquidConvertor(COMPLETED_SETTINGS_BLOCK)
      const slate = await convertor.toSlate({
        variables: {
          connectUrl,
          network,
          settings,
          settingsString: JSON.stringify(settings),
        },
      })
      const showEmptySettingInteraction: ShowInteraction = {
        type: InteractionType.Show,
        id: interactionId,
        slate,
      }
      return {
        type: WebhookType.Interaction,
        status: WebhookStatus.Succeeded,
        data: {
          interactions: [showEmptySettingInteraction],
        },
      }
    }
  }
  public async handleShortcut(payload: InteractionWebhook): Promise<InteractionWebhookResponse> {
    this.loggerService.verbose(`Handling shortcut ${payload?.data?.shortcutKey}: ${JSON.stringify(payload)}`)
    const { interactionId } = payload?.data
    let settings: Atlassian
    try {
      settings = await this.settingsService.findSettings(payload.networkId)
      // this.loggerService.verbose(`Settings: ${JSON.stringify(settings)}`)
    } catch (err) {
      this.loggerService.error(err)
      const openToastInteraction: OpenToastInteraction = {
        type: InteractionType.OpenToast,
        id: randomUUID(),
        props: {
          title: 'Error',
          status: ToastStatus.Error,
          description: `Something went wrong. Please try again later.`,
        },
      }
      return {
        type: WebhookType.Interaction,
        status: WebhookStatus.Succeeded,
        data: {
          interactions: [openToastInteraction],
        },
      }
    }

    if (!settings || !settings?.refreshToken) {
      const openToastInteraction: OpenToastInteraction = {
        type: InteractionType.OpenToast,
        id: randomUUID(),
        props: {
          title: 'Action required',
          status: ToastStatus.Warning,
          description: `Jira app is not configured. Please configure it first.`,
        },
      }
      return {
        type: WebhookType.Interaction,
        status: WebhookStatus.Succeeded,
        data: {
          interactions: [openToastInteraction],
        },
      }
    }
    switch (payload?.data?.shortcutKey) {
      case ShortcutKey.CreateIssue:
        return this.showCreateIssueModal(payload, settings)
    }
    const openToastInteraction: OpenToastInteraction = {
      type: InteractionType.OpenToast,
      id: randomUUID(),
      props: {
        title: 'Unknown operation',
        status: ToastStatus.Info,
        description: `Operation is not defined.`,
      },
    }
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Succeeded,
      data: {
        interactions: [openToastInteraction],
      },
    }
  }
  public showOpenToastInteraction({
    title,
    description,
    status,
  }: {
    title: string
    description: string
    status: ToastStatus
  }): InteractionWebhookResponse {
    const openToastInteraction: OpenToastInteraction = {
      type: InteractionType.OpenToast,
      id: randomUUID(),
      props: {
        title,
        status,
        description,
      },
    }
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Succeeded,
      data: {
        interactions: [openToastInteraction],
      },
    }
  }
  public async showCreateIssueModal(
    webhook: InteractionWebhook,
    settings: Atlassian,
  ): Promise<InteractionWebhookResponse> {
    const convertor = new LiquidConvertor(CREATE_ISSUE_MODEAL)
    const { interactionId, callbackId, inputs } = webhook?.data
    const { entityId, networkId } = webhook
    this.atlassianClientService.setSettings(settings)
    this.bettermodeService.setNetwork(networkId)
    let params: any = {}
    if (callbackId === CallbackId.CreateIssueFormSubmit) {
      const { resourceId } = inputs as {
        resourceId: string
        projectId: string
        issueType: string
        summary: string
        description?: string
      }
      try {
        const data: any = {
          fields: {
            project: {
              id: inputs.projectId,
            },
            issuetype: {
              id: inputs.issueType,
            },
            summary: inputs.summary,
          },
        }
        if (inputs.description) {
          data.fields.description = {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: inputs.description,
                  },
                ],
              },
            ],
          }
        }
        this.loggerService.log(`Creating issue: ${JSON.stringify(data)}`)
        const issue = await this.atlassianClientService.createIssue(resourceId, data)
        this.loggerService.verbose(`Issue created: ${JSON.stringify(issue)}`)
        await this.settingsService.createIssue({
          networkId,
          url: issue.self,
          issueId: issue.id,
          entityId,
        })
        const closeInteraction: CloseInteraction = {
          type: InteractionType.Close,
          id: interactionId,
        }
        const openToastInteraction: OpenToastInteraction = {
          type: InteractionType.OpenToast,
          id: randomUUID(),
          props: {
            title: 'Issue created',
            status: ToastStatus.Success,
            description: 'Issue has been created successfully',
          },
        }
        return {
          type: WebhookType.Interaction,
          status: WebhookStatus.Succeeded,
          data: {
            interactions: [closeInteraction, openToastInteraction],
          },
        }
      } catch (err) {
        this.loggerService.error(err)
        return this.showOpenToastInteraction({
          title: 'Something went wrong',
          description: err.message,
          status: ToastStatus.Error,
        })
      }
    }

    try {
      const availableResource = await this.atlassianClientService.getAccessibleResources()
      params.resources = JSON.stringify(
        availableResource.map(resource => ({ value: resource.id, text: resource.url })),
      )

      // comment this if you want to get projects and issue types for the first resource
      const projects = await this.atlassianClientService.getProjects(availableResource[0].id)
      params.projects = JSON.stringify(projects.map(project => ({ value: project.id, text: project.name })))
      const issueTypes = await this.atlassianClientService.getIssueTypes(
        availableResource[0].id,
        projects[0].id,
      )
      params.issueTypes = JSON.stringify(
        issueTypes.map(project => ({ value: project.id, text: project.name })),
      )
      const post = await this.bettermodeService.getPost(entityId)
      params.post = {
        title: post?.title,
        shortContent: (post?.shortContent ? post?.shortContent + '\n\n' : '') + post.url,
        url: post?.url,
      }

      // if (inputs.resourceId) {
      //   const projects = await this.atlassianClientService.getProjects(inputs['resourceId'] as string)
      //   params.projects = JSON.stringify(projects.map(project => ({ value: project.id, text: project.name })))
      // }
      // if (inputs.projctId) {
      //   const issueTypes = await this.atlassianClientService.getIssueTypes(
      //     inputs['resourceId'] as string,
      //     inputs['projctId'] as string,
      //   )
      //   params.issueTypes = JSON.stringify(
      //     issueTypes.map(project => ({ value: project.id, text: project.name })),
      //   )
      // }
      // if (inputs.issueType) {
      //   const post = await this.bettermodeService.getPost(entityId)
      //   params.post = {
      //     title: post?.title,
      //     shortContent: (post?.shortContent ? post?.shortContent + '\n\n' : '') + post.url,
      //     url: post?.url,
      //   }
      // }
      this.loggerService.verbose(`Params`, params)
    } catch (err) {
      this.loggerService.error(err)
      return this.showOpenToastInteraction({
        title: 'Something went wrong',
        description: err.message,
        status: ToastStatus.Error,
      })
    }
    const slate = await convertor.toSlate({
      variables: {
        ...params,
      },
    })
    const issueModalInteraction: OpenModalInteraction = {
      type: InteractionType.OpenModal,
      slate,
      id: 'show-create-issue-modal',
      props: {
        title: 'Create Issue',
        size: 'md',
      },
    }
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Succeeded,
      data: {
        interactions: [issueModalInteraction],
      },
    }
  }
  public async handleSubscription(webhook: SubscriptionWebhook): Promise<WebhookResponse> {
    let settings: Atlassian
    try {
      settings = await this.settingsService.findSettings(webhook.networkId)
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
          type: WebhookType.Subscription,
          status: WebhookStatus.Succeeded,
          data: {},
        })
      }
    } catch (err) {
      this.loggerService.error(err)
    }

    return {
      type: WebhookType.Subscription,
      status: WebhookStatus.Succeeded,
      data: {},
    }
  }
}
