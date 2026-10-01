import { useEffect } from 'react'
import { Header } from '@/presentation/components/Header'
import { FilterBar } from '@/presentation/components/FilterBar'
import { Chat } from '@/presentation/components/Chat'
import { Composer } from '@/presentation/components/Composer'
import { TaskMenu } from '@/presentation/components/TaskMenu'
import { SettingsSheet } from '@/presentation/components/SettingsSheet'
import { GroupSwitcherSheet } from '@/presentation/components/GroupSwitcherSheet'
import { Toast } from '@/presentation/components/Toast'
import { useAppStore, type BeforeInstallPromptEvent } from '@/presentation/store/appStore'
import { useVisualViewport } from '@/presentation/hooks/useVisualViewport'

export function AppShell() {
  const closeMenu = useAppStore((s) => s.closeMenu)
  const setSettingsOpen = useAppStore((s) => s.setSettingsOpen)
  const setGroupsOpen = useAppStore((s) => s.setGroupsOpen)
  const setInstallPrompt = useAppStore((s) => s.setInstallPrompt)
  const showToast = useAppStore((s) => s.showToast)

  useVisualViewport()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
        setSettingsOpen(false)
        setGroupsOpen(false)
      }
    }
    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstallPrompt(null)
      showToast('App instalada 🎉')
    }

    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('beforeinstallprompt', onInstallPrompt as EventListener)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('beforeinstallprompt', onInstallPrompt as EventListener)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [closeMenu, setSettingsOpen, setGroupsOpen, setInstallPrompt, showToast])

  return (
    <>
      <div className="app">
        <Header />
        <FilterBar />
        <Chat />
        <Composer />
      </div>
      <TaskMenu />
      <SettingsSheet />
      <GroupSwitcherSheet />
      <Toast />
    </>
  )
}
