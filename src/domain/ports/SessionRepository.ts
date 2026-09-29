import type { AppSession } from '../session/AppSession'

export interface SessionRepository {
  load(): AppSession | null
  save(session: AppSession): void
}
