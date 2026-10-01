import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { filterTasks, dayLabel, formatTaskTime, capitalizeLabel } from '@/domain/task/TaskFilters'
import { displayName } from '@/domain/session/AppSession'
import { sortReactions } from '@/domain/catalog/TagCatalog'
import { usePressGesture } from '@/presentation/hooks/usePressGesture'
import { Check, CheckCheck, ReactionIcon, ArrowDown } from '@/presentation/icons'
import { es } from '@/presentation/i18n/es'
import type { Task } from '@/domain/task/Task'
import type { PersonId } from '@/domain/task/PersonId'

function personInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0].slice(0, 1) + parts[1].slice(0, 1)).toUpperCase()
}

function TaskBubble({
  task,
  mine,
  first,
  names,
  enter,
}: {
  task: Task
  mine: boolean
  first: boolean
  names: { a: string; b: string }
  enter: boolean
}) {
  const { useCases } = useAppContainer()
  const openMenu = useAppStore((s) => s.openMenu)
  const press = usePressGesture(() => openMenu(task.id))
  const whoName = displayName(names, task.by)
  const [animateEnter] = useState(enter)
  const [checkPop, setCheckPop] = useState(false)
  const [itemPops, setItemPops] = useState<Record<string, boolean>>({})

  return (
    <div
      className={[
        'task-row',
        mine ? 'task-row--mine' : 'task-row--theirs',
        task.reactions.length ? 'task-row--has-reactions' : '',
        animateEnter ? 'task-row--enter' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {!mine &&
        (first ? (
          <div
            className={`task-row__avatar task-row__avatar--${task.by}`}
            aria-hidden
            title={whoName}
          >
            {personInitials(whoName)}
          </div>
        ) : (
          <div className="task-row__avatar-spacer" aria-hidden />
        ))}
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
          <div className="bubble__body">
            <button
              type="button"
              className={`bubble__check${checkPop ? ' bubble__check--pop' : ''}`}
              aria-label={task.done ? es.markPending : es.markDone}
              onClick={(event) => {
                event.stopPropagation()
                if (!task.done) setCheckPop(true)
                useCases.mutations.toggleTaskDone.execute(task.id)
              }}
              onAnimationEnd={() => setCheckPop(false)}
            >
              <Check size={13} strokeWidth={3} />
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
                        className={`bubble__item-check${
                          itemPops[item.id] ? ' bubble__item-check--pop' : ''
                        }`}
                        aria-label={
                          item.done ? es.markPending : es.checklistItem
                        }
                        onClick={(event) => {
                          event.stopPropagation()
                          if (!item.done) {
                            setItemPops((current) => ({
                              ...current,
                              [item.id]: true,
                            }))
                          }
                          useCases.mutations.toggleChecklistItem.execute(
                            task.id,
                            item.id,
                          )
                        }}
                        onAnimationEnd={() => {
                          setItemPops((current) => {
                            if (!current[item.id]) return current
                            const next = { ...current }
                            delete next[item.id]
                            return next
                          })
                        }}
                      >
                        <Check size={13} strokeWidth={3} />
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
              <CheckCheck className="bubble__ticks" size={14} strokeWidth={2} />
            </span>
          </div>
        </div>
        {task.reactions.length > 0 && (
          <button
            type="button"
            className={`reacts ${mine ? 'reacts--mine' : 'reacts--theirs'}`}
            onClick={() => openMenu(task.id)}
          >
            {sortReactions(task.reactions).map((reactionId) => (
              <ReactionIcon key={reactionId} id={reactionId} size={14} />
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
  const [mountedAt] = useState(() => Date.now())

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
        {session.tasks.length ? (
          es.emptyFilter
        ) : (
          <>
            {es.emptyAll} <ArrowDown size={14} strokeWidth={2.5} aria-hidden />
          </>
        )}
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
        enter={task.ts >= mountedAt}
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
