import type { AppSession, PersonNames } from '../session/AppSession'
import type { Task } from '../task/Task'

export type SyncConnectMode = 'create' | 'join' | 'resume'

export interface RoomSnapshot {
  tasks: Task[]
  names?: PersonNames
}

export interface RoomSyncPort {
  readonly available: boolean
  readonly connected: boolean
  readonly isListening: boolean

  connect(code: string, mode: SyncConnectMode): Promise<RoomSnapshot | null>
  disconnect(): void
  push(session: AppSession): Promise<void>
  /** After create + initial push, begin listening for remote snapshots. */
  startListening(): Promise<void>
  subscribe(
    onSnapshot: (snapshot: RoomSnapshot) => void,
    onPermissionError: () => void,
  ): void
  onConnectionChange(handler: (connected: boolean) => void): () => void
}
