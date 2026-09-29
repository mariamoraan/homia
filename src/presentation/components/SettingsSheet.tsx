import { useEffect, useState } from 'react'
import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { displayName } from '@/domain/session/AppSession'
import { otherPerson } from '@/domain/task/PersonId'
import { es } from '@/presentation/i18n/es'

export function SettingsSheet() {
  const { useCases, notifications } = useAppContainer()
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const session = useAppStore((s) => s.session)
  const syncConnected = useAppStore((s) => s.syncConnected)
  const installPrompt = useAppStore((s) => s.installPrompt)
  const setInstallPrompt = useAppStore((s) => s.setInstallPrompt)
  const showToast = useAppStore((s) => s.showToast)
  const syncStatus = useCases.queries.getSyncStatus.execute()

  const [nameA, setNameA] = useState('')
  const [nameB, setNameB] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [notifPermission, setNotifPermission] = useState(notifications.permission())

  useEffect(() => {
    if (!settingsOpen) return
    setNameA(displayName(session.names, session.me))
    setNameB(displayName(session.names, otherPerson(session.me)))
    setNotifPermission(notifications.permission())
  }, [settingsOpen, session.names, session.me, notifications])

  if (!settingsOpen) return null

  const install = async () => {
    const standalone =
      window.matchMedia('(display-mode:standalone)').matches ||
      Boolean(navigator.standalone)
    if (standalone) {
      showToast('Ya la tienes instalada')
      return
    }
    if (installPrompt) {
      await installPrompt.prompt()
      await installPrompt.userChoice
      setInstallPrompt(null)
      return
    }
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    showToast(
      ios
        ? 'En Safari: Compartir → Añadir a pantalla de inicio'
        : 'En el menú del navegador: Instalar app / Añadir a pantalla de inicio',
    )
  }

  return (
    <div
      className="sheet sheet--on"
      onClick={(event) => {
        if (event.target === event.currentTarget) setSettingsOpen(false)
      }}
    >
      <div className="sheet__box">
        <h3>{es.settings}</h3>
        <label htmlFor="nameA">{es.yourName}</label>
        <input
          id="nameA"
          maxLength={20}
          autoComplete="off"
          value={nameA}
          onChange={(event) => setNameA(event.target.value)}
        />
        <label htmlFor="nameB">{es.partnerName}</label>
        <input
          id="nameB"
          maxLength={20}
          autoComplete="off"
          value={nameB}
          onChange={(event) => setNameB(event.target.value)}
        />
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              useCases.mutations.saveNames.execute(nameA, nameB)
              setSettingsOpen(false)
            }}
          >
            {es.save}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setSettingsOpen(false)}
          >
            {es.close}
          </button>
        </div>

        <hr className="sheet__sep" />

        <div className="sheet__section-title">{es.shareWithPartner}</div>
        {!syncStatus.available ? (
          <p className="sheet__hint">{es.firebaseMissing}</p>
        ) : session.room ? (
          <>
            <p className="sheet__hint">
              {syncConnected
                ? '🟢 En línea'
                : '🟠 Sin conexión: se sincronizará al volver'}{' '}
              · Código de vuestra casa:
            </p>
            <div className="sheet__code">{session.room}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(session.room!)
                    showToast('Código copiado')
                  } catch {
                    showToast('Mantén pulsado el código para copiarlo')
                  }
                }}
              >
                {es.copyCode}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  const url = `${location.origin}${location.pathname}?casa=${session.room}`
                  const text = `Únete a nuestra casa 🏠 Código: ${session.room}`
                  if (navigator.share) {
                    try {
                      await navigator.share({ title: 'Casa', text, url })
                    } catch {
                      // User cancelled share sheet.
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(`${text}\n${url}`)
                      showToast('Enlace copiado')
                    } catch {
                      // Ignore clipboard failures.
                    }
                  }
                }}
              >
                {es.shareLink}
              </button>
            </div>
            <div className="btn-row">
              {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={async () => {
                    await useCases.mutations.requestNotifications.execute()
                    setNotifPermission(notifications.permission())
                  }}
                >
                  {es.notifyNew}
                </button>
              )}
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  if (
                    window.confirm(
                      '¿Dejar de compartir? Conservarás las tareas en este móvil.',
                    )
                  ) {
                    useCases.mutations.leaveSharedRoom.execute()
                  }
                }}
              >
                {es.disconnect}
              </button>
            </div>
            <p className="sheet__hint">{es.shareHint}</p>
          </>
        ) : (
          <>
            <p className="sheet__hint">{es.localOnlyHint}</p>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => void useCases.mutations.createSharedRoom.execute()}
              >
                {es.createHome}
              </button>
            </div>
            <label htmlFor="joinCode">{es.joinLabel}</label>
            <input
              id="joinCode"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value)}
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  if (
                    session.tasks.length &&
                    !window.confirm(
                      'Las tareas de este dispositivo se sustituirán por las de la casa. ¿Continuar?',
                    )
                  ) {
                    return
                  }
                  await useCases.mutations.joinSharedRoom.execute(joinCode)
                }}
              >
                {es.join}
              </button>
            </div>
            <p className="sheet__hint">{es.iosTip}</p>
          </>
        )}

        <hr className="sheet__sep" />
        <div className="btn-row">
          <button type="button" className="btn btn--ghost" onClick={() => void install()}>
            {es.installApp}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              const doneCount = session.tasks.filter((task) => task.done).length
              if (!doneCount) {
                showToast('No hay tareas hechas')
                return
              }
              if (
                window.confirm(
                  `¿Borrar ${doneCount} tarea${doneCount > 1 ? 's' : ''} hecha${doneCount > 1 ? 's' : ''}?`,
                )
              ) {
                useCases.mutations.clearDoneTasks.execute()
                setSettingsOpen(false)
              }
            }}
          >
            {es.clearDone}
          </button>
        </div>
      </div>
    </div>
  )
}
