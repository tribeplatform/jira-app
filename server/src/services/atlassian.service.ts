import { HttpService } from '@nestjs/axios'
import { Injectable, RequestMethod, Scope } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '@tribeplatform/nest-logger'
import { JwtService } from '@nestjs/jwt'
import { Atlassian } from 'src/schemas/atlassian.schema'
import { SettingService } from './settings.service'

@Injectable({ scope: Scope.TRANSIENT })
export class AtlassianClientService {
  private networkId: string
  private settings: Atlassian
  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly loggerService: LoggerService,
    private readonly settingsService: SettingService,
    private readonly jwtService: JwtService,
  ) {
    this.loggerService.setContext(AtlassianClientService.name)
  }

  public setNetwork(networkId: string) {
    this.networkId = networkId
    this.settings = null
  }

  public setSettings(settings: Atlassian) {
    this.networkId = settings.networkId
    this.settings = settings
  }

  private async getSettings() {
    if (!this.networkId) {
      throw Error('Network ID is not set')
    }
    if (!this.settings) {
      this.settings = await this.settingsService.findSettings(this.networkId)
    }
    return this.settings
  }
  private async getAccessToken() {
    const settings = await this.getSettings()
    if (!settings?.refreshToken) {
      throw Error('Refresh token is not set')
    }

    if (settings.accessToken) {
      const decoded = this.jwtService.decode(settings.accessToken)
      if (decoded && decoded['exp'] > Date.now() / 1000) {
        return settings.accessToken
      }
    }

    const clientID = this.configService.get('atlassian.clientId')
    const clientSecret = this.configService.get('atlassian.clientSecret')
    const data = await this.httpService
      .post('https://auth.atlassian.com/oauth/token', {
        grant_type: 'refresh_token',
        client_id: clientID,
        client_secret: clientSecret,
        refresh_token: settings.refreshToken,
      })
      .toPromise()
    const { access_token, refresh_token } = data?.data
    this.settings = await this.settingsService.updateSettings(this.networkId, {
      accessToken: access_token,
      refreshToken: refresh_token,
    })
    return access_token
  }
  private async request(
    method: string,
    url: string,
    data?: any,
    options?: {
      baseURL?: string
      cloudId?: string
    },
  ) {
    const accessToken = await this.getAccessToken()
    this.loggerService.verbose(`accessToken: ${accessToken} url: `)
    const result = await this.httpService
      .request({
        url: `${options.baseURL || `https://api.atlassian.com/ex/jira/${options?.cloudId}/rest/api/3`}${url}`,
        method,
        data,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .toPromise()
    return result.data
  }
  public async getAccessibleResources() {
    const result = await this.request('GET', '/accessible-resources', null, {
      baseURL: 'https://api.atlassian.com/oauth/token',
    })
    return result
  }
  public async getProjects(cloudId: string) {
    const result = await this.request('GET', '/project/search', null, {
      cloudId,
    })
    return result?.values || []
  }

  public async getIssueTypes(cloudId: string, projectId: string = null) {
    let url = '/issuetype'
    if (projectId) {
      url += `/project?projectId=${projectId}`
    }
    const result = await this.request('GET', url, null, {
      cloudId,
    })
    return result
  }

  public async createIssue(cloudId: string, data: any) {
    const result = await this.request('POST', '/issue', data, {
      cloudId,
    })
    return result
  }

  public async getIssue(cloudId: string, id: string) {
    const result = await this.request('GET', `/issue/${id}`, null, {
      cloudId,
    })
    return result
  }
  public async getIssues(issues: { resourceId: string; id: string }[] = []) {
    this.loggerService.verbose(`issues: ${JSON.stringify(issues)}`)
    return Promise.all(issues.map(issue => this.getIssue(issue.resourceId, issue.id)))
  }
}
