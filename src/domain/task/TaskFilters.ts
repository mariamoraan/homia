import type { Task } from './Task'

export type TaskFilter = 'all' | 'pending' | 'done' | (string & {})

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  if (filter === 'all') return tasks
  if (filter === 'pending') return tasks.filter((t) => !t.done)
  if (filter === 'done') return tasks.filter((t) => t.done)
  return tasks.filter((t) => t.reactions.includes(filter))
}

const DAY_MS = 24 * 3600e3

export function dayLabel(ts: number, now = new Date()): string {
  const date = new Date(ts)
  const startOf = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOf(now) - startOf(date)) / DAY_MS)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Ayer'
  return date.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatTaskTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function capitalizeLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1)
}
