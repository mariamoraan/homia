import type { AppSession } from '@/domain/session/AppSession'
import type {
  RoomSnapshot,
  RoomSyncPort,
  SyncConnectMode,
} from '@/domain/ports/RoomSyncPort'
import { normalizeTask } from '@/domain/task/Task'
import type { FirebaseWebConfig } from '@/infrastructure/config/firebaseConfig'
import { getFirebaseApp } from '@/infrastructure/firebase/firebaseApp'

export class NullRoomSync implements RoomSyncPort {
  readonly available = false
  connected = false
  isListening = false

  async connect(): Promise<RoomSnapshot | null> {
    throw new Error('config')
  }

  disconnect(): void {}

  async push(_session: AppSession): Promise<void> {}

  async startListening(): Promise<void> {}

  subscribe(): void {}

  onConnectionChange(_handler: (connected: boolean) => void): () => void {
    return () => {}
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms),
    ),
  ])
}

export class FirebaseRoomSync implements RoomSyncPort {
  readonly available = true
  connected = false
  isListening = false

  private db: import('firebase/database').Database | null = null
  private roomRef: import('firebase/database').DatabaseReference | null = null
  private unsubscribeValue: (() => void) | null = null
  private ready = false
  private last: Record<string, string> = {}
  private lastNames = ''
  private connectionHandlers = new Set<(connected: boolean) => void>()
  private snapshotHandler: ((snapshot: RoomSnapshot) => void) | null = null
  private permissionErrorHandler: (() => void) | null = null

  constructor(private readonly config: FirebaseWebConfig) {}

  private async ensureDb() {
    if (this.db) return this.db
    const [{ getDatabase, onValue, ref }, app] = await Promise.all([
      import('firebase/database'),
      getFirebaseApp(this.config),
    ])

    this.db = getDatabase(app)

    const connectedRef = ref(this.db, '.info/connected')
    onValue(connectedRef, (snap) => {
      this.connected = !!snap.val()
      this.connectionHandlers.forEach((handler) => handler(this.connected))
    })

    return this.db
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.add(handler)
    handler(this.connected)
    return () => {
      this.connectionHandlers.delete(handler)
    }
  }

  subscribe(
    onSnapshot: (snapshot: RoomSnapshot) => void,
    onPermissionError: () => void,
  ): void {
    this.snapshotHandler = onSnapshot
    this.permissionErrorHandler = onPermissionError
  }

  private async attachListener(): Promise<void> {
    if (!this.roomRef) return
    if (this.unsubscribeValue !== null) return
    const { onValue } = await import('firebase/database')
    const roomRef = this.roomRef

    this.isListening = true

    try {
      await withTimeout(
        new Promise<void>((resolve, reject) => {
          let settled = false
          this.unsubscribeValue = onValue(
            roomRef,
            (snap) => {
              const value = (snap.val() ?? {}) as {
                tasks?: Record<string, unknown>
                names?: AppSession['names']
              }
              const tasks = Object.entries(value.tasks ?? {})
                .map(([id, task]) =>
                  normalizeTask(task as Parameters<typeof normalizeTask>[0], id),
                )
                .sort((a, b) => a.ts - b.ts)

              this.last = {}
              tasks.forEach((task) => {
                this.last[task.id] = JSON.stringify(task)
              })
              if (value.names) {
                this.lastNames = JSON.stringify(value.names)
              }
              this.ready = true
              this.snapshotHandler?.({
                tasks,
                names: value.names,
              })
              if (!settled) {
                settled = true
                resolve()
              }
            },
            () => {
              this.permissionErrorHandler?.()
              if (!settled) {
                settled = true
                reject(new Error('permission'))
              }
            },
          )
        }),
        10000,
      )
    } catch (error) {
      const unsub = this.unsubscribeValue as (() => void) | null
      this.unsubscribeValue = null
      unsub?.()
      this.isListening = false
      this.ready = false
      throw error
    }
  }

  async connect(code: string, mode: SyncConnectMode): Promise<RoomSnapshot | null> {
    const db = await this.ensureDb()
    const { ref, get } = await import('firebase/database')
    const roomRef = ref(db, `rooms/${code}`)

    if (mode === 'join') {
      const snapshot = await withTimeout(get(roomRef), 10000)
      const value = snapshot.val() as { names?: unknown; tasks?: unknown } | null
      if (!value || !value.names) throw new Error('nocode')
    }

    if (this.unsubscribeValue) {
      this.unsubscribeValue()
      this.unsubscribeValue = null
    }

    this.roomRef = roomRef
    this.isListening = false
    this.ready = mode === 'create'
    this.last = {}
    this.lastNames = ''

    if (mode === 'create') {
      // Caller pushes seed data first, then listening starts via attach after push.
      return null
    }

    await this.attachListener()
    return null
  }

  /** Start RTDB listener after an initial create push. */
  async startListening(): Promise<void> {
    await this.attachListener()
  }

  disconnect(): void {
    if (this.unsubscribeValue) {
      this.unsubscribeValue()
      this.unsubscribeValue = null
    }
    this.roomRef = null
    this.isListening = false
    this.ready = false
    this.last = {}
    this.lastNames = ''
  }

  async push(session: AppSession): Promise<void> {
    // Local-only mode (no shared room): nothing to sync.
    if (!this.roomRef) return
    if (!this.ready) {
      throw new Error('not-ready')
    }
    const { update } = await import('firebase/database')

    const current: Record<string, string> = {}
    const updates: Record<string, unknown> = {}

    session.tasks.forEach((task) => {
      const normalized = normalizeTask(task)
      current[task.id] = JSON.stringify(normalized)
      if (this.last[task.id] !== current[task.id]) {
        updates[`tasks/${task.id}`] = normalized
      }
    })

    Object.keys(this.last).forEach((id) => {
      if (!(id in current)) updates[`tasks/${id}`] = null
    })

    const namesJson = JSON.stringify(session.names)
    if (namesJson !== this.lastNames) {
      updates.names = session.names
    }

    if (Object.keys(updates).length === 0) return

    this.last = current
    this.lastNames = namesJson
    await update(this.roomRef, updates)
  }
}

export function createRoomSync(config: FirebaseWebConfig | null): RoomSyncPort {
  return config ? new FirebaseRoomSync(config) : new NullRoomSync()
}
