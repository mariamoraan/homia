import { createContext, useContext } from 'react'
import type { AppContainer } from '@/composition/createApp'

const AppContainerContext = createContext<AppContainer | null>(null)

export const AppContainerProvider = AppContainerContext.Provider

export function useAppContainer(): AppContainer {
  const value = useContext(AppContainerContext)
  if (!value) {
    throw new Error('AppContainerProvider is missing')
  }
  return value
}
