const WHATSAPP_COLORS = [
  '#00a884', // WhatsApp Teal
  '#53bdeb', // Sky blue
  '#eb5757', // Coral red
  '#f2994a', // Orange
  '#9b51e0', // Violet
  '#27ae60', // Emerald green
  '#e83e8c', // Pink
  '#17a2b8', // Cyan
  '#fd7e14', // Amber orange
  '#6610f2', // Indigo
  '#20c997', // Mint
  '#d63384', // Magenta
  '#0d6efd', // Royal blue
  '#e67e22', // Carrot
]

/**
 * Returns a stable, deterministic color for any participant name.
 */
export function getParticipantColor(name: string): string {
  if (!name) return '#8696a0'
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % WHATSAPP_COLORS.length
  return WHATSAPP_COLORS[index]
}

/**
 * Returns initials (up to 2 chars) for avatar display.
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
