export interface EventInfo {
  attending: boolean
  dateTime: Date | null
  location: string | null
  calendarLink: string | null
  recentAttenders: string[]
  numberOfAttenders: number
}
