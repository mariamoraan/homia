import type { GroupMembership } from '@/domain/session/GroupMembership'

export interface UserAccountPort {
  readonly available: boolean
  loadMemberships(uid: string): Promise<GroupMembership[]>
  saveMemberships(uid: string, memberships: GroupMembership[]): Promise<void>
}
