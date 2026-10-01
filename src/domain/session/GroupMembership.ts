import type { PersonId } from '@/domain/task/PersonId'

export interface GroupMembership {
  room: string
  person: PersonId
  /** Cached label for the switcher, e.g. "Ana y Luis". */
  label: string
  joinedAt: number
}

export function membershipLabel(
  names: { a: string; b: string },
  fallbackRoom: string,
): string {
  const a = names.a.trim()
  const b = names.b.trim()
  if (a && b) return `${a} y ${b}`
  if (a) return a
  if (b) return b
  return fallbackRoom.slice(0, 8)
}

export function upsertMembership(
  list: GroupMembership[],
  membership: GroupMembership,
): GroupMembership[] {
  const without = list.filter((item) => item.room !== membership.room)
  return [...without, membership].sort((a, b) => b.joinedAt - a.joinedAt)
}

export function removeMembership(
  list: GroupMembership[],
  room: string,
): GroupMembership[] {
  return list.filter((item) => item.room !== room)
}

export function mergeMemberships(
  remote: GroupMembership[],
  local: GroupMembership[],
): GroupMembership[] {
  const byRoom = new Map<string, GroupMembership>()
  for (const item of remote) byRoom.set(item.room, item)
  for (const item of local) {
    const existing = byRoom.get(item.room)
    if (!existing || item.joinedAt >= existing.joinedAt) {
      byRoom.set(item.room, {
        ...existing,
        ...item,
        label: item.label || existing?.label || item.room.slice(0, 8),
      })
    }
  }
  return [...byRoom.values()].sort((a, b) => b.joinedAt - a.joinedAt)
}
