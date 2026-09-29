import { create } from 'zustand'
import type { AppSession } from '@/domain/session/AppSession'
import { createEmptySession } from '@/domain/session/AppSession'
import type { SessionStorePort } from '@/application/ports/SessionStorePort'

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface UiState {
  session: AppSession
  syncConnected: boolean
  toastMessage: string | null
  toastToken: number
  stickScroll: boolean
  nearBottom: boolean
  settingsOpen: boolean
  menuTaskId: string | null
  menuExpanded: boolean
  editingTaskId: string | null
  installPrompt: BeforeInstallPromptEvent | null
}

interface UiActions {
  setSession: (session: AppSession) => void
  showToast: (message: string) => void
  clearToast: () => void
  setSyncConnected: (connected: boolean) => void
  setStickScroll: (value: boolean) => void
  setNearBottom: (value: boolean) => void
  setSettingsOpen: (open: boolean) => void
  openMenu: (taskId: string, expanded?: boolean) => void
  closeMenu: () => void
  setMenuExpanded: (expanded: boolean) => void
  startEdit: (taskId: string) => void
  stopEdit: () => void
  setInstallPrompt: (event: BeforeInstallPromptEvent | null) => void
}

export type AppStore = UiState & UiActions

export const useAppStore = create<AppStore>((set) => ({
  session: createEmptySession(),
  syncConnected: false,
  toastMessage: null,
  toastToken: 0,
  stickScroll: true,
  nearBottom: true,
  settingsOpen: false,
  menuTaskId: null,
  menuExpanded: false,
  editingTaskId: null,
  installPrompt: null,

  setSession: (session) => set({ session }),
  showToast: (message) =>
    set((state) => ({
      toastMessage: message,
      toastToken: state.toastToken + 1,
    })),
  clearToast: () => set({ toastMessage: null }),
  setSyncConnected: (connected) => set({ syncConnected: connected }),
  setStickScroll: (value) => set({ stickScroll: value }),
  setNearBottom: (value) => set({ nearBottom: value }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  openMenu: (taskId, expanded = false) =>
    set({ menuTaskId: taskId, menuExpanded: expanded }),
  closeMenu: () => set({ menuTaskId: null, menuExpanded: false }),
  setMenuExpanded: (expanded) => set({ menuExpanded: expanded }),
  startEdit: (taskId) => set({ editingTaskId: taskId }),
  stopEdit: () => set({ editingTaskId: null }),
  setInstallPrompt: (event) => set({ installPrompt: event }),
}))

export function createZustandSessionStorePort(
  getStore: () => AppStore = () => useAppStore.getState(),
): SessionStorePort {
  return {
    getSession: () => getStore().session,
    setSession: (session) => getStore().setSession(session),
    showToast: (message) => getStore().showToast(message),
    setSyncConnected: (connected) => getStore().setSyncConnected(connected),
    getSyncConnected: () => getStore().syncConnected,
    shouldStickScroll: () => getStore().nearBottom || getStore().stickScroll,
    setStickScroll: (value) => getStore().setStickScroll(value),
  }
}
