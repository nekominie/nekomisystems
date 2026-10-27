import type {
  ChatMessage,
  ParsedChat,
  ParticipantInfo,
  Attachment,
  AttachmentType,
} from '../types/chat'
import { getParticipantColor } from './colors'

/**
 * Regex for matching WhatsApp timestamp line prefix.
 * Supports:
 * - "7/27/19, 8:33 PM - ..."
 * - "27/07/2019, 20:33 - ..."
 * - "27/7/19, 8:33 p. m. - ..."
 * - "[7/27/19, 8:33:15 PM] ..."
 * - "[27/07/2019, 20:33:15] ..."
 */
const DATE_LINE_REGEX =
  /^[\u200E\u200F\uFEFF]?\[?(\d{1,4}[/.\-]\d{1,2}[/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202F\u00A0]*(?:[AaPp]\.?[Mm]\.?|am|pm|AM|PM))?)\]?(?:\s*-\s*|\s+)(.*)$/

const SENDER_MESSAGE_REGEX = /^([^:\n\r]+?):\s*([\s\S]*)$/

const ATTACHMENT_LINE_REGEX =
  /^(?:[\u200E\u200F\uFEFF\s]*)?([^\n\r]+?)\s*\((?:file attached|archivo adjunto|fichero adjunto)\)\s*$/i

const MEDIA_OMITTED_REGEX =
  /^<multimedia omitido>|<media omitted>|<audio omitido>|<imagen omitida>|<video omitido>|<sticker omitido>/i

const KNOWN_SYSTEM_PHRASES = [
  'end-to-end encrypted',
  'cifrados de extremo a extremo',
  'cifrado de extremo a extremo',
  'created group',
  'creó el grupo',
  'added you',
  'te añadió',
  'added',
  'añadió a',
  'removed',
  'eliminó a',
  'left',
  'salió del grupo',
  'changed the subject to',
  'cambió el asunto a',
  'changed this group\'s icon',
  'cambió el ícono del grupo',
  'joined using this group\'s invite link',
  'se unió usando el enlace de invitación',
  'changed their phone number',
  'cambió su número de teléfono',
  'security code changed',
  'cambió su código de seguridad',
  'pinned a message',
  'fijó un mensaje',
]

/**
 * Detects attachment type by file extension.
 */
export function getAttachmentType(fileName: string): AttachmentType {
  const lower = fileName.toLowerCase().trim()
  if (lower.startsWith('stk-') || lower.includes('sticker') || lower.endsWith('.webp')) {
    return 'sticker'
  }
  if (/\.(jpg|jpeg|png|gif|bmp|svg|heic)$/i.test(lower)) {
    return 'image'
  }
  if (/\.(opus|ogg|mp3|m4a|wav|aac|amr|flac)$/i.test(lower) || lower.startsWith('ptt-')) {
    return 'audio'
  }
  if (/\.(mp4|mov|3gp|mkv|avi|webm)$/i.test(lower) || lower.startsWith('vid-')) {
    return 'video'
  }
  if (/\.vcf$/i.test(lower)) {
    return 'contact'
  }
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|txt|csv)$/i.test(lower)) {
    return 'document'
  }
  return 'unknown'
}

/**
 * Formats a raw date string into human friendly label (e.g. "27 de julio de 2019" or readable date).
 */
export function formatDateGroup(rawDate: string): string {
  const parts = rawDate.split(/[/.\-]/).map(p => parseInt(p, 10))
  if (parts.length === 3) {
    let year = parts[2]
    let month = parts[0]
    let day = parts[1]

    // If day > 12 in first position, it's DD/MM/YY
    if (parts[0] > 12) {
      day = parts[0]
      month = parts[1]
    }
    // If year is 4 digits in first position, it's YYYY-MM-DD
    if (parts[0] > 1000) {
      year = parts[0]
      month = parts[1]
      day = parts[2]
    }

    if (year < 100) {
      year += 2000
    }

    const d = new Date(year, month - 1, day)
    if (!isNaN(d.getTime())) {
      const months = [
        'enero',
        'febrero',
        'marzo',
        'abril',
        'mayo',
        'junio',
        'julio',
        'agosto',
        'septiembre',
        'octubre',
        'noviembre',
        'diciembre',
      ]
      return `${day} de ${months[d.getMonth()]} de ${year}`
    }
  }
  return rawDate
}

/**
 * Checks if a string is likely a system message based on keywords.
 */
function isSystemPhrase(text: string): boolean {
  const lower = text.toLowerCase()
  return KNOWN_SYSTEM_PHRASES.some(phrase => lower.includes(phrase))
}

/**
 * Parses raw text from a WhatsApp export txt file.
 */
export function parseWhatsAppChat(rawText: string, fileName: string = 'chat.txt'): ParsedChat {
  const lines = rawText.split(/\r?\n/)
  const messages: ChatMessage[] = []
  const participantsMap = new Map<string, ParticipantInfo>()
  const dateGroupsSet = new Set<string>()

  let currentMsg: ChatMessage | null = null
  let messageIndex = 0

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]
    if (!rawLine && !currentMsg) continue

    const lineMatch = rawLine.match(DATE_LINE_REGEX)

    if (lineMatch) {
      // Finalize previous message
      if (currentMsg) {
        processMessageAttachment(currentMsg)
        messages.push(currentMsg)
      }

      const rawDate = lineMatch[1].trim()
      const rawTime = lineMatch[2].trim()
      const remainder = lineMatch[3]

      const dateGroup = formatDateGroup(rawDate)
      dateGroupsSet.add(dateGroup)

      // Check if remainder is sender + message or system event
      const senderMatch = remainder.match(SENDER_MESSAGE_REGEX)

      let sender = ''
      let content = ''
      let isSystem = false

      if (senderMatch && !isSystemPhrase(senderMatch[1])) {
        sender = senderMatch[1].trim()
        content = senderMatch[2]
        isSystem = false

        // Register participant
        if (!participantsMap.has(sender)) {
          participantsMap.set(sender, {
            name: sender,
            color: getParticipantColor(sender),
            avatarBg: getParticipantColor(sender),
            messageCount: 0,
            firstSeen: `${rawDate} ${rawTime}`,
            lastSeen: `${rawDate} ${rawTime}`,
          })
        }
        const p = participantsMap.get(sender)!
        p.messageCount++
        p.lastSeen = `${rawDate} ${rawTime}`
      } else {
        // No colon or matched system phrase -> System event
        isSystem = true
        sender = ''
        content = remainder.trim()
      }

      currentMsg = {
        id: `msg-${messageIndex++}`,
        rawDate,
        rawTime,
        timestamp: messageIndex,
        dateGroup,
        sender,
        isSystem,
        content,
      }
    } else {
      // Multi-line continuation of current message
      if (currentMsg) {
        currentMsg.content += '\n' + rawLine
      }
    }
  }

  // Finalize last message
  if (currentMsg) {
    processMessageAttachment(currentMsg)
    messages.push(currentMsg)
  }

  // Derive chat title
  let title = fileName.replace(/\.[^/.]+$/, '').replace(/^WhatsApp Chat with /i, '').replace(/^Chat de WhatsApp con /i, '')
  if (!title || title === 'chat' || title === '_chat') {
    // Try to find group title in system messages e.g. Carlos created group "K/ND"
    const groupCreated = messages.find(m => m.isSystem && /created group "(.*)"|creó el grupo "(.*)"/i.test(m.content))
    if (groupCreated) {
      const match = groupCreated.content.match(/created group "(.*)"|creó el grupo "(.*)"/i)
      title = (match && (match[1] || match[2])) || 'Grupo de WhatsApp'
    } else if (participantsMap.size > 0) {
      const names = Array.from(participantsMap.keys())
      title = names.length > 2 ? `${names.slice(0, 2).join(', ')} y ${names.length - 2} más` : names.join(' y ')
    } else {
      title = 'Chat de WhatsApp'
    }
  }

  const systemEvents = messages.filter(m => m.isSystem).length
  const mediaCount = messages.filter(m => !!m.attachment).length

  return {
    fileName,
    title,
    messages,
    participants: participantsMap,
    dateGroups: Array.from(dateGroupsSet),
    stats: {
      totalMessages: messages.length,
      systemEvents,
      mediaCount,
      startDate: messages[0]?.rawDate || '',
      endDate: messages[messages.length - 1]?.rawDate || '',
    },
  }
}

/**
 * Checks content of a message for attachments or media omitted.
 */
function processMessageAttachment(msg: ChatMessage) {
  if (msg.isSystem) return

  const lines = msg.content.split('\n')
  const firstLine = lines[0].trim()

  const match = firstLine.match(ATTACHMENT_LINE_REGEX)
  if (match) {
    const fileName = match[1].trim()
    const type = getAttachmentType(fileName)
    const caption = lines.slice(1).join('\n').trim()

    msg.attachment = {
      fileName,
      originalText: firstLine,
      type,
    }
    msg.content = caption
  } else if (MEDIA_OMITTED_REGEX.test(firstLine)) {
    msg.attachment = {
      fileName: 'multimedia_omitido',
      originalText: firstLine,
      type: 'unknown',
      isMissing: true,
    }
    msg.content = lines.slice(1).join('\n').trim()
  }
}
