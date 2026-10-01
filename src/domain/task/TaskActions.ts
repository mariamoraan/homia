import {
  createChecklistItemId,
  createTaskId,
  type ChecklistItem,
  type Task,
} from './Task'
import type { PersonId } from './PersonId'
import { HASHTAG_TO_REACTION, QUICK_STARTS } from '../catalog/TagCatalog'

const BULLET_LINE_RE = /^\s*-\s*(.*)$/

export function parseHashtags(text: string): { text: string; reactions: string[] } {
  const reactions: string[] = []
  const cleaned = text
    .replace(/(^|\s)#([\p{L}]+)/gu, (match, space: string, word: string) => {
      const reactionId = HASHTAG_TO_REACTION[word.toLowerCase()]
      if (reactionId) {
        if (!reactions.includes(reactionId)) reactions.push(reactionId)
        return space
      }
      return match
    })
    .replace(/\s+/g, ' ')
    .trim()

  return { text: cleaned || text, reactions }
}

export function detectQuickPrefix(text: string): string {
  for (const [, prefix] of QUICK_STARTS) {
    if (text.startsWith(prefix)) return prefix
  }
  return ''
}

export function stripQuickPrefix(text: string): string {
  const prefix = detectQuickPrefix(text)
  return prefix ? text.slice(prefix.length) : text
}

/** True when the composer should auto-insert a bullet on newline. */
export function isBulletListComposition(text: string): boolean {
  const lines = text.split('\n')
  if (lines.some((line) => BULLET_LINE_RE.test(line))) return true
  return Boolean(detectQuickPrefix(lines[0] ?? ''))
}

/**
 * If the message has 2+ dashed lines, return one task text per item
 * (including a leading non-bullet line), with the quick-start prefix
 * replicated. Otherwise null.
 */
export function splitBulletTasks(text: string): string[] | null {
  const lines = text.split('\n')
  const dashCount = lines.filter((line) => BULLET_LINE_RE.test(line)).length
  if (dashCount < 2) return null

  const prefix =
    detectQuickPrefix(lines[0]?.trim() ?? '') ||
    lines.reduce((found, line) => {
      if (found) return found
      const match = line.match(BULLET_LINE_RE)
      const body = (match ? match[1] : line).trim()
      return detectQuickPrefix(body)
    }, '')

  const texts: string[] = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const bulletMatch = trimmed.match(BULLET_LINE_RE)
    let body = bulletMatch ? bulletMatch[1].trim() : trimmed

    if (!body) continue
    // Skip bare category line: "Compra:"
    if (prefix && body === prefix.trim()) continue

    const bodyPrefix = detectQuickPrefix(body)
    if (bodyPrefix) {
      const rest = body.slice(bodyPrefix.length).trim()
      if (!rest) continue
      texts.push(bodyPrefix + rest)
      continue
    }

    texts.push(prefix ? prefix + body : body)
  }

  return texts.length >= 2 ? texts : null
}

export function parseChecklistComposer(text: string): {
  title: string
  items: Array<{ text: string; done: boolean }>
} {
  const lines = text.split('\n')
  let title = ''
  const items: Array<{ text: string; done: boolean }> = []

  for (const line of lines) {
    const checklistMatch = line.match(/^\s*\[([ xX])\]\s*(.*)$/)
    if (checklistMatch) {
      items.push({
        text: checklistMatch[2].trim(),
        done: checklistMatch[1].toLowerCase() === 'x',
      })
      continue
    }
    if (!title && line.trim()) {
      title = line.trim()
    } else if (title && line.trim() && items.length === 0) {
      // Extra non-checklist lines before items become part of title
      title = `${title} ${line.trim()}`.trim()
    }
  }

  return { title, items }
}

export function serializeChecklistComposer(
  title: string,
  items: Array<{ text: string; done: boolean }>,
): string {
  const lines = [title]
  for (const item of items) {
    lines.push(`${item.done ? '[x]' : '[]'} ${item.text}`.trimEnd())
  }
  return lines.join('\n').trim()
}

export function buildChecklistItems(
  items: Array<{ text: string; done?: boolean }>,
): ChecklistItem[] {
  return items
    .map((item) => ({
      id: createChecklistItemId(),
      text: item.text.trim(),
      done: !!item.done,
    }))
    .filter((item) => item.text.length > 0)
}

export function buildTask(
  text: string,
  by: PersonId,
  extraReactions: string[] = [],
  checklist: ChecklistItem[] = [],
  ts = Date.now(),
): Task {
  const parsed = parseHashtags(text)
  const reactions = [...parsed.reactions]
  for (const reactionId of extraReactions) {
    if (!reactions.includes(reactionId)) reactions.push(reactionId)
  }
  return {
    id: createTaskId(),
    text: parsed.text,
    by,
    ts,
    done: false,
    doneBy: null,
    reactions,
    checklist,
  }
}

export function toggleTaskDone(task: Task, by: PersonId): Task {
  const done = !task.done
  return {
    ...task,
    done,
    doneBy: done ? by : null,
  }
}

export function toggleTaskReaction(task: Task, reactionId: string): Task {
  const reactions = task.reactions.includes(reactionId)
    ? task.reactions.filter((r) => r !== reactionId)
    : [...task.reactions, reactionId]
  return { ...task, reactions }
}

export function toggleChecklistItem(task: Task, itemId: string): Task {
  return {
    ...task,
    checklist: task.checklist.map((item) =>
      item.id === itemId ? { ...item, done: !item.done } : item,
    ),
  }
}
