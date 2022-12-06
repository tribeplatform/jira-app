import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { AtlassianAuthGuard } from 'src/guards/atlassian.guard'
import { JwtAuthGuard } from 'src/guards/jwt.guard'
import { SettingService } from 'src/services/settings.service'
import { LoggerService } from '@tribeplatform/nest-logger'

@Controller('/api/auth')
export class AuthController {
  constructor(
    private readonly settingService: SettingService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext(AuthController.name)
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async auth(@Req() req: any, @Res() res: Response) {
    this.loggerService.verbose(
      `Authentication route called with ${JSON.stringify({
        n: req.user.networkId,
        m: req.user.memberId,
        r: req.query.redirect,
      })}`,
    )
    const state = Buffer.from(
      JSON.stringify({ n: req.user.networkId, m: req.user.memberId, r: req.query.redirect }),
      'ascii',
    ).toString('base64')
    return res.redirect(`/api/auth/callback?state=${state}`)
  }

  @Get('/callback')
  @UseGuards(AtlassianAuthGuard)
  async callback(@Req() req, @Res() res: Response) {
    let buff = Buffer.from(String(req.query.state), 'base64')
    this.loggerService.verbose(
      JSON.stringify({
        networkId: req?.user.networkId,
        memberId: req?.user.memberId,
        accessToken: req?.user?.accessToken,
        refreshToken: req?.user?.refreshToken,
        profile: req?.user.profile,
        id: req?.user?.id,
      }),
    )
    this.settingService.saveSettings(req?.user.networkId, {
      networkId: req?.user.networkId,
      memberId: req?.user.memberId,
      accessToken: req?.user?.accessToken,
      url: req?.user?.url,
      refreshToken: req?.user?.refreshToken,
      cloudId: req?.user?.id,
    })
    const { r: redirect } = JSON.parse(buff.toString('ascii')) as {
      r: string
    }
    res.redirect(redirect)
  }
}
