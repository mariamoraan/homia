import { useEffect, useMemo, type ReactNode } from 'react'
import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { REACTION_LABELS, REACTION_ORDER } from '@/domain/catalog/TagCatalog'
import { ReactionIcon } from '@/presentation/icons'
import { es } from '@/presentation/i18n/es'
import type { TaskFilter } from '@/domain/task/TaskFilters'

type FilterDef = {
  key: TaskFilter
  label: ReactNode
  ariaLabel?: string
}

export function FilterBar() {
  const { useCases } = useAppContainer()
  const session = useAppStore((s) => s.session)

  const defs = useMemo((): FilterDef[] => {
    const used = new Set<string>()
    session.tasks.forEach((task) => task.reactions.forEach((r) => used.add(r)))
    const pending = session.tasks.filter((task) => !task.done).length
    const items: FilterDef[] = [
      { key: 'all', label: es.all },
      {
        key: 'pending',
        label: `${es.pending}${pending ? ` ${pending}` : ''}`,
      },
      { key: 'done', label: es.done },
    ]
    REACTION_ORDER.filter((reactionId) => used.has(reactionId)).forEach(
      (reactionId) => {
        items.push({
          key: reactionId,
          label: <ReactionIcon id={reactionId} size={14} />,
          ariaLabel: REACTION_LABELS[reactionId],
        })
      },
    )
    return items
  }, [session.tasks])

  const filterExists = defs.some((item) => item.key === session.filter)

  useEffect(() => {
    if (!filterExists) {
      useCases.mutations.setFilter.execute('all')
    }
  }, [filterExists, useCases.mutations.setFilter])

  const activeFilter = filterExists ? session.filter : 'all'

  return (
    <div className="filters" role="tablist">
      {defs.map(({ key, label, ariaLabel }) => (
        <button
          key={key}
          type="button"
          className={`chip${activeFilter === key ? ' chip--on' : ''}`}
          aria-label={ariaLabel}
          onClick={() => useCases.mutations.setFilter.execute(key)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
