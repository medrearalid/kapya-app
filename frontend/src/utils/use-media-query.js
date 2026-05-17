import { useSyncExternalStore } from 'react'

const canUseMatchMedia =
  Boolean(globalThis.window) && typeof globalThis.window.matchMedia === 'function'

const getServerSnapshot = () => false

export const useMediaQuery = (query) => {
  const subscribe = (onStoreChange) => {
    if (!canUseMatchMedia) {
      return () => {}
    }

    const mediaQueryList = globalThis.window.matchMedia(query)
    const handleChange = () => {
      onStoreChange()
    }

    mediaQueryList.addEventListener('change', handleChange)

    return () => {
      mediaQueryList.removeEventListener('change', handleChange)
    }
  }

  const getSnapshot = () => {
    if (!canUseMatchMedia) {
      return false
    }

    return globalThis.window.matchMedia(query).matches
  }

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
