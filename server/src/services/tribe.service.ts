import { Injectable, Scope } from '@nestjs/common'
import { LoggerService } from '@tribeplatform/nest-logger'
import { ConfigService } from '@nestjs/config'
import { GlobalClient, TribeClient } from '@tribeplatform/gql-client'
import { SpaceMembershipStatus } from '@tribeplatform/gql-client/types'
import { AppConfig } from 'src/interfaces/config.interface'

@Injectable({ scope: Scope.REQUEST })
export class TribeClientService {
  globalClient: GlobalClient
  tribeClient: TribeClient
  networkId: string

  constructor(private readonly configService: ConfigService) {
    const { clientID: clientId, clientSecret, graphqlURL: graphqlUrl } = configService.get<AppConfig>('app')
    this.globalClient = new GlobalClient({
      clientId,
      clientSecret,
      graphqlUrl,
    })
  }
  public async setNetwork(networkId: string) {
    this.networkId = networkId
  }

  public async getClient(memberId: string = null) {
    let options: any = { networkId: this.networkId }
    if (this.tribeClient && !memberId) return this.tribeClient
    if (memberId) {
      options.memberId = memberId
      return await this.globalClient.getTribeClient(options)
    }
    LoggerService.log(options)
    this.tribeClient = await this.globalClient.getTribeClient(options)
    return this.tribeClient
  }

  public async getNetwork() {
    const client = await this.getClient()
    return client.network.get()
  }

  public async getMember(id: string) {
    const client = await this.getClient()
    return client.members.get({ id }, 'all')
  }
  public async getSpace(id: string) {
    const client = await this.getClient()
    return client.spaces.get({ id }, 'all')
  }
  public async getPost(id: string) {
    const client = await this.getClient()
    return client.posts.get({ id }, 'all')
  }
  public async isMember(memberId: string, spaceId: string) {
    const client = await this.getClient(memberId)
    const space = await client.spaces.get({ id: spaceId }, 'all')
    return space.authMemberProps.membershipStatus === SpaceMembershipStatus.joined
  }
  public async getAllMemberSpaces(id: string) {
    const client = await this.getClient(id)
    const spaces = []
    let hasNextPage = true,
      after = null
    while (hasNextPage) {
      const currentBatch = await client.spaceMembers.listSpaces({ memberId: id, limit: 100, after }, 'all')
      after = currentBatch.pageInfo.endCursor
      currentBatch?.edges?.forEach(spaceMember => spaces.push(spaceMember?.node?.space))
      hasNextPage = currentBatch.pageInfo.hasNextPage
    }
    return spaces
  }
}
