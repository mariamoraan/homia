import type { SessionUnitOfWork } from '@/application/SessionUnitOfWork'
import { filterTasks } from '@/domain/task/TaskFilters'
import type { Task } from '@/domain/task/Task'
import type { AppSession } from '@/domain/session/AppSession'
import {
  TAG_CATALOG,
  REACTION_ORDER,
  REACTION_LABELS,
  QUICK_REACTIONS,
  QUICK_STARTS,
} from '@/domain/catalog/TagCatalog'

export class GetSessionQuery {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(): AppSession {
    return this.uow.session
  }
}

export class ListVisibleTasksQuery {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute(): Task[] {
    const session = this.uow.session
    return filterTasks(session.tasks, session.filter)
  }
}

export class GetTagCatalogQuery {
  execute() {
    return {
      catalog: TAG_CATALOG,
      reactionOrder: REACTION_ORDER,
      labels: REACTION_LABELS,
      quickReactions: QUICK_REACTIONS,
      quickStarts: QUICK_STARTS,
    }
  }
}

export class GetSyncStatusQuery {
  constructor(private readonly uow: SessionUnitOfWork) {}

  execute() {
    return {
      available: this.uow.services.sync.available,
      connected: this.uow.services.store.getSyncConnected(),
      listening: this.uow.services.sync.isListening,
      room: this.uow.session.room,
    }
  }
}
