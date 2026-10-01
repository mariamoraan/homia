import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import {
  QUICK_REACTIONS,
  REACTION_LABELS,
  TAG_CATALOG,
} from '@/domain/catalog/TagCatalog'
import {
  CheckCircle2,
  Minus,
  Pencil,
  Plus,
  ReactionIcon,
  Trash2,
  Undo2,
} from '@/presentation/icons'
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
        {QUICK_REACTIONS.map((reactionId) => (
          <button
            key={reactionId}
            type="button"
            className={task.reactions.includes(reactionId) ? 'is-on' : ''}
            aria-label={REACTION_LABELS[reactionId]}
            onClick={() => {
              useCases.mutations.toggleReaction.execute(task.id, reactionId)
              openMenu(task.id, menuExpanded)
            }}
          >
            <ReactionIcon id={reactionId} size={18} />
          </button>
        ))}
        <button
          type="button"
          className="task-menu__more"
          aria-label={es.moreIcons}
          onClick={() => openMenu(task.id, !menuExpanded)}
        >
          {menuExpanded ? <Minus size={18} /> : <Plus size={18} />}
        </button>
      </div>
      <div className={`task-menu__panel${menuExpanded ? ' task-menu__panel--on' : ''}`}>
        {TAG_CATALOG.map((group) => (
          <div key={group.title}>
            <h4>{group.title}</h4>
            <div className="task-menu__grid">
              {group.items.map(([reactionId, label]) => (
                <button
                  key={reactionId}
                  type="button"
                  className={`task-menu__opt${
                    task.reactions.includes(reactionId) ? ' task-menu__opt--on' : ''
                  }`}
                  onClick={() => {
                    useCases.mutations.toggleReaction.execute(task.id, reactionId)
                    openMenu(task.id, true)
                  }}
                >
                  <span className="task-menu__opt-ic">
                    <ReactionIcon id={reactionId} size={16} />
                  </span>
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
          <span className="task-menu__ic">
            {task.done ? <Undo2 size={18} /> : <CheckCircle2 size={18} />}
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            closeMenu()
            startEdit(task.id)
          }}
        >
          <span>{es.edit}</span>
          <span className="task-menu__ic">
            <Pencil size={18} />
          </span>
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
          <span className="task-menu__ic">
            <Trash2 size={18} />
          </span>
        </button>
      </div>
    </div>
  )
}
