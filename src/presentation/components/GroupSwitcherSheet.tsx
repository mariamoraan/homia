import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { es } from '@/presentation/i18n/es'

export function GroupSwitcherSheet() {
  const { useCases } = useAppContainer()
  const groupsOpen = useAppStore((s) => s.groupsOpen)
  const setGroupsOpen = useAppStore((s) => s.setGroupsOpen)
  const session = useAppStore((s) => s.session)

  if (!groupsOpen) return null

  return (
    <div
      className="sheet sheet--on"
      onClick={(event) => {
        if (event.target === event.currentTarget) setGroupsOpen(false)
      }}
    >
      <div className="sheet__box">
        <h3>{es.groupsTitle}</h3>
        <p className="sheet__hint sheet__hint--tight">{es.groupsHint}</p>
        <ul className="group-list">
          {session.memberships.map((membership) => {
            const active = session.room === membership.room
            return (
              <li key={membership.room}>
                <button
                  type="button"
                  className={`group-list__item${active ? ' group-list__item--on' : ''}`}
                  disabled={active}
                  onClick={async () => {
                    await useCases.mutations.switchGroup.execute(membership.room)
                    setGroupsOpen(false)
                  }}
                >
                  <span className="group-list__label">{membership.label}</span>
                  <span className="group-list__code">{membership.room}</span>
                  {active ? (
                    <span className="group-list__badge">{es.currentHome}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setGroupsOpen(false)}
          >
            {es.close}
          </button>
        </div>
      </div>
    </div>
  )
}
