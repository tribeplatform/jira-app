import * as Joi from '@hapi/joi'
import { LoggerLevel, ServiceConfig, PlaybackChannelType } from 'src/interfaces/config.interface'

export default (): ServiceConfig => ({
  logger: {
    level: process.env.LOGGER_LEVEL as LoggerLevel,
  },
  server: {
    port: parseInt(process.env.PORT, 10),
    url: process.env.SERVER_URL,
  },
  app: {
    graphqlURL: process.env.GRAPHQL_URL,
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    signingSecret: process.env.SIGNING_SECRET,
  },
  jwt: {
    secret: process.env.CLIENT_SECRET,
    expiresIn: '1d',
  },
  database: {
    uri: process.env.DB_HOST,
  },
  atlassian: {
    clientId: process.env.ATLASSIAN_CLIENT_ID,
    clientSecret: process.env.ATLASSIAN_CLIENT_SECRET,
  },
})

export const validationSchema = Joi.object({
  LOGGER_LEVEL: Joi.string().default('info'),
  PORT: Joi.number().default(3000),
  SERVER_URL: Joi.string().required(),
  GRAPHQL_URL: Joi.string().required(),
  CLIENT_ID: Joi.string().required(),
  CLIENT_SECRET: Joi.string().required(),
  SIGNING_SECRET: Joi.string().required(),
  ATLASSIAN_CLIENT_ID: Joi.string().required(),
  ATLASSIAN_CLIENT_SECRET: Joi.string().required(),
  DB_HOST: Joi.string().required(),
})
