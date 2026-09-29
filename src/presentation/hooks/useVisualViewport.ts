import { useEffect } from 'react'

function syncVisualViewport() {
  const vv = window.visualViewport
  const root = document.documentElement
  if (!vv) {
    root.style.setProperty('--app-height', `${window.innerHeight}px`)
    root.style.setProperty('--vv-offset-top', '0px')
    return
  }
  root.style.setProperty('--app-height', `${vv.height}px`)
  root.style.setProperty('--vv-offset-top', `${vv.offsetTop}px`)
}

/** Keeps --app-height in sync with the visible viewport (mobile keyboard). */
export function useVisualViewport() {
  useEffect(() => {
    syncVisualViewport()
    const vv = window.visualViewport
    vv?.addEventListener('resize', syncVisualViewport)
    vv?.addEventListener('scroll', syncVisualViewport)
    window.addEventListener('resize', syncVisualViewport)
    return () => {
      vv?.removeEventListener('resize', syncVisualViewport)
      vv?.removeEventListener('scroll', syncVisualViewport)
      window.removeEventListener('resize', syncVisualViewport)
    }
  }, [])
}
