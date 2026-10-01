import type { AuthPort } from '@/domain/ports/AuthPort'
import type { AuthUser } from '@/domain/session/AuthUser'
import type { FirebaseWebConfig } from '@/infrastructure/config/firebaseConfig'
import { getFirebaseApp } from '@/infrastructure/firebase/firebaseApp'

function mapUser(user: {
  uid: string
  displayName: string | null
  email: string | null
  photoURL: string | null
} | null): AuthUser | null {
  if (!user) return null
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    photoURL: user.photoURL,
  }
}

export class NullAuth implements AuthPort {
  readonly available = false

  getUser(): AuthUser | null {
    return null
  }

  onAuthStateChanged(handler: (user: AuthUser | null) => void): () => void {
    handler(null)
    return () => {}
  }

  async signInWithGoogle(): Promise<AuthUser> {
    throw new Error('config')
  }

  async signOut(): Promise<void> {}

  async completeRedirectSignIn(): Promise<AuthUser | null> {
    return null
  }
}

export class FirebaseAuth implements AuthPort {
  readonly available = true
  private auth: import('firebase/auth').Auth | null = null
  private current: AuthUser | null = null

  constructor(private readonly config: FirebaseWebConfig) {}

  private async ensureAuth() {
    if (this.auth) return this.auth
    const [{ getAuth }, app] = await Promise.all([
      import('firebase/auth'),
      getFirebaseApp(this.config),
    ])
    this.auth = getAuth(app)
    return this.auth
  }

  getUser(): AuthUser | null {
    return this.current
  }

  onAuthStateChanged(handler: (user: AuthUser | null) => void): () => void {
    let unsub: (() => void) | null = null
    let cancelled = false

    void (async () => {
      const auth = await this.ensureAuth()
      if (cancelled) return
      const { onAuthStateChanged } = await import('firebase/auth')
      unsub = onAuthStateChanged(auth, (user) => {
        this.current = mapUser(user)
        handler(this.current)
      })
    })()

    return () => {
      cancelled = true
      unsub?.()
    }
  }

  async signInWithGoogle(): Promise<AuthUser> {
    const auth = await this.ensureAuth()
    const { GoogleAuthProvider, signInWithPopup, signInWithRedirect } =
      await import('firebase/auth')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    try {
      const result = await signInWithPopup(auth, provider)
      const mapped = mapUser(result.user)
      if (!mapped) throw new Error('auth')
      this.current = mapped
      return mapped
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: unknown }).code)
          : ''
      // Popup blocked / unsupported (common on iOS PWA) → redirect.
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, provider)
        throw new Error('redirect')
      }
      throw error
    }
  }

  async signOut(): Promise<void> {
    const auth = await this.ensureAuth()
    const { signOut } = await import('firebase/auth')
    await signOut(auth)
    this.current = null
  }

  async completeRedirectSignIn(): Promise<AuthUser | null> {
    const auth = await this.ensureAuth()
    const { getRedirectResult } = await import('firebase/auth')
    const result = await getRedirectResult(auth)
    const mapped = mapUser(result?.user ?? null)
    if (mapped) this.current = mapped
    return mapped
  }
}

export function createAuth(config: FirebaseWebConfig | null): AuthPort {
  return config ? new FirebaseAuth(config) : new NullAuth()
}
