import * as bodyParser from 'body-parser'
import './utils/tracer'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { ConfigService } from '@nestjs/config'
import { LoggerService } from '@tribeplatform/nest-logger'

const rawBodyBuffer = (req, res, buffer: Buffer, encoding) => {
  if (!req.headers['x-tribe-signature']) {
    return
  }

  if (buffer && buffer.length) {
    req.rawBody = buffer.toString(encoding || 'utf8')
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    logger: new LoggerService(),
  })
  const logger = await app.resolve(LoggerService)
  app.useLogger(logger)

  app.use(bodyParser.urlencoded({ verify: rawBodyBuffer, extended: true }))
  app.use(bodyParser.json({ verify: rawBodyBuffer }))

  app.useGlobalPipes(new ValidationPipe())

  const config: ConfigService = app.get(ConfigService)
  const port = config.get<number>('server.port')
  await app.listen(port)

  logger.log(`Application is listening on ${port}`, 'App')
}

bootstrap()
