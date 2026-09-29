export type NotificationPermissionState =
  | NotificationPermission
  | 'unsupported'

export interface NotificationPort {
  permission(): NotificationPermissionState
  requestPermission(): Promise<NotificationPermissionState>
  notifyNewTask(authorName: string, text: string, taskId: string): void
}
