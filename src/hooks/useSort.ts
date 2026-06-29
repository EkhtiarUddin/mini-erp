import { useState, useCallback } from 'react'

export type SortDirection = 'asc' | 'desc'

interface SortConfig {
  key: string
  direction: SortDirection
}

export function useSort(defaultKey: string = 'created_at', defaultDirection: SortDirection = 'desc') {
  const [sort, setSort] = useState<SortConfig>({
    key: defaultKey,
    direction: defaultDirection,
  })

  const handleSort = useCallback((key: string) => {
    setSort(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }, [])

  return {
    sort,
    setSort,
    handleSort,
  }
}
