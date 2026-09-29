import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { filterTasks, dayLabel, formatTaskTime, capitalizeLabel } from '@/domain/task/TaskFilters'
import { displayName } from '@/domain/session/AppSession'
import { sortReactions } from '@/domain/catalog/TagCatalog'
import { usePressGesture } from '@/presentation/hooks/usePressGesture'
import { es } from '@/presentation/i18n/es'
import type { Task } from '@/domain/task/Task'
import type { PersonId } from '@/domain/task/PersonId'

function TaskBubble({
  task,
  mine,
  first,
  names,
}: {
  task: Task
  mine: boolean
  first: boolean
  names: { a: string; b: string }
}) {
  const { useCases } = useAppContainer()
  const openMenu = useAppStore((s) => s.openMenu)
  const press = usePressGesture(() => openMenu(task.id))

  return (
    <div
      className={[
        'task-row',
        mine ? 'task-row--mine' : 'task-row--theirs',
        task.reactions.length ? 'task-row--has-reactions' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="task-row__col">
        <div
          className={[
            'bubble',
            mine ? 'bubble--mine' : 'bubble--theirs',
            first ? 'bubble--first' : 'bubble--not-first',
            task.done ? 'bubble--done' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          {...press}
        >
          {!mine && (
            <div className={`bubble__who bubble__who--${task.by}`}>
              {displayName(names, task.by)}
            </div>
          )}
          <div className="bubble__body">
            <button
              type="button"
              className="bubble__check"
              aria-label={task.done ? es.markPending : es.markDone}
              onClick={(event) => {
                event.stopPropagation()
                useCases.mutations.toggleTaskDone.execute(task.id)
              }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </button>
            <div className="bubble__content">
              <div className="bubble__text">{task.text}</div>
              {task.checklist.length > 0 && (
                <ul className="bubble__checklist">
                  {task.checklist.map((item) => (
                    <li
                      key={item.id}
                      className={`bubble__item${item.done ? ' bubble__item--done' : ''}`}
                    >
                      <button
                        type="button"
                        className="bubble__item-check"
                        aria-label={
                          item.done ? es.markPending : es.checklistItem
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          useCases.mutations.toggleChecklistItem.execute(
                            task.id,
                            item.id,
                          )
                        }}
                      >
                        <svg viewBox="0 0 24 24">
                          <path d="M5 12.5l4.5 4.5L19 7.5" />
                        </svg>
                      </button>
                      <span className="bubble__item-text">{item.text}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="bubble__meta">
            {task.done && (
              <span className="bubble__by">
                Hecha por {displayName(names, task.doneBy || task.by)}
              </span>
            )}
            <span>{formatTaskTime(task.ts)}</span>
            <span>
              <svg className="bubble__ticks" viewBox="0 0 17 11">
                <path d="M1 6l3.2 3.2L10 1.5M7 8.2l1.1 1.0L14.5 1.5" />
              </svg>
            </span>
          </div>
        </div>
        {task.reactions.length > 0 && (
          <button
            type="button"
            className={`reacts ${mine ? 'reacts--mine' : 'reacts--theirs'}`}
            onClick={() => openMenu(task.id)}
          >
            {sortReactions(task.reactions).map((emoji) => (
              <span key={emoji}>{emoji}</span>
            ))}
          </button>
        )}
      </div>
    </div>
  )
}

export function Chat() {
  const session = useAppStore((s) => s.session)
  const stickScroll = useAppStore((s) => s.stickScroll)
  const setNearBottom = useAppStore((s) => s.setNearBottom)
  const setStickScroll = useAppStore((s) => s.setStickScroll)
  const ref = useRef<HTMLElement>(null)

  const visible = useMemo(
    () => filterTasks(session.tasks, session.filter),
    [session.tasks, session.filter],
  )

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (stickScroll) {
      node.scrollTop = node.scrollHeight
      setStickScroll(false)
    }
  }, [visible, stickScroll, setStickScroll])

  const items: ReactNode[] = []
  if (session.filter === 'all') {
    items.push(
      <div key="system" className="chat__system">
        {es.systemHint}
      </div>,
    )
  }
  if (!visible.length) {
    items.push(
      <div key="empty" className="chat__empty">
        {session.tasks.length ? es.emptyFilter : es.emptyAll}
      </div>,
    )
  }

  let lastDay = ''
  let lastBy: PersonId | null = null
  visible.forEach((task) => {
    const label = dayLabel(task.ts)
    if (label !== lastDay) {
      items.push(
        <div key={`day-${task.ts}`} className="chat__day">
          <span>{capitalizeLabel(label)}</span>
        </div>,
      )
      lastDay = label
      lastBy = null
    }
    const mine = task.by === session.me
    const first = lastBy !== task.by
    lastBy = task.by
    items.push(
      <TaskBubble
        key={task.id}
        task={task}
        mine={mine}
        first={first}
        names={session.names}
      />,
    )
  })

  return (
    <main
      className="chat"
      aria-live="polite"
      ref={ref}
      onScroll={() => {
        const node = ref.current
        if (!node) return
        const near =
          node.scrollHeight - node.scrollTop - node.clientHeight < 140
        setNearBottom(near)
      }}
    >
      {items}
    </main>
  )
}
