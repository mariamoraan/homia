const ROOM_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'
const ROOM_CODE_PATTERN = /^[a-z0-9]{8,32}$/

export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => ROOM_ALPHABET[b % 32]).join('')
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toLowerCase()
}

export function isValidRoomCode(code: string): boolean {
  return ROOM_CODE_PATTERN.test(normalizeRoomCode(code))
}
