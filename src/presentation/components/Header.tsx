import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { displayName } from '@/domain/session/AppSession'
import { ArrowUpDown, ChevronDown, EllipsisVertical, Home } from '@/presentation/icons'
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
        <img src="/icons/icon-192.png" alt="" width={40} height={40} />
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
          {canSwitchGroups ? (
            <span className="header__caret" aria-hidden>
              <ChevronDown size={14} strokeWidth={2.5} />
            </span>
          ) : null}
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
          <Home size={22} strokeWidth={2} />
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
          <ArrowUpDown size={22} strokeWidth={2} />
        </button>
      )}
      <button
        type="button"
        className="header__icon-btn"
        aria-label={es.settings}
        onClick={() => setSettingsOpen(true)}
      >
        <EllipsisVertical size={22} strokeWidth={2} />
      </button>
    </header>
  )
}
