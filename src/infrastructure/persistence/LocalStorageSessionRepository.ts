import {
  createEmptySession,
  isSessionShape,
  type AppSession,
} from '@/domain/session/AppSession'
import { normalizeTask } from '@/domain/task/Task'
import type { SessionRepository } from '@/domain/ports/SessionRepository'

export const STORAGE_KEY = 'casa-tareas-v1'

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
