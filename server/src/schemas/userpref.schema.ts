import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserPreferencesDocument = UserPreferences & Document

@Schema()
class IssueTemplate {
  @Prop({ required: false })
  resourceId: string

  @Prop({ required: false })
  projectId: string

  @Prop({ required: false })
  issueType: string
}

@Schema()
export class UserPreferences {
  @Prop({ required: true, unique: true })
  networkId: string

  @Prop({ required: true })
  memberId: string

  @Prop({ type: IssueTemplate, required: false })
  issueTemplate: IssueTemplate
}

export const UserPreferencesSchema = SchemaFactory.createForClass(UserPreferences)
