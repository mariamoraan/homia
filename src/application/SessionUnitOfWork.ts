import type { RoomSyncPort } from '@/domain/ports/RoomSyncPort'
import type { SessionRepository } from '@/domain/ports/SessionRepository'
import type { NotificationPort } from '@/domain/ports/NotificationPort'
import type { AuthPort } from '@/domain/ports/AuthPort'
import type { UserAccountPort } from '@/domain/ports/UserAccountPort'
import type { SessionStorePort } from '@/application/ports/SessionStorePort'
import type { AppSession } from '@/domain/session/AppSession'
import { displayName } from '@/domain/session/AppSession'

export interface AppServices {
  repository: SessionRepository
  sync: RoomSyncPort
  notifications: NotificationPort
  store: SessionStorePort
  auth: AuthPort
  accounts: UserAccountPort
}

export class SessionUnitOfWork {
  constructor(readonly services: AppServices) {}

  get session(): AppSession {
    return this.services.store.getSession()
  }

  commit(
    next: AppSession,
    options: { push?: boolean; stickScroll?: boolean } = {},
  ): void {
    const { push = true, stickScroll } = options
    if (typeof stickScroll === 'boolean') {
      this.services.store.setStickScroll(stickScroll)
    }
    this.services.store.setSession(next)
    this.services.repository.save(next)
    if (push) {
      void this.services.sync.push(next).catch(() => {
        this.services.store.showToast('No se pudo guardar en la nube')
      })
    }
  }

  toast(message: string): void {
    this.services.store.showToast(message)
  }

  personName(person: AppSession['me']): string {
    return displayName(this.session.names, person)
  }

  notifyIncoming(task: AppSession['tasks'][number]): void {
    const author = displayName(this.session.names, task.by)
    if (document.visibilityState === 'visible') {
      this.toast(`🆕 ${author}: ${task.text}`)
      return
    }
    this.services.notifications.notifyNewTask(author, task.text, task.id)
  }
}
