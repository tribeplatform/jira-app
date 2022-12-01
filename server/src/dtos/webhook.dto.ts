import { WebhookType } from '../enums/webhook-type.enum'
import { IsEnum, IsString, IsNotEmpty } from 'class-validator'
import { PermissionContext } from '@tribeplatform/gql-client/types'

export class WebhookDTO {
  @IsEnum(WebhookType)
  @IsNotEmpty()
  type: WebhookType

  @IsString()
  @IsNotEmpty()
  networkId: string

  data: any

  settings: any

  context?: PermissionContext
  entityId?: string

  currentSettings?: [any]
}
