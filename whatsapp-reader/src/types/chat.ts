export type AttachmentType =
  | 'image'
  | 'sticker'
  | 'audio'
  | 'video'
  | 'contact'
  | 'document'
  | 'unknown'

export interface Attachment {
  fileName: string
  originalText: string
  type: AttachmentType
  url?: string
  blob?: Blob
  mimeType?: string
  size?: number
  isMissing?: boolean
  contactData?: {
    name?: string
    phone?: string
    email?: string
    org?: string
    rawVcard?: string
  }
}

export interface ChatMessage {
  id: string
  rawDate: string
  rawTime: string
  timestamp: number
  dateGroup: string
  sender: string
  isSystem: boolean
  content: string
  attachment?: Attachment
  isProtagonist?: boolean
}

export interface ParticipantInfo {
  name: string
  color: string
  avatarBg: string
  messageCount: number
  firstSeen: string
  lastSeen: string
}

export interface ParsedChat {
  fileName: string
  title: string
  messages: ChatMessage[]
  participants: Map<string, ParticipantInfo>
  dateGroups: string[]
  stats: {
    totalMessages: number
    systemEvents: number
    mediaCount: number
    startDate: string
    endDate: string
  }
}

export interface ZipTxtFile {
  name: string
  relativePath: string
  size: number
  lineCount?: number
  sampleText?: string
}
