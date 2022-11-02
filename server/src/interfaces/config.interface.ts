export declare type LoggerLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug'

export declare type PlaybackChannelType = 'BASIC' | 'Standard'

interface LoggerConfig {
  level: LoggerLevel
}

interface ServerConfig {
  port: number
  url: string
}

export interface AppConfig {
  graphqlURL: string
  clientID: string
  clientSecret: string
  signingSecret: string
}

export interface DatabaseConfig {
  uri: string
}

export interface JwtConfig {
  secret: string
  expiresIn: string
}
export interface AtlassianConfig {
  clientId: string
  clientSecret: string
}

export interface ServiceConfig {
  logger: LoggerConfig
  server: ServerConfig
  app: AppConfig
  database: DatabaseConfig
  jwt: JwtConfig
  atlassian: AtlassianConfig
}
