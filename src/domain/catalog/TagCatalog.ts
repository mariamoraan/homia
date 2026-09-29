export interface TagGroup {
  title: string
  items: Array<[emoji: string, label: string]>
}

export const TAG_CATALOG: TagGroup[] = [
  {
    title: 'Tipo de tarea',
    items: [
      ['🧹', 'Limpieza'],
      ['🛒', 'Compra'],
      ['🗑️', 'Tirar'],
      ['🔧', 'Arreglo'],
      ['📄', 'Trámite'],
      ['🍳', 'Cocina'],
      ['🧺', 'Ropa'],
      ['🐾', 'Mascota'],
      ['💸', 'Pagos'],
      ['🌿', 'Plantas'],
    ],
  },
  {
    title: 'Importancia',
    items: [
      ['🔥', 'Urgente'],
      ['⭐', 'Importante'],
      ['🐢', 'Sin prisa'],
    ],
  },
  {
    title: 'Quién / cuándo',
    items: [
      ['🙋', 'Me encargo yo'],
      ['🤝', 'Juntos'],
      ['📅', 'Esta semana'],
    ],
  },
]

export const QUICK_REACTIONS = ['🔥', '⭐', '🛒', '🧹', '🗑️', '🔧', '📄'] as const

export const REACTION_ORDER = TAG_CATALOG.flatMap((g) => g.items.map(([emoji]) => emoji))

export const REACTION_LABELS: Record<string, string> = Object.fromEntries(
  TAG_CATALOG.flatMap((g) => g.items),
)

export const QUICK_STARTS: Array<[emoji: string, prefix: string]> = [
  ['🛒', 'Compra: '],
  ['🗑️', 'Tirar: '],
  ['🔧', 'Arreglo: '],
  ['📄', 'Trámite: '],
  ['🧹', 'Limpieza: '],
]

export const HASHTAG_TO_REACTION: Record<string, string> = {
  urgente: '🔥',
  importante: '⭐',
  compra: '🛒',
  limpieza: '🧹',
  basura: '🗑️',
  arreglo: '🔧',
  tramite: '📄',
  trámite: '📄',
  cocina: '🍳',
  ropa: '🧺',
  mascota: '🐾',
  pagos: '💸',
  plantas: '🌿',
}

export function sortReactions(reactions: string[]): string[] {
  return [...reactions].sort(
    (a, b) => REACTION_ORDER.indexOf(a) - REACTION_ORDER.indexOf(b),
  )
}
