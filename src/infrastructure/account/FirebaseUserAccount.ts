import type { UserAccountPort } from '@/domain/ports/UserAccountPort'
import type { GroupMembership } from '@/domain/session/GroupMembership'
import type { PersonId } from '@/domain/task/PersonId'
import type { FirebaseWebConfig } from '@/infrastructure/config/firebaseConfig'
import { getFirebaseApp } from '@/infrastructure/firebase/firebaseApp'

function isPersonId(value: unknown): value is PersonId {
  return value === 'a' || value === 'b'
}

function parseMembership(
  room: string,
  value: unknown,
): GroupMembership | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (!isPersonId(raw.person)) return null
  return {
    room,
    person: raw.person,
    label: typeof raw.label === 'string' && raw.label.trim() ? raw.label : room.slice(0, 8),
    joinedAt: typeof raw.joinedAt === 'number' ? raw.joinedAt : Date.now(),
  }
}

export class NullUserAccount implements UserAccountPort {
  readonly available = false

  async loadMemberships(): Promise<GroupMembership[]> {
    return []
  }

  async saveMemberships(): Promise<void> {}
}

export class FirebaseUserAccount implements UserAccountPort {
  readonly available = true
  private db: import('firebase/database').Database | null = null

  constructor(private readonly config: FirebaseWebConfig) {}

  private async ensureDb() {
    if (this.db) return this.db
    const [{ getDatabase }, app] = await Promise.all([
      import('firebase/database'),
      getFirebaseApp(this.config),
    ])
    this.db = getDatabase(app)
    return this.db
  }

  async loadMemberships(uid: string): Promise<GroupMembership[]> {
    const db = await this.ensureDb()
    const { ref, get } = await import('firebase/database')
    const snap = await get(ref(db, `users/${uid}/memberships`))
    const value = snap.val() as Record<string, unknown> | null
    if (!value) return []
    return Object.entries(value)
      .map(([room, raw]) => parseMembership(room, raw))
      .filter((item): item is GroupMembership => item !== null)
      .sort((a, b) => b.joinedAt - a.joinedAt)
  }

  async saveMemberships(
    uid: string,
    memberships: GroupMembership[],
  ): Promise<void> {
    const db = await this.ensureDb()
    const { ref, set } = await import('firebase/database')
    const payload: Record<string, { person: PersonId; label: string; joinedAt: number }> =
      {}
    for (const item of memberships) {
      payload[item.room] = {
        person: item.person,
        label: item.label,
        joinedAt: item.joinedAt,
      }
    }
    await set(ref(db, `users/${uid}/memberships`), payload)
  }
}

export function createUserAccount(
  config: FirebaseWebConfig | null,
): UserAccountPort {
  return config ? new FirebaseUserAccount(config) : new NullUserAccount()
}
