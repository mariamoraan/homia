import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { displayName } from '@/domain/session/AppSession'
import { es } from '@/presentation/i18n/es'

export function Header() {
  const { useCases } = useAppContainer()
  const session = useAppStore((s) => s.session)
  const syncConnected = useAppStore((s) => s.syncConnected)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setGroupsOpen = useAppStore((s) => s.setGroupsOpen)

  const canSwitchGroups = session.memberships.length > 1
  const activeLabel =
    session.memberships.find((item) => item.room === session.room)?.label ?? null

  const subtitle = session.room
    ? `${displayName(session.names, 'a')} y ${displayName(session.names, 'b')} · ${
        syncConnected ? 'en línea' : 'sin conexión'
      }`
    : `${displayName(session.names, 'a')} y ${displayName(session.names, 'b')} · escribiendo como ${displayName(session.names, session.me)}`

  return (
    <header className="header">
      <div
        className={`header__avatar header__avatar--${session.me}`}
        aria-hidden="true"
      >
        🏠
      </div>
      <button
        type="button"
        className="header__text"
        aria-label={canSwitchGroups ? es.switchHome : es.swapPerson}
        onClick={() => {
          if (canSwitchGroups) {
            setGroupsOpen(true)
            return
          }
          useCases.mutations.swapPerson.execute()
        }}
      >
        <div className="header__title">
          {activeLabel && canSwitchGroups ? activeLabel : es.appTitle}
          {canSwitchGroups ? <span className="header__caret" aria-hidden>▾</span> : null}
        </div>
        <div className="header__subtitle">{subtitle}</div>
      </button>
      {canSwitchGroups && (
        <button
          type="button"
          className="header__icon-btn"
          aria-label={es.switchHome}
          title={es.switchHome}
          onClick={() => setGroupsOpen(true)}
        >
          <svg viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
          </svg>
        </button>
      )}
      {!session.room && (
        <button
          type="button"
          className="header__icon-btn"
          aria-label={es.swapPerson}
          title={es.swapPerson}
          onClick={() => useCases.mutations.swapPerson.execute()}
        >
          <svg viewBox="0 0 24 24">
            <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3 5 6.99h3V14h2V6.99h3L9 3z" />
          </svg>
        </button>
      )}
      <button
        type="button"
        className="header__icon-btn"
        aria-label={es.settings}
        onClick={() => setSettingsOpen(true)}
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
        </svg>
      </button>
    </header>
  )
}
