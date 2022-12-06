import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { Injectable } from '@nestjs/common'
// import { HubspotPassportDTO } from 'src/dtos/hubspot-passport.dto'
import { LoggerService } from '@tribeplatform/nest-logger'
import { SalesforcePassportAccessTokenDTO } from 'src/dtos/passport.dto'
const Strategy = require('passport-atlassian-oauth2')
const OAUTH_SCOPES = 'read:me read:jira-work write:jira-work offline_access'
@Injectable()
export class AtlassianStrategy extends PassportStrategy(Strategy, 'atlassian') {
  constructor(private readonly configService: ConfigService, private readonly loggerService: LoggerService) {
    super({
      clientID: configService.get('atlassian.clientId'),
      clientSecret: configService.get('atlassian.clientSecret'),
      callbackURL: `${configService.get('server.url')}/api/auth/callback`,
      scope: OAUTH_SCOPES,
      passReqToCallback: true,
    })
    this.loggerService.setContext(AtlassianStrategy.name)
  }

  authenticate(req, options) {
    options.state = req.query.state
    super.authenticate(req, options)
  }

  async validate(req: Request, accessToken: any, refreshToken: string, profile: any, done): Promise<any> {
    let buff = Buffer.from(String(req.query.state), 'base64')
    const state = JSON.parse(buff.toString('ascii')) as {
      n: string
      m: string
      r: string
    }
    this.loggerService.verbose(`profile: ${JSON.stringify(profile)}`)
    done(null, {
      networkId: state.n,
      memberId: state.m,
      accessToken,
      refreshToken,
      url: profile?.accessibleResources[0]?.url,
      id: profile?.accessibleResources[0]?.id,
    })
  }
}
