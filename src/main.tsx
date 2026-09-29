import { StrictMode, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { createApp, type AppContainer } from '@/composition/createApp'
import { AppContainerProvider } from '@/presentation/app/AppContainerContext'
import { AppShell } from '@/presentation/app/AppShell'
import { OnboardingFlow } from '@/presentation/components/OnboardingFlow'
import { Toast } from '@/presentation/components/Toast'
import { useAppStore } from '@/presentation/store/appStore'
import '@/presentation/styles/main.scss'

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
}

const appSingleton: AppContainer = createApp()

function Root() {
  const [ready, setReady] = useState(false)
  const [pendingJoinCode, setPendingJoinCode] = useState<string | null>(null)
  const booting = useRef(false)
  const onboardingDone = useAppStore((s) => s.session.onboardingDone)

  useEffect(() => {
    if (booting.current) return
    booting.current = true
    void appSingleton.boot().then((code) => {
      setPendingJoinCode(code)
      setReady(true)
    })
  }, [])

  if (!ready) return null

  return (
    <AppContainerProvider value={appSingleton}>
      {onboardingDone ? (
        <AppShell />
      ) : (
        <>
          <OnboardingFlow pendingJoinCode={pendingJoinCode} />
          <Toast />
        </>
      )}
    </AppContainerProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
