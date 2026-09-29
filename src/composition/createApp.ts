import { LocalStorageSessionRepository } from '@/infrastructure/persistence/LocalStorageSessionRepository'
import { readFirebaseConfig } from '@/infrastructure/config/firebaseConfig'
import { createRoomSync } from '@/infrastructure/sync/RoomSync'
import { BrowserNotificationService } from '@/infrastructure/notifications/BrowserNotificationService'
import {
  createZustandSessionStorePort,
  useAppStore,
} from '@/presentation/store/appStore'
import { SessionUnitOfWork } from '@/application/SessionUnitOfWork'
import {
  GetSessionQuery,
  ListVisibleTasksQuery,
  GetTagCatalogQuery,
  GetSyncStatusQuery,
} from '@/application/queries'
import {
  CreateTaskMutation,
  CreateTasksMutation,
  UpdateTaskTextMutation,
  ToggleTaskDoneMutation,
  ToggleChecklistItemMutation,
  ToggleReactionMutation,
  DeleteTaskMutation,
  ClearDoneTasksMutation,
  SetFilterMutation,
  SaveNamesMutation,
  SwapPersonMutation,
  CreateSharedRoomMutation,
  JoinSharedRoomMutation,
  LeaveSharedRoomMutation,
  ApplyRemoteSnapshotMutation,
  BootSyncMutation,
  RequestNotificationsMutation,
  CompleteOnboardingMutation,
} from '@/application/mutations'

export function createApp() {
  const repository = new LocalStorageSessionRepository()
  const sync = createRoomSync(readFirebaseConfig())
  const notifications = new BrowserNotificationService()
  const storePort = createZustandSessionStorePort()

  const initial = repository.loadOrEmpty()
  useAppStore.getState().setSession(initial)
  repository.save(initial)

  const uow = new SessionUnitOfWork({
    repository,
    sync,
    notifications,
    store: storePort,
  })

  const applyRemoteSnapshot = new ApplyRemoteSnapshotMutation(uow)
  const joinSharedRoom = new JoinSharedRoomMutation(uow, applyRemoteSnapshot)
  const createSharedRoom = new CreateSharedRoomMutation(uow, applyRemoteSnapshot)

  sync.subscribe(
    (snapshot) => applyRemoteSnapshot.execute(snapshot),
    () => uow.toast('Sin permiso en Firebase: revisa las reglas'),
  )

  sync.onConnectionChange((connected) => {
    storePort.setSyncConnected(connected)
  })

  const useCases = {
    queries: {
      getSession: new GetSessionQuery(uow),
      listVisibleTasks: new ListVisibleTasksQuery(uow),
      getTagCatalog: new GetTagCatalogQuery(),
      getSyncStatus: new GetSyncStatusQuery(uow),
    },
    mutations: {
      createTask: new CreateTaskMutation(uow),
      createTasks: new CreateTasksMutation(uow),
      updateTaskText: new UpdateTaskTextMutation(uow),
      toggleTaskDone: new ToggleTaskDoneMutation(uow),
      toggleChecklistItem: new ToggleChecklistItemMutation(uow),
      toggleReaction: new ToggleReactionMutation(uow),
      deleteTask: new DeleteTaskMutation(uow),
      clearDoneTasks: new ClearDoneTasksMutation(uow),
      setFilter: new SetFilterMutation(uow),
      saveNames: new SaveNamesMutation(uow),
      swapPerson: new SwapPersonMutation(uow),
      createSharedRoom,
      joinSharedRoom,
      leaveSharedRoom: new LeaveSharedRoomMutation(uow),
      bootSync: new BootSyncMutation(uow, applyRemoteSnapshot, joinSharedRoom),
      requestNotifications: new RequestNotificationsMutation(uow),
      completeOnboarding: new CompleteOnboardingMutation(uow),
      applyRemoteSnapshot,
    },
  }

  const boot = async (): Promise<string | null> => {
    const pendingJoinCode = await useCases.mutations.bootSync.execute({
      confirmJoinDeepLink: () =>
        window.confirm(
          '¿Unirte a la casa compartida? Las tareas de este dispositivo se sustituirán por las de la casa.',
        ),
    })

    window.addEventListener('online', () => {
      if (useAppStore.getState().session.room) {
        void useCases.mutations.bootSync.execute({
          confirmJoinDeepLink: () => false,
        })
      }
    })

    return pendingJoinCode
  }

  return { useCases, boot, sync, notifications }
}

export type AppContainer = ReturnType<typeof createApp>
