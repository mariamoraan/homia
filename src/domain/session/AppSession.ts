import { createTaskId, type Task } from '../task/Task'
import type { PersonId } from '../task/PersonId'
import type { TaskFilter } from '../task/TaskFilters'
import { defaultPersonName } from '../task/PersonId'
import type { AuthUser } from './AuthUser'
import type { GroupMembership } from './GroupMembership'

export interface PersonNames {
  a: string
  b: string
}

export interface AppSession {
  me: PersonId
  names: PersonNames
  filter: TaskFilter
  tasks: Task[]
  room: string | null
  onboardingDone: boolean
  /** Cached Google profile when signed in (Firebase Auth is source of truth). */
  auth: AuthUser | null
  /** Groups linked to the signed-in account (supports multiple groups). */
  memberships: GroupMembership[]
}

export function displayName(names: PersonNames, person: PersonId): string {
  return names[person] || defaultPersonName(person)
}

export function createEmptySession(): AppSession {
  return {
    me: 'a',
    names: { a: 'Yo', b: 'Pareja' },
    filter: 'all',
    room: null,
    tasks: [],
    onboardingDone: false,
    auth: null,
    memberships: [],
  }
}

export function createDemoSession(): AppSession {
  const now = Date.now()
  const hour = 3600e3
  const day = 24 * hour

  return {
    me: 'a',
    names: { a: 'Yo', b: 'Pareja' },
    filter: 'all',
    room: null,
    onboardingDone: true,
    auth: null,
    memberships: [],
    tasks: [
      {
        id: createTaskId(),
        text: 'Comprar papel de cocina y detergente',
        by: 'b',
        ts: now - day - 3 * hour,
        done: true,
        doneBy: 'a',
        reactions: ['shopping', 'important'],
        checklist: [],
      },
      {
        id: createTaskId(),
        text: 'Sacar la basura antes de que pase el camión',
        by: 'a',
        ts: now - 5 * hour,
        done: false,
        doneBy: null,
        reactions: ['trash', 'urgent'],
        checklist: [],
      },
      {
        id: createTaskId(),
        text: 'Llamar al fontanero, el grifo del baño gotea',
        by: 'b',
        ts: now - 3 * hour,
        done: false,
        doneBy: null,
        reactions: ['repair', 'mine'],
        checklist: [],
      },
      {
        id: createTaskId(),
        text: 'Renovar el seguro del hogar',
        by: 'a',
        ts: now - hour,
        done: false,
        doneBy: null,
        reactions: ['paperwork', 'this-week'],
        checklist: [],
      },
    ],
  }
}

export function isSessionShape(value: unknown): value is AppSession {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AppSession>
  return Array.isArray(candidate.tasks)
}
