export interface TagGroup {
  title: string
  items: Array<[id: string, label: string]>
}

export const TAG_CATALOG: TagGroup[] = [
  {
    title: 'Tipo de tarea',
    items: [
      ['cleaning', 'Limpieza'],
      ['shopping', 'Compra'],
      ['trash', 'Tirar'],
      ['repair', 'Arreglo'],
      ['paperwork', 'Trámite'],
      ['cooking', 'Cocina'],
      ['laundry', 'Ropa'],
      ['pet', 'Mascota'],
      ['payments', 'Pagos'],
      ['plants', 'Plantas'],
    ],
  },
  {
    title: 'Importancia',
    items: [
      ['urgent', 'Urgente'],
      ['important', 'Importante'],
      ['no-rush', 'Sin prisa'],
    ],
  },
  {
    title: 'Quién / cuándo',
    items: [
      ['mine', 'Me encargo yo'],
      ['together', 'Juntos'],
      ['this-week', 'Esta semana'],
    ],
  },
]

/** Maps pre-slug emoji reaction IDs to current slugs. */
export const LEGACY_EMOJI_TO_REACTION: Record<string, string> = {
  '🧹': 'cleaning',
  '🛒': 'shopping',
  '🗑️': 'trash',
  '🔧': 'repair',
  '📄': 'paperwork',
  '🍳': 'cooking',
  '🧺': 'laundry',
  '🐾': 'pet',
  '💸': 'payments',
  '🌿': 'plants',
  '🔥': 'urgent',
  '⭐': 'important',
  '🐢': 'no-rush',
  '🙋': 'mine',
  '🤝': 'together',
  '📅': 'this-week',
}

export function migrateReactionId(id: string): string {
  return LEGACY_EMOJI_TO_REACTION[id] ?? id
}

export function migrateReactionIds(ids: string[]): string[] {
  const result: string[] = []
  for (const id of ids) {
    const next = migrateReactionId(id)
    if (!result.includes(next)) result.push(next)
  }
  return result
}

export const QUICK_REACTIONS = [
  'urgent',
  'important',
  'shopping',
  'cleaning',
  'trash',
  'repair',
  'paperwork',
] as const

export const REACTION_ORDER = TAG_CATALOG.flatMap((g) => g.items.map(([id]) => id))

export const REACTION_LABELS: Record<string, string> = Object.fromEntries(
  TAG_CATALOG.flatMap((g) => g.items),
)

export const QUICK_STARTS: Array<[id: string, prefix: string]> = [
  ['shopping', 'Compra: '],
  ['trash', 'Tirar: '],
  ['repair', 'Arreglo: '],
  ['paperwork', 'Trámite: '],
  ['cleaning', 'Limpieza: '],
]

export const HASHTAG_TO_REACTION: Record<string, string> = {
  urgente: 'urgent',
  importante: 'important',
  compra: 'shopping',
  limpieza: 'cleaning',
  basura: 'trash',
  arreglo: 'repair',
  tramite: 'paperwork',
  trámite: 'paperwork',
  cocina: 'cooking',
  ropa: 'laundry',
  mascota: 'pet',
  pagos: 'payments',
  plantas: 'plants',
}

export function sortReactions(reactions: string[]): string[] {
  return [...reactions].sort(
    (a, b) => REACTION_ORDER.indexOf(a) - REACTION_ORDER.indexOf(b),
  )
}

export function migrateFilter(filter: string): string {
  if (filter === 'all' || filter === 'pending' || filter === 'done') return filter
  return migrateReactionId(filter)
}
