import { IsString, IsNumberString, IsNotEmpty, IsObject, IsNumber } from 'class-validator'
import { Type } from 'class-transformer'
class Params {
  @IsString()
  @IsNotEmpty()
  access_token: string

  @IsString()
  signature: string

  @IsString()
  scope: string

  @IsString()
  @IsNotEmpty()
  instance_url: string

  @IsString()
  id: string

  @IsNotEmpty()
  token_type: string

  @IsNumberString()
  issued_at: number
}
export class SalesforcePassportAccessTokenDTO {
  @Type(() => Params)
  @IsObject()
  @IsNotEmpty()
  params: Params
}
