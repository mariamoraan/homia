import { migrateReactionIds } from '../catalog/TagCatalog'
import type { PersonId } from './PersonId'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  text: string
  by: PersonId
  ts: number
  done: boolean
  doneBy: PersonId | null
  reactions: string[]
  checklist: ChecklistItem[]
}

export function createTaskId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function createChecklistItemId(): string {
  return Math.random().toString(36).slice(2, 8)
}

function normalizeChecklistItem(
  raw: Partial<ChecklistItem> & { id?: string },
  id?: string,
): ChecklistItem {
  return {
    id: id ?? raw.id ?? createChecklistItemId(),
    text: typeof raw.text === 'string' ? raw.text : '',
    done: !!raw.done,
  }
}

function normalizeChecklist(
  raw: ChecklistItem[] | Record<string, Partial<ChecklistItem>> | undefined,
): ChecklistItem[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => normalizeChecklistItem(item))
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([id, item]) =>
      normalizeChecklistItem(item ?? {}, id),
    )
  }
  return []
}

export function normalizeTask(
  raw: Partial<Task> & {
    reactions?: string[] | Record<string, string>
    checklist?: ChecklistItem[] | Record<string, Partial<ChecklistItem>>
  },
  id?: string,
): Task {
  const reactions: string[] = migrateReactionIds(
    Array.isArray(raw.reactions)
      ? raw.reactions.map(String)
      : Object.values(raw.reactions ?? {}).map(String),
  )

  return {
    id: id ?? raw.id ?? createTaskId(),
    text: raw.text ?? '',
    by: raw.by === 'b' ? 'b' : 'a',
    ts: typeof raw.ts === 'number' ? raw.ts : 0,
    done: !!raw.done,
    doneBy: raw.doneBy === 'a' || raw.doneBy === 'b' ? raw.doneBy : null,
    reactions,
    checklist: normalizeChecklist(raw.checklist),
  }
}
