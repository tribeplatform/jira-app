import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type AtlassianDocument = Atlassian & Document

@Schema()
export class Atlassian {
  @Prop({ required: true, unique: true })
  networkId: string

  @Prop({ required: true })
  memberId: string

  @Prop({ required: true })
  accessToken: string

  @Prop({ required: true })
  refreshToken: string

  @Prop({ required: true })
  url: string
}

export const AtlassianSchema = SchemaFactory.createForClass(Atlassian)
