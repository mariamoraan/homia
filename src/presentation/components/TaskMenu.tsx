import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import {
  QUICK_REACTIONS,
  REACTION_LABELS,
  TAG_CATALOG,
} from '@/domain/catalog/TagCatalog'
import { es } from '@/presentation/i18n/es'

export function TaskMenu() {
  const { useCases } = useAppContainer()
  const menuTaskId = useAppStore((s) => s.menuTaskId)
  const menuExpanded = useAppStore((s) => s.menuExpanded)
  const session = useAppStore((s) => s.session)
  const closeMenu = useAppStore((s) => s.closeMenu)
  const openMenu = useAppStore((s) => s.openMenu)
  const startEdit = useAppStore((s) => s.startEdit)

  if (!menuTaskId) return null
  const task = session.tasks.find((item) => item.id === menuTaskId)
  if (!task) return null

  return (
    <div
      className="overlay overlay--on"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeMenu()
      }}
    >
      <div className="task-menu__preview">{task.text}</div>
      <div className="task-menu__reactbar">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={task.reactions.includes(emoji) ? 'is-on' : ''}
            aria-label={REACTION_LABELS[emoji]}
            onClick={() => {
              useCases.mutations.toggleReaction.execute(task.id, emoji)
              openMenu(task.id, menuExpanded)
            }}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          className="task-menu__more"
          aria-label={es.moreIcons}
          onClick={() => openMenu(task.id, !menuExpanded)}
        >
          {menuExpanded ? '−' : '+'}
        </button>
      </div>
      <div className={`task-menu__panel${menuExpanded ? ' task-menu__panel--on' : ''}`}>
        {TAG_CATALOG.map((group) => (
          <div key={group.title}>
            <h4>{group.title}</h4>
            <div className="task-menu__grid">
              {group.items.map(([emoji, label]) => (
                <button
                  key={emoji}
                  type="button"
                  className={`task-menu__opt${
                    task.reactions.includes(emoji) ? ' task-menu__opt--on' : ''
                  }`}
                  onClick={() => {
                    useCases.mutations.toggleReaction.execute(task.id, emoji)
                    openMenu(task.id, true)
                  }}
                >
                  <span className="e">{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="task-menu__actions">
        <button
          type="button"
          onClick={() => {
            useCases.mutations.toggleTaskDone.execute(task.id)
            closeMenu()
          }}
        >
          <span>{task.done ? es.markPending : es.markDone}</span>
          <span className="task-menu__ic">{task.done ? '↩️' : '✅'}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            closeMenu()
            startEdit(task.id)
          }}
        >
          <span>{es.edit}</span>
          <span className="task-menu__ic">✏️</span>
        </button>
        <button
          type="button"
          className="task-menu__danger"
          onClick={() => {
            closeMenu()
            useCases.mutations.deleteTask.execute(task.id)
          }}
        >
          <span>{es.remove}</span>
          <span className="task-menu__ic">🗑️</span>
        </button>
      </div>
    </div>
  )
}
