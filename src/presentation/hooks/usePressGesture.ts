import { useCallback, useRef, type TouchEvent, type MouseEvent, type KeyboardEvent } from 'react'

export function usePressGesture(onPress: () => void) {
  const timerRef = useRef<number | null>(null)
  const movedRef = useRef(false)
  const firedRef = useRef(false)
  const startRef = useRef({ x: 0, y: 0 })

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const onTouchStart = useCallback(
    (event: TouchEvent) => {
      movedRef.current = false
      firedRef.current = false
      startRef.current = {
        x: event.touches[0]!.clientX,
        y: event.touches[0]!.clientY,
      }
      timerRef.current = window.setTimeout(() => {
        if (!movedRef.current) {
          firedRef.current = true
          if (navigator.vibrate) navigator.vibrate(12)
          onPress()
        }
      }, 420)
    },
    [onPress],
  )

  const onTouchMove = useCallback((event: TouchEvent) => {
    const touch = event.touches[0]!
    if (
      Math.abs(touch.clientX - startRef.current.x) > 8 ||
      Math.abs(touch.clientY - startRef.current.y) > 8
    ) {
      movedRef.current = true
      clearTimer()
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    clearTimer()
  }, [])

  const onClick = useCallback(() => {
    if (firedRef.current) {
      firedRef.current = false
      return
    }
    onPress()
  }, [onPress])

  const onContextMenu = useCallback((event: MouseEvent) => {
    event.preventDefault()
  }, [])

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onPress()
      }
    },
    [onPress],
  )

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onClick,
    onContextMenu,
    onKeyDown,
    role: 'button' as const,
    tabIndex: 0,
  }
}
