import type {
  NotificationPermissionState,
  NotificationPort,
} from '@/domain/ports/NotificationPort'

export class BrowserNotificationService implements NotificationPort {
  permission(): NotificationPermissionState {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.permission
  }

  async requestPermission(): Promise<NotificationPermissionState> {
    if (!('Notification' in window)) return 'unsupported'
    return Notification.requestPermission()
  }

  notifyNewTask(authorName: string, text: string, taskId: string): void {
    const body = `${authorName}: ${text}`
    if (document.visibilityState === 'visible') {
      // Visible toasts are handled by the caller via SessionStorePort.
      return
    }
    if (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      navigator.serviceWorker
    ) {
      void navigator.serviceWorker.ready.then((registration) => {
        void registration.showNotification('Homia', {
          body,
          icon: '/icons/icon-192.png',
          tag: `homia-${taskId}`,
        })
      })
    }
  }
}
