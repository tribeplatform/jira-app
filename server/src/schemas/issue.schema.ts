import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type IssueDocument = Issue & Document

@Schema()
export class Issue {
  @Prop({ required: true })
  networkId: string

  @Prop({ required: true })
  entityId: string

  @Prop({ required: true })
  issueId: string

  @Prop({ required: true })
  resourceId: string

  @Prop({ required: false })
  url: string
}

export const IssueSchema = SchemaFactory.createForClass(Issue)
