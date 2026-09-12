import { useCallback, useState } from 'react'

const STORAGE_KEY = 'portfolio.collapsedSections'

function readCollapsed(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, boolean>
  } catch {
    return {}
  }
}

/** Remember which collapsible sections are collapsed (default: expanded). */
export function useCollapsed() {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(readCollapsed)

  const toggle = useCallback((key: string) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        // storage unavailable (private mode): keep in-memory state only
      }
      return next
    })
  }, [])

  const isCollapsed = useCallback((key: string) => collapsed[key] === true, [collapsed])

  return { collapsed, isCollapsed, toggle }
}
