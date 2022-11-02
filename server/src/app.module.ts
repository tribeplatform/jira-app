import { Module, NestModule, RequestMethod, MiddlewareConsumer, Logger } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { ConfigService } from '@nestjs/config'
import { ConfigModule } from '@nestjs/config'
import configuration, { validationSchema } from './config/configuration'
import { HealthController } from './controllers/health.controller'
import { HealthService } from './services/health.service'
import { WebhookController } from './controllers/webhook.controller'
import { SignatureMiddleware } from './middlewares/signature.middleware'
import { WebhookService } from './services/webhook.service'
import { DatabaseConfig } from './interfaces/config.interface'
import { TribeClientService } from './services/tribe.service'
import { SettingsController } from './controllers/settings.controller'
import { SettingService } from './services/settings.service'
import { JwtModule } from '@nestjs/jwt'
import { JwtAuthStrategy } from './strategies/jwt.strategy'
import { AtlassianStrategy } from './strategies/atlassian.strategy'
import { Atlassian, AtlassianSchema } from './schemas/atlassian.schema'
import { HttpModule } from '@nestjs/axios'
import { LoggerModule } from '@tribeplatform/nest-logger'
import { AuthController } from './controllers/auth.controller'
import { AtlassianClientService } from './services/atlassian.service'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      envFilePath: ['.env'],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        ...configService.get<DatabaseConfig>('database'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get<string>('jwt.secret'),
          signOptions: {
            expiresIn: configService.get<string>('jwt.expiresIn'),
          },
        }
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: Atlassian.name, schema: AtlassianSchema }]),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    LoggerModule,
  ],
  controllers: [HealthController, AuthController, WebhookController, SettingsController],
  providers: [
    Logger,
    HealthService,
    WebhookService,
    TribeClientService,
    AtlassianClientService,
    SettingService,
    JwtAuthStrategy,
    AtlassianStrategy,
  ],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SignatureMiddleware).forRoutes({ path: '/api/webhook/*', method: RequestMethod.POST })
    consumer.apply(SignatureMiddleware).forRoutes({ path: '/api/settings/*', method: RequestMethod.POST })
  }
}
