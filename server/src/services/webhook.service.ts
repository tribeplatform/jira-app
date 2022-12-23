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
import { CREATE_ISSUE_MODEAL, ISSUE_CREATED_MODAL, ISSUE_INFO_BLOCK } from 'src/templates/issues.block'
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
import { DynamicBlockKey } from 'src/enums/dynamic-block.enum'
import { COMPLETED_SETTINGS_BLOCK, EMPTY_SETTINGS_BLOCK } from 'src/templates/settings.block'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { CallbackId } from 'src/enums/callback.enum'
import { Issue } from 'src/schemas/issue.schema'
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
    switch (payload?.data?.dynamicBlockKey) {
      case DynamicBlockKey.Settings:
        return this.handleSettingsInteraction(payload)
      case DynamicBlockKey.RelatedIssuesInfo:
        return this.handleIssueInfoInteraction(payload)
    }
    return {
      type: WebhookType.Interaction,
      status: WebhookStatus.Succeeded,
      data: {
        interactions: [],
      },
    }
  }
  public async handleIssueInfoInteraction(webhook: InteractionWebhook): Promise<InteractionWebhookResponse> {
    this.loggerService.verbose(`Handling issue info: ${JSON.stringify(webhook)}`)
    try {
      const { entityId, networkId } = webhook
      const { interactionId, preview } = webhook?.data
      const settings = await this.settingsService.findSettings(networkId)
      this.atlassianClientService.setSettings(settings)
      let issues: Issue[] = []
      if (preview) {
        issues = [
          {
            entityId,
            networkId,
            issueId: '1000',
            url: settings.url,
            resourceId: '1234567',
          },
        ]
      } else {
        issues = await this.settingsService.findIssues(networkId, entityId)
        this.loggerService.verbose(`Issues in db for entity ${entityId}: ${JSON.stringify(issues)}`)

        issues = await this.atlassianClientService.getIssues(
          issues.map(issue => ({ id: issue.issueId, resourceId: issue.resourceId })),
        )
        this.loggerService.verbose(`Issues from Jira ${JSON.stringify(issues)}`)
        issues = (issues as any[]).map(issue => ({
          url: `${settings?.url}/browse/${issue?.key}`,
          issueId: issue?.id,
          summary: issue?.fields?.summary,
          key: issue?.key,
        })) as any
      }
      this.loggerService.verbose(`Issues ${JSON.stringify(issues)}`)
      const interactions: Interaction[] = []
      if (issues.length) {
        const convertor = new LiquidConvertor(ISSUE_INFO_BLOCK)
        const slate = await convertor.toSlate({
          variables: {
            issues,
          },
        })
        const issueModalInteraction: ShowInteraction = {
          type: InteractionType.Show,
          slate,
          id: interactionId,
        }
        interactions.push(issueModalInteraction)
      }
      return {
        type: WebhookType.Interaction,
        status: WebhookStatus.Succeeded,
        data: {
          interactions,
        },
      }
    } catch (err) {
      this.loggerService.error(err)
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
    const connectUrl = `${this.configService.get('server.url')}/api/auth?jwt=${jwt}&redirect=https://${network?.domain
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
        const issue = await this.atlassianClientService.createIssue(resourceId, data)
        this.loggerService.verbose(`Issue created: ${JSON.stringify(issue)}`)
        const createdIssue = await this.settingsService.createIssue({
          networkId,
          url: issue.self,
          issueId: issue.id,
          entityId,
          resourceId,
        })
        // const convertor = new LiquidConvertor(ISSUE_CREATED_MODAL)
        // const slate = await convertor.toSlate({
        //   variables: {
        //     issue: {
        //       url: issue.self,
        //       key: issue.key,
        //     },
        //   },
        // })
        await this.settingsService.saveUserPreferences(networkId, webhook.data.actorId, {
          networkId,
          memberId: webhook.data.actorId,
          issueTemplate: {
            resourceId,
            projectId: inputs.projectId as string,
            issueType: inputs.issueType as string,
          },
        })
        // const showSuccessModal: ShowInteraction = {
        //   id: interactionId,
        //   type: InteractionType.Show,
        //   slate,
        // }
        const openToastInteraction: OpenToastInteraction = {
          type: InteractionType.OpenToast,
          id: randomUUID(),
          props: {
            title: 'Issue created',
            status: ToastStatus.Success,
            description: 'Issue has been created successfully',
            link: {
              href: createdIssue.url,
              text: 'open ticket',
              enableCopy: true,
            },
          },
        }
        return {
          type: WebhookType.Interaction,
          status: WebhookStatus.Succeeded,
          data: {
            interactions: [openToastInteraction],
          },
        }
      } catch (err) {
        this.loggerService.error(err)
        let description = err.message
        if (err?.code === 'ERR_BAD_REQUEST') description = 'We do not support this issue type at this moment.'
        return this.showOpenToastInteraction({
          title: 'Something went wrong',
          description,
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
      if (availableResource?.length === 1) {
        params.resourceId = availableResource[0].id
      }
      const projects = await this.atlassianClientService.getProjects(availableResource[0].id)
      params.projects = JSON.stringify(projects.map(project => ({ value: project.id, text: project.name })))
      if (projects?.length === 1) {
        params.projectId = projects[0].id
      }
      const issueTypes = await this.atlassianClientService.getIssueTypes(
        availableResource[0].id,
        projects[0].id,
      )
      if (issueTypes?.length === 1) {
        params.issueType = issueTypes[0].id
      }
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
    } catch (err) {
      this.loggerService.error(err)
      return this.showOpenToastInteraction({
        title: 'Something went wrong',
        description: err.message,
        status: ToastStatus.Error,
      })
    }
    try {
      const userPreferences = await this.settingsService.findUserPreferences(networkId, webhook.data.actorId)
      if (userPreferences) {
        params.resourceId = userPreferences?.issueTemplate?.resourceId || params.resourceId
        params.projectId = userPreferences?.issueTemplate?.projectId || params.projctId
        params.issueType = userPreferences?.issueTemplate?.issueType || params.projctId
      }
    } catch (err) { }
    this.loggerService.verbose(`Params`, params)
    const convertor = new LiquidConvertor(CREATE_ISSUE_MODEAL)
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
