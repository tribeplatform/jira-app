import { WEBHOOK_ACTION } from '../enums/webhookActions.enum'
import { IsEnum, IsString, IsNotEmpty } from 'class-validator'

export class WebhookDTO {
  @IsEnum(WEBHOOK_ACTION)
  @IsNotEmpty()
  type: WEBHOOK_ACTION

  @IsString()
  @IsNotEmpty()
  networkId: string

  data: any

  settings: any
}
