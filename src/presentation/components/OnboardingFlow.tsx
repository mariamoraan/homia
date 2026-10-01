import { useState } from 'react'
import { useAppContainer } from '@/presentation/app/AppContainerContext'
import { useAppStore } from '@/presentation/store/appStore'
import { es } from '@/presentation/i18n/es'

type Step = 'welcome' | 'choice' | 'create' | 'join' | 'invite'

function initialStep(room: string | null, pendingJoinCode: string | null): Step {
  if (room) return 'invite'
  if (pendingJoinCode) return 'join'
  return 'welcome'
}

async function copyRoomCode(room: string, showToast: (message: string) => void) {
  try {
    await navigator.clipboard.writeText(room)
    showToast('Código copiado')
  } catch {
    showToast('Mantén pulsado el código para copiarlo')
  }
}

async function shareRoomLink(room: string, showToast: (message: string) => void) {
  const url = `${location.origin}${location.pathname}?casa=${room}`
  const text = `Únete a nuestra casa 🏠 Código: ${room}`
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Casa', text, url })
    } catch {
      // User cancelled share sheet.
    }
    return
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`)
    showToast('Enlace copiado')
  } catch {
    // Ignore clipboard failures.
  }
}

export function OnboardingFlow({ pendingJoinCode }: { pendingJoinCode: string | null }) {
  const { useCases, auth } = useAppContainer()
  const session = useAppStore((s) => s.session)
  const showToast = useAppStore((s) => s.showToast)
  const syncStatus = useCases.queries.getSyncStatus.execute()

  const [step, setStep] = useState<Step>(() =>
    initialStep(session.room, pendingJoinCode),
  )
  const [name, setName] = useState('')
  const [joinCode, setJoinCode] = useState(pendingJoinCode ?? '')
  const [busy, setBusy] = useState(false)

  const finish = () => {
    useCases.mutations.completeOnboarding.execute()
  }

  const signInWithGoogle = async () => {
    if (!auth.available || !syncStatus.available) return
    setBusy(true)
    try {
      await useCases.mutations.signInWithGoogle.execute()
      const next = useAppStore.getState().session
      if (next.auth && (next.room || next.memberships.length > 0)) {
        finish()
      }
    } finally {
      setBusy(false)
    }
  }

  const createHome = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast(es.onboardingNeedName)
      return
    }
    if (!syncStatus.available) return
    setBusy(true)
    try {
      await useCases.mutations.createSharedRoom.execute(trimmed)
      setStep('invite')
    } catch {
      // Toast already shown by mutation.
    } finally {
      setBusy(false)
    }
  }

  const joinHome = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      showToast(es.onboardingNeedName)
      return
    }
    if (!joinCode.trim()) {
      showToast(es.onboardingNeedCode)
      return
    }
    if (!syncStatus.available) return
    setBusy(true)
    try {
      const ok = await useCases.mutations.joinSharedRoom.execute(
        joinCode,
        'Unido a la casa compartida 🏠',
        trimmed,
      )
      if (ok) finish()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        {step === 'welcome' && (
          <>
            <div className="onboarding__emoji" aria-hidden>
              🏠
            </div>
            <h1 className="onboarding__title">{es.onboardingWelcomeTitle}</h1>
            <p className="onboarding__body">{es.onboardingWelcomeBody}</p>
            <p className="onboarding__hint">{es.onboardingWelcomeHint}</p>
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                onClick={() => setStep('choice')}
              >
                {es.onboardingContinue}
              </button>
            </div>
            {syncStatus.available && auth.available && !session.auth ? (
              <>
                <p className="onboarding__divider" aria-hidden>
                  {es.onboardingOr}
                </p>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--google"
                    disabled={busy}
                    onClick={() => void signInWithGoogle()}
                  >
                    {es.signInGoogle}
                  </button>
                </div>
                <p className="onboarding__hint">{es.onboardingGoogleHint}</p>
              </>
            ) : null}
          </>
        )}

        {step === 'choice' && (
          <>
            <h1 className="onboarding__title">{es.onboardingChoiceTitle}</h1>
            {!syncStatus.available && (
              <p className="onboarding__hint onboarding__hint--warn">
                {es.onboardingFirebaseMissing}
              </p>
            )}
            <div className="onboarding__actions">
              <button
                type="button"
                className="btn"
                disabled={!syncStatus.available || busy}
                onClick={() => setStep('create')}
              >
                {es.onboardingCreateChoice}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                disabled={!syncStatus.available || busy}
                onClick={() => setStep('join')}
              >
                {es.onboardingJoinChoice}
              </button>
            </div>
            {syncStatus.available && auth.available && !session.auth ? (
              <>
                <p className="onboarding__divider" aria-hidden>
                  {es.onboardingOr}
                </p>
                <div className="btn-row">
                  <button
                    type="button"
                    className="btn btn--google"
                    disabled={busy}
                    onClick={() => void signInWithGoogle()}
                  >
                    {es.signInGoogle}
                  </button>
                </div>
                <p className="onboarding__hint">{es.onboardingGoogleHint}</p>
              </>
            ) : null}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy}
                onClick={() => setStep('welcome')}
              >
                {es.onboardingBack}
              </button>
            </div>
          </>
        )}

        {step === 'create' && (
          <>
            <h1 className="onboarding__title">{es.onboardingCreateTitle}</h1>
            {!syncStatus.available && (
              <p className="onboarding__hint onboarding__hint--warn">
                {es.onboardingFirebaseMissing}
              </p>
            )}
            <label className="onboarding__label" htmlFor="onboardName">
              {es.onboardingNameLabel}
            </label>
            <input
              id="onboardName"
              className="onboarding__input"
              maxLength={20}
              autoComplete="given-name"
              placeholder={es.onboardingNamePlaceholder}
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                disabled={busy || !syncStatus.available}
                onClick={() => void createHome()}
              >
                {busy ? es.onboardingBusy : es.onboardingCreateAction}
              </button>
            </div>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--ghost"
                disabled={busy}
                onClick={() => setStep('choice')}
              >
                {es.onboardingBack}
              </button>
            </div>
          </>
        )}

        {step === 'join' && (
          <>
            <h1 className="onboarding__title">{es.onboardingJoinTitle}</h1>
            {!syncStatus.available && (
              <p className="onboarding__hint onboarding__hint--warn">
                {es.onboardingFirebaseMissing}
              </p>
            )}
            <label className="onboarding__label" htmlFor="onboardJoinName">
              {es.onboardingNameLabel}
            </label>
            <input
              id="onboardJoinName"
              className="onboarding__input"
              maxLength={20}
              autoComplete="given-name"
              placeholder={es.onboardingNamePlaceholder}
              value={name}
              disabled={busy}
              onChange={(event) => setName(event.target.value)}
            />
            <label className="onboarding__label" htmlFor="onboardJoinCode">
              {es.onboardingCodeLabel}
            </label>
            <input
              id="onboardJoinCode"
              className="onboarding__input"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={es.onboardingCodePlaceholder}
              value={joinCode}
              disabled={busy}
              onChange={(event) => setJoinCode(event.target.value)}
            />
            <div className="btn-row">
              <button
                type="button"
                className="btn"
                disabled={busy || !syncStatus.available}
                onClick={() => void joinHome()}
              >
                {busy ? es.onboardingBusy : es.onboardingJoinAction}
              </button>
            </div>
            {!pendingJoinCode && (
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busy}
                  onClick={() => setStep('choice')}
                >
                  {es.onboardingBack}
                </button>
              </div>
            )}
          </>
        )}

        {step === 'invite' && session.room && (
          <>
            <h1 className="onboarding__title">{es.onboardingInviteTitle}</h1>
            <p className="onboarding__body">{es.onboardingInviteBody}</p>
            <div className="onboarding__code">{session.room}</div>
            <div className="btn-row">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void copyRoomCode(session.room!, showToast)}
              >
                {es.copyCode}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => void shareRoomLink(session.room!, showToast)}
              >
                {es.shareLink}
              </button>
            </div>
            <div className="btn-row">
              <button type="button" className="btn" onClick={finish}>
                {es.onboardingDone}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={finish}
              >
                {es.onboardingSkip}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
