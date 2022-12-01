import { WEBHOOK_ACTION } from '../enums/webhookActions.enum'
import { IsEnum, IsString, IsNotEmpty } from 'class-validator'
import { PermissionContext } from '@tribeplatform/gql-client/types'

export class WebhookDTO {
  @IsEnum(WEBHOOK_ACTION)
  @IsNotEmpty()
  type: WEBHOOK_ACTION

  @IsString()
  @IsNotEmpty()
  networkId: string

  data: any

  settings: any

  context?: PermissionContext
  entityId?: string

  currentSettings?: [any]
}
