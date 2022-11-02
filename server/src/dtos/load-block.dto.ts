import { IsString, IsNotEmpty, IsObject } from 'class-validator'
import { Network } from '@tribeplatform/gql-client/types'
import { Type } from 'class-transformer'

export class LoadBlockDTO {
  @IsString()
  @IsNotEmpty()
  serverUrl: string

  @IsString()
  @IsNotEmpty()
  jwt: string

  @IsNotEmpty()
  network: Network
}
