export interface FirebaseWebConfig {
  apiKey: string
  authDomain: string
  databaseURL: string
  projectId: string
  appId: string
}

export function readFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim()
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim()
  const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL?.trim().replace(
    /\/+$/,
    '',
  )
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim()
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim()

  if (!apiKey || !databaseURL) return null

  return {
    apiKey,
    authDomain: authDomain || '',
    databaseURL,
    projectId: projectId || '',
    appId: appId || '',
  }
}
