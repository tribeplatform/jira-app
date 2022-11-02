import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { ConfigService } from '@nestjs/config'
import { verifySignature } from 'src/utils/signature.utils'
import { LoggerService } from '@tribeplatform/nest-logger'

@Injectable()
export class SignatureMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService, private readonly loggerService: LoggerService) {
    this.loggerService.setContext(SignatureMiddleware.name)
  }

  use(req: Request, res: Response, next: NextFunction) {
    const timestamp = parseInt(req.header('x-tribe-request-timestamp'), 10)
    const signature = req.header('x-tribe-signature')
    const rawBody = req['rawBody']
    try {
      if (
        rawBody &&
        verifySignature({
          body: rawBody,
          timestamp,
          secret: this.configService.get<string>('app.signingSecret'),
          signature,
        })
      ) {
        return next()
      }
    } catch (err) {
      this.loggerService.error('Failed to verify signature', err)
    }

    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN)
  }
}
