import {
  createEmptySession,
  isSessionShape,
  type AppSession,
} from '@/domain/session/AppSession'
import type { AuthUser } from '@/domain/session/AuthUser'
import type { GroupMembership } from '@/domain/session/GroupMembership'
import { normalizeTask } from '@/domain/task/Task'
import type { PersonId } from '@/domain/task/PersonId'
import type { SessionRepository } from '@/domain/ports/SessionRepository'

export const STORAGE_KEY = 'casa-tareas-v1'

function parseAuth(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<AuthUser>
  if (typeof raw.uid !== 'string' || !raw.uid) return null
  return {
    uid: raw.uid,
    displayName: typeof raw.displayName === 'string' ? raw.displayName : null,
    email: typeof raw.email === 'string' ? raw.email : null,
    photoURL: typeof raw.photoURL === 'string' ? raw.photoURL : null,
  }
}

function parseMemberships(value: unknown): GroupMembership[] {
  if (!Array.isArray(value)) return []
  const result: GroupMembership[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Partial<GroupMembership>
    if (typeof raw.room !== 'string' || !raw.room) continue
    if (raw.person !== 'a' && raw.person !== 'b') continue
    result.push({
      room: raw.room,
      person: raw.person as PersonId,
      label:
        typeof raw.label === 'string' && raw.label.trim()
          ? raw.label
          : raw.room.slice(0, 8),
      joinedAt: typeof raw.joinedAt === 'number' ? raw.joinedAt : Date.now(),
    })
  }
  return result
}

export class LocalStorageSessionRepository implements SessionRepository {
  load(): AppSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed: unknown = JSON.parse(raw)
      if (!isSessionShape(parsed)) return null
      // Existing installs skip onboarding even without an explicit flag.
      const onboardingDone =
        typeof parsed.onboardingDone === 'boolean' ? parsed.onboardingDone : true
      return {
        me: parsed.me === 'b' ? 'b' : 'a',
        names: {
          a: parsed.names?.a ?? 'Yo',
          b: parsed.names?.b ?? 'Pareja',
        },
        filter: parsed.filter ?? 'all',
        room: typeof parsed.room === 'string' ? parsed.room : null,
        tasks: parsed.tasks.map((task) => normalizeTask(task)),
        onboardingDone,
        auth: parseAuth(parsed.auth),
        memberships: parseMemberships(parsed.memberships),
      }
    } catch {
      return null
    }
  }

  save(session: AppSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      // Ignore quota / private mode failures (parity with original app).
    }
  }

  loadOrEmpty(): AppSession {
    return this.load() ?? createEmptySession()
  }
}
