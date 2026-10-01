import type { AuthUser } from '@/domain/session/AuthUser'

export interface AuthPort {
  readonly available: boolean
  getUser(): AuthUser | null
  onAuthStateChanged(handler: (user: AuthUser | null) => void): () => void
  signInWithGoogle(): Promise<AuthUser>
  signOut(): Promise<void>
  /** Consume redirect result after Google redirect sign-in (mobile/PWA). */
  completeRedirectSignIn(): Promise<AuthUser | null>
}
