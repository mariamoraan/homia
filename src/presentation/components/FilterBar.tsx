import { useEffect, useMemo } from 'react'
import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { REACTION_LABELS, REACTION_ORDER } from '@/domain/catalog/TagCatalog'
import { es } from '@/presentation/i18n/es'
import type { TaskFilter } from '@/domain/task/TaskFilters'

export function FilterBar() {
  const { useCases } = useAppContainer()
  const session = useAppStore((s) => s.session)

  const defs = useMemo(() => {
    const used = new Set<string>()
    session.tasks.forEach((task) => task.reactions.forEach((r) => used.add(r)))
    const pending = session.tasks.filter((task) => !task.done).length
    const items: Array<[TaskFilter, string]> = [
      ['all', es.all],
      ['pending', `${es.pending}${pending ? ` ${pending}` : ''}`],
      ['done', es.done],
    ]
    REACTION_ORDER.filter((emoji) => used.has(emoji)).forEach((emoji) => {
      items.push([emoji, emoji])
    })
    return items
  }, [session.tasks])

  const filterExists = defs.some(([key]) => key === session.filter)

  useEffect(() => {
    if (!filterExists) {
      useCases.mutations.setFilter.execute('all')
    }
  }, [filterExists, useCases.mutations.setFilter])

  const activeFilter = filterExists ? session.filter : 'all'

  return (
    <div className="filters" role="tablist">
      {defs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={`chip${activeFilter === key ? ' chip--on' : ''}`}
          aria-label={REACTION_LABELS[key]}
          onClick={() => useCases.mutations.setFilter.execute(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
