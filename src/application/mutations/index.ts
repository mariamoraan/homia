import type { SessionUnitOfWork } from '@/application/SessionUnitOfWork'
import {
  buildChecklistItems,
  buildTask,
  toggleChecklistItem,
  toggleTaskDone,
  toggleTaskReaction,
} from '@/domain/task/TaskActions'
import type { ChecklistItem } from '@/domain/task/Task'
import { otherPerson, defaultPersonName } from '@/domain/task/PersonId'
import type { TaskFilter } from '@/domain/task/TaskFilters'
import { generateRoomCode, isValidRoomCode, normalizeRoomCode } from '@/domain/room/RoomCode'
import { displayName, type AppSession } from '@/domain/session/AppSession'
import type { AuthUser } from '@/domain/session/AuthUser'
import {
  membershipLabel,
  mergeMemberships,
  removeMembership,
  upsertMembership,
  type GroupMembership,
} from '@/domain/session/GroupMembership'

function syncErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'nocode') return 'No existe ese grupo. Revisa el código'
  if (message === 'timeout') return 'Sin conexión. Inténtalo de nuevo'
  if (message === 'permission') return 'Sin permiso en Firebase: revisa las reglas'
  if (message === 'not-ready') return 'Aún sincronizando. Inténtalo de nuevo'
  if (message === 'redirect') return 'Te redirigimos a Google…'
  if (message === 'config') return 'Firebase no está configurado'
  if (message === 'auth') return 'No se pudo iniciar sesión con Google'
  return 'No se pudo conectar con Firebase'
}

function isFirebasePermissionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const code = 'code' in error ? String(error.code) : ''
  const message = error instanceof Error ? error.message : String(error)
  return (
    code.includes('PERMISSION_DENIED') ||
    message.toLowerCase().includes('permission_denied')
  )
}

function membershipAccountErrorToast(error: unknown): string {
  if (isFirebasePermissionError(error)) {
    return 'Sin permiso en users/{uid}: publica las reglas del README en RTDB'
  }
  return 'No se pudieron sincronizar tus grupos en la cuenta'
}

async function persistMemberships(
  uow: SessionUnitOfWork,
  uid: string,
  memberships: GroupMembership[],
): Promise<void> {
  const session = uow.session
  uow.commit({ ...session, memberships }, { push: false })
  if (uow.services.accounts.available) {
    try {
      await uow.services.accounts.saveMemberships(uid, memberships)
    } catch (error) {
      uow.toast(membershipAccountErrorToast(error))
    }
  }
}

function localMembershipFromSession(session: AppSession): GroupMembership | null {
  if (!session.room) return null
  return {
    room: session.room,
    person: session.me,
    label: membershipLabel(session.names, session.room),
    joinedAt: Date.now(),
  }
}

async function linkCurrentRoomIfNeeded(uow: SessionUnitOfWork): Promise<void> {
  const session = uow.session
  if (!session.auth || !session.room) return
  const membership = localMembershipFromSession(session)
  if (!membership) return
  const next = upsertMembership(session.memberships, membership)
  await persistMemberships(uow, session.auth.uid, next)
}

export class CreateTaskMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(
    text: string,
    reactions: string[] = [],
    checklist: ChecklistItem[] | Array<{ text: string; done?: boolean }> = [],
  ): void {
    const session = this.uow.session
    const items = toChecklistItems(checklist)
    const task = buildTask(text, session.me, reactions, items)
    this.uow.commit(
      {
        ...session,
        filter: 'all',
        tasks: [...session.tasks, task],
      },
      { stickScroll: true },
    )
  }
}

export class CreateTasksMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(texts: string[], reactions: string[] = []): void {
    if (!texts.length) return
    const session = this.uow.session
    const baseTs = Date.now()
    const created = texts.map((text, index) =>
      buildTask(text, session.me, reactions, [], baseTs + index),
    )
    this.uow.commit(
      {
        ...session,
        filter: 'all',
        tasks: [...session.tasks, ...created],
      },
      { stickScroll: true },
    )
  }
}

export class UpdateTaskTextMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(
    taskId: string,
    text: string,
    checklist?: ChecklistItem[] | Array<{ text: string; done?: boolean }>,
  ): void {
    const session = this.uow.session
    this.uow.commit(
      {
        ...session,
        tasks: session.tasks.map((task) => {
          if (task.id !== taskId) return task
          if (checklist === undefined) return { ...task, text }
          return { ...task, text, checklist: toChecklistItems(checklist) }
        }),
      },
      { stickScroll: false },
    )
  }
}

function toChecklistItems(
  checklist: ChecklistItem[] | Array<{ text: string; done?: boolean; id?: string }>,
): ChecklistItem[] {
  if (!checklist.length) return []
  if ('id' in checklist[0]! && typeof checklist[0]!.id === 'string') {
    return (checklist as ChecklistItem[])
      .map((item) => ({
        id: item.id,
        text: item.text.trim(),
        done: !!item.done,
      }))
      .filter((item) => item.text.length > 0)
  }
  return buildChecklistItems(checklist)
}

export class ToggleChecklistItemMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(taskId: string, itemId: string): void {
    const session = this.uow.session
    this.uow.commit(
      {
        ...session,
        tasks: session.tasks.map((task) =>
          task.id === taskId ? toggleChecklistItem(task, itemId) : task,
        ),
      },
      { stickScroll: false },
    )
  }
}

export class ToggleTaskDoneMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(taskId: string): void {
    const session = this.uow.session
    this.uow.commit(
      {
        ...session,
        tasks: session.tasks.map((task) =>
          task.id === taskId ? toggleTaskDone(task, session.me) : task,
        ),
      },
      { stickScroll: false },
    )
  }
}

export class ToggleReactionMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(taskId: string, reactionId: string): void {
    const session = this.uow.session
    this.uow.commit(
      {
        ...session,
        tasks: session.tasks.map((task) =>
          task.id === taskId ? toggleTaskReaction(task, reactionId) : task,
        ),
      },
      { stickScroll: false },
    )
  }
}

export class DeleteTaskMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(taskId: string): void {
    const session = this.uow.session
    this.uow.commit(
      {
        ...session,
        tasks: session.tasks.filter((task) => task.id !== taskId),
      },
      { stickScroll: false },
    )
    this.uow.toast('Tarea eliminada')
  }
}

export class ClearDoneTasksMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(): { cleared: number } | { empty: true } {
    const session = this.uow.session
    const doneCount = session.tasks.filter((task) => task.done).length
    if (!doneCount) {
      this.uow.toast('No hay tareas hechas')
      return { empty: true }
    }
    this.uow.commit(
      {
        ...session,
        tasks: session.tasks.filter((task) => !task.done),
      },
      { stickScroll: false },
    )
    return { cleared: doneCount }
  }
}

export class SetFilterMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(filter: TaskFilter): void {
    const session = this.uow.session
    const nextFilter =
      session.filter === filter && filter !== 'all' ? 'all' : filter
    this.uow.commit({ ...session, filter: nextFilter }, { stickScroll: true })
  }
}

export class SaveNamesMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(myName: string, partnerName: string): void {
    const session = this.uow.session
    const me = session.me
    const other = otherPerson(me)
    const names = {
      ...session.names,
      [me]: myName.trim() || defaultPersonName(me),
      [other]: partnerName.trim() || defaultPersonName(other),
    }

    let memberships = session.memberships
    if (session.auth && session.room) {
      memberships = upsertMembership(memberships, {
        room: session.room,
        person: session.me,
        label: membershipLabel(names, session.room),
        joinedAt:
          memberships.find((item) => item.room === session.room)?.joinedAt ??
          Date.now(),
      })
    }

    this.uow.commit({ ...session, names, memberships }, { stickScroll: false })

    if (session.auth && session.room && this.uow.services.accounts.available) {
      void this.uow.services.accounts
        .saveMemberships(session.auth.uid, memberships)
        .catch(() => {})
    }

    this.uow.toast('Nombres guardados')
  }
}

export class SwapPersonMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(): void {
    const session = this.uow.session
    if (session.room) {
      this.uow.toast(`Este móvil escribe como ${this.uow.personName(session.me)}`)
      return
    }
    const nextMe = otherPerson(session.me)
    this.uow.commit({ ...session, me: nextMe }, { stickScroll: true })
    this.uow.toast(`Ahora escribes como ${displayName(session.names, nextMe)}`)
  }
}

export class CreateSharedRoomMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly applySnapshot: ApplyRemoteSnapshotMutation,
  ) {}

  async execute(myName?: string): Promise<void> {
    const code = generateRoomCode()
    try {
      const session = this.uow.session
      const nameA = myName?.trim() || session.names.a || defaultPersonName('a')
      this.applySnapshot.markNotReady()
      this.uow.commit(
        {
          ...session,
          me: 'a',
          room: code,
          names: { ...session.names, a: nameA },
        },
        { push: false },
      )
      await this.uow.services.sync.connect(code, 'create')
      this.applySnapshot.markReady()
      await this.uow.services.sync.push(this.uow.session)
      await this.uow.services.sync.startListening()
      await linkCurrentRoomIfNeeded(this.uow)
      this.uow.toast('Grupo creado. Pasa el código a tu pareja')
    } catch (error) {
      const session = this.uow.session
      if (session.room === code) {
        this.uow.services.sync.disconnect()
        this.uow.commit({ ...session, room: null }, { push: false })
      }
      this.uow.toast(syncErrorMessage(error))
      throw error
    }
  }
}

export class JoinSharedRoomMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly applySnapshot: ApplyRemoteSnapshotMutation,
  ) {}

  async execute(
    rawCode: string,
    successToast = 'Unido. Pon tu nombre arriba',
    myName?: string,
  ): Promise<boolean> {
    const code = normalizeRoomCode(rawCode)
    if (!isValidRoomCode(code)) {
      this.uow.toast('El código no es válido')
      return false
    }

    try {
      const session = this.uow.session
      const nameB = myName?.trim() || session.names.b || defaultPersonName('b')
      this.applySnapshot.markNotReady()
      this.uow.commit(
        {
          ...session,
          me: 'b',
          tasks: [],
          room: code,
          names: { ...session.names, b: nameB },
        },
        { push: false, stickScroll: true },
      )
      await this.uow.services.sync.connect(code, 'join')
      // Remote snapshot may overwrite local names; re-assert joiner name and push.
      const current = this.uow.session
      this.uow.commit({
        ...current,
        names: { ...current.names, b: nameB },
      })
      await linkCurrentRoomIfNeeded(this.uow)
      this.uow.toast(successToast)
      return true
    } catch (error) {
      const session = this.uow.session
      if (session.room === code) {
        this.uow.services.sync.disconnect()
        this.uow.commit(
          { ...session, room: null, me: 'a' },
          { push: false },
        )
      }
      this.uow.toast(syncErrorMessage(error))
      return false
    }
  }
}

export class CompleteOnboardingMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(): void {
    const session = this.uow.session
    if (session.onboardingDone) return
    this.uow.commit(
      { ...session, onboardingDone: true },
      { push: false, stickScroll: false },
    )
  }
}

export class LeaveSharedRoomMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  async execute(): Promise<void> {
    const session = this.uow.session
    const leftRoom = session.room
    this.uow.services.sync.disconnect()

    const memberships =
      session.auth && leftRoom
        ? removeMembership(session.memberships, leftRoom)
        : session.memberships

    this.uow.commit(
      { ...session, room: null, memberships },
      { push: false, stickScroll: false },
    )

    if (session.auth && leftRoom && this.uow.services.accounts.available) {
      try {
        await this.uow.services.accounts.saveMemberships(
          session.auth.uid,
          memberships,
        )
      } catch (error) {
        this.uow.toast(membershipAccountErrorToast(error))
      }
    }

    this.uow.toast('Desconectado')
  }
}

export class ApplyRemoteSnapshotMutation {
  private ready = false

  constructor(private readonly uow: SessionUnitOfWork) {}

  markNotReady(): void {
    this.ready = false
  }

  markReady(): void {
    this.ready = true
  }

  execute(snapshot: {
    tasks: AppSession['tasks']
    names?: AppSession['names']
  }): void {
    const session = this.uow.session
    const previousIds = new Set(session.tasks.map((task) => task.id))
    const fresh = this.ready
      ? snapshot.tasks.filter((task) => !previousIds.has(task.id) && task.by !== session.me)
      : []

    const nearBottom =
      !this.ready ||
      this.uow.services.store.shouldStickScroll() ||
      snapshot.tasks.length > previousIds.size

    this.ready = true
    let memberships = session.memberships
    if (session.auth && session.room && snapshot.names) {
      const names = { ...session.names, ...snapshot.names }
      memberships = upsertMembership(memberships, {
        room: session.room,
        person: session.me,
        label: membershipLabel(names, session.room),
        joinedAt:
          memberships.find((item) => item.room === session.room)?.joinedAt ??
          Date.now(),
      })
    }

    this.uow.commit(
      {
        ...session,
        tasks: snapshot.tasks,
        names: snapshot.names
          ? { ...session.names, ...snapshot.names }
          : session.names,
        memberships,
      },
      { push: false, stickScroll: nearBottom },
    )
    fresh.forEach((task) => this.uow.notifyIncoming(task))
  }
}

export class BootSyncMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly applySnapshot: ApplyRemoteSnapshotMutation,
    private readonly joinRoom: JoinSharedRoomMutation,
  ) {}

  /** Returns a pending join code when onboarding should handle the deep link. */
  async execute(options: {
    confirmJoinDeepLink: () => boolean
  }): Promise<string | null> {
    const sync = this.uow.services.sync
    const params = new URLSearchParams(window.location.search)
    const deepLink = params.get('casa')

    try {
      if (deepLink) {
        window.history.replaceState(null, '', window.location.pathname)
        const code = normalizeRoomCode(deepLink)
        if (!isValidRoomCode(code)) return null

        if (!this.uow.session.onboardingDone) {
          return code
        }

        if (
          sync.available &&
          code !== this.uow.session.room &&
          options.confirmJoinDeepLink()
        ) {
          await this.joinRoom.execute(code, 'Unido al grupo compartido')
        }
        return null
      }

      if (this.uow.session.room && sync.available && !sync.isListening) {
        this.applySnapshot.markNotReady()
        await sync.connect(this.uow.session.room, 'resume')
      }
    } catch (error) {
      this.uow.toast(syncErrorMessage(error))
    }
    return null
  }
}

export class RequestNotificationsMutation {
  constructor(private readonly uow: SessionUnitOfWork) {}

  async execute(): Promise<void> {
    const permission = await this.uow.services.notifications.requestPermission()
    this.uow.toast(
      permission === 'granted' ? 'Avisos activados' : 'Avisos no permitidos',
    )
  }
}

export class ApplyAuthUserMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly switchGroup?: SwitchGroupMutation,
  ) {}

  /**
   * Merges remote memberships with the current local room, persists the union,
   * and keeps the active room (or connects the most recent if none).
   */
  async execute(user: AuthUser | null, options: { toast?: boolean } = {}): Promise<void> {
    if (!user) {
      const session = this.uow.session
      if (!session.auth && session.memberships.length === 0) return
      this.uow.commit(
        { ...session, auth: null, memberships: [] },
        { push: false },
      )
      return
    }

    let remote: GroupMembership[] = []
    let accountSyncFailed = false
    if (this.uow.services.accounts.available) {
      try {
        remote = await this.uow.services.accounts.loadMemberships(user.uid)
      } catch (error) {
        // Keep local memberships if remote load fails (offline / rules).
        remote = this.uow.session.memberships
        accountSyncFailed = true
        this.uow.toast(membershipAccountErrorToast(error))
      }
    }

    const session = this.uow.session
    const localExtra = localMembershipFromSession(session)
    const localList = localExtra ? [localExtra] : []
    const memberships = mergeMemberships(remote, localList)

    this.uow.commit(
      { ...session, auth: user, memberships },
      { push: false },
    )

    if (this.uow.services.accounts.available && !accountSyncFailed) {
      try {
        await this.uow.services.accounts.saveMemberships(user.uid, memberships)
      } catch (error) {
        this.uow.toast(membershipAccountErrorToast(error))
      }
    }

    if (!this.uow.session.room && memberships[0] && this.switchGroup) {
      await this.switchGroup.execute(memberships[0].room, { silent: true })
    }

    // Returning users with houses skip create/join onboarding.
    const after = this.uow.session
    if (
      after.auth &&
      !after.onboardingDone &&
      (after.room || after.memberships.length > 0)
    ) {
      this.uow.commit(
        { ...after, onboardingDone: true },
        { push: false, stickScroll: false },
      )
    }

    if (options.toast) {
      const count = memberships.length
      this.uow.toast(
        count > 1
          ? `Sesión iniciada · ${count} grupos en tu cuenta`
          : 'Sesión iniciada con Google',
      )
    }
  }
}

export class SignInWithGoogleMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly applyAuth: ApplyAuthUserMutation,
  ) {}

  async execute(): Promise<void> {
    if (!this.uow.services.auth.available) {
      this.uow.toast('Firebase no está configurado')
      return
    }
    try {
      const user = await this.uow.services.auth.signInWithGoogle()
      await this.applyAuth.execute(user, { toast: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (message === 'redirect') {
        this.uow.toast('Te redirigimos a Google…')
        return
      }
      this.uow.toast(syncErrorMessage(error))
    }
  }
}

export class SignOutMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly applyAuth: ApplyAuthUserMutation,
  ) {}

  async execute(): Promise<void> {
    try {
      await this.uow.services.auth.signOut()
      await this.applyAuth.execute(null)
      this.uow.toast('Sesión cerrada')
    } catch {
      this.uow.toast('No se pudo cerrar sesión')
    }
  }
}

export class SwitchGroupMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly applySnapshot: ApplyRemoteSnapshotMutation,
  ) {}

  async execute(roomCode: string, options: { silent?: boolean } = {}): Promise<void> {
    const code = normalizeRoomCode(roomCode)
    const session = this.uow.session
    const membership = session.memberships.find((item) => item.room === code)
    if (!membership) {
      this.uow.toast('Ese grupo no está en tu cuenta')
      return
    }
    if (session.room === code) {
      if (!options.silent) this.uow.toast('Ya estás en ese grupo')
      return
    }
    if (!this.uow.services.sync.available) {
      this.uow.toast('Firebase no está configurado')
      return
    }

    try {
      this.uow.services.sync.disconnect()
      this.applySnapshot.markNotReady()
      this.uow.commit(
        {
          ...session,
          me: membership.person,
          room: code,
          tasks: [],
          filter: 'all',
        },
        { push: false, stickScroll: true },
      )
      await this.uow.services.sync.connect(code, 'resume')
      if (!options.silent) this.uow.toast(`Cambiado a ${membership.label}`)
    } catch (error) {
      this.uow.toast(syncErrorMessage(error))
    }
  }
}

export class BootAuthMutation {
  constructor(
    private readonly uow: SessionUnitOfWork,
    private readonly applyAuth: ApplyAuthUserMutation,
  ) {}

  async execute(): Promise<void> {
    if (!this.uow.services.auth.available) return

    try {
      const redirected = await this.uow.services.auth.completeRedirectSignIn()
      if (redirected) {
        await this.applyAuth.execute(redirected, { toast: true })
        return
      }
    } catch {
      // Ignore redirect errors; auth state listener still runs.
    }

    // Wait for the first auth state so memberships sync on cold start.
    await new Promise<void>((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        resolve()
      }
      const timeout = window.setTimeout(finish, 4000)
      const unsub = this.uow.services.auth.onAuthStateChanged((user) => {
        window.clearTimeout(timeout)
        void this.applyAuth.execute(user).finally(() => {
          unsub()
          finish()
        })
      })
    })
  }
}
