import type { FirebaseWebConfig } from '@/infrastructure/config/firebaseConfig'

let appPromise: Promise<import('firebase/app').FirebaseApp> | null = null

export function getFirebaseApp(
  config: FirebaseWebConfig,
): Promise<import('firebase/app').FirebaseApp> {
  if (!appPromise) {
    appPromise = import('firebase/app').then(({ initializeApp, getApps }) => {
      const existing = getApps()[0]
      return existing ?? initializeApp(config)
    })
  }
  return appPromise
}
