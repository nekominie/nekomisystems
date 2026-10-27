export interface VCardParsed {
  name: string
  phone?: string
  email?: string
  org?: string
  rawVcard: string
}

export function parseVCard(text: string): VCardParsed {
  const result: VCardParsed = {
    name: 'Contacto',
    rawVcard: text,
  }

  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^FN:/i.test(trimmed)) {
      result.name = trimmed.substring(3).trim()
    } else if (!result.name || result.name === 'Contacto') {
      if (/^N:/i.test(trimmed)) {
        const parts = trimmed.substring(2).split(';').filter(Boolean)
        if (parts.length > 0) {
          result.name = parts.reverse().join(' ').trim()
        }
      }
    }

    if (/^TEL/i.test(trimmed)) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx !== -1) {
        result.phone = trimmed.substring(colonIdx + 1).trim()
      }
    } else if (/^EMAIL/i.test(trimmed)) {
      const colonIdx = trimmed.indexOf(':')
      if (colonIdx !== -1) {
        result.email = trimmed.substring(colonIdx + 1).trim()
      }
    } else if (/^ORG:/i.test(trimmed)) {
      result.org = trimmed.substring(4).trim()
    }
  }

  return result
}
