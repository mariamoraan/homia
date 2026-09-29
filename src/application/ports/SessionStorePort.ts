import type { AppSession } from '@/domain/session/AppSession'

export interface SessionStorePort {
  getSession(): AppSession
  setSession(session: AppSession): void
  showToast(message: string): void
  setSyncConnected(connected: boolean): void
  getSyncConnected(): boolean
  shouldStickScroll(): boolean
  setStickScroll(value: boolean): void
}
