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

function syncErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'nocode') return 'No existe esa casa. Revisa el código'
  if (message === 'timeout') return 'Sin conexión. Inténtalo de nuevo'
  if (message === 'permission') return 'Sin permiso en Firebase: revisa las reglas'
  if (message === 'not-ready') return 'Aún sincronizando. Inténtalo de nuevo'
  return 'No se pudo conectar con Firebase'
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

  execute(taskId: string, emoji: string): void {
    const session = this.uow.session
    this.uow.commit(
      {
        ...session,
        tasks: session.tasks.map((task) =>
          task.id === taskId ? toggleTaskReaction(task, emoji) : task,
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
    this.uow.commit(
      {
        ...session,
        names: {
          ...session.names,
          [me]: myName.trim() || defaultPersonName(me),
          [other]: partnerName.trim() || defaultPersonName(other),
        },
      },
      { stickScroll: false },
    )
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
      this.uow.toast('Casa creada. Pasa el código a tu pareja')
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
    successToast = 'Unido 🏠 Pon tu nombre arriba',
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

  execute(): void {
    this.uow.services.sync.disconnect()
    const session = this.uow.session
    this.uow.commit({ ...session, room: null }, { push: false, stickScroll: false })
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
    this.uow.commit(
      {
        ...session,
        tasks: snapshot.tasks,
        names: snapshot.names
          ? { ...session.names, ...snapshot.names }
          : session.names,
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
          await this.joinRoom.execute(code, 'Unido a la casa compartida 🏠')
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
