import { useState, useCallback } from 'react'

export function useFilters<T extends string = string>(defaultFilter: T = 'all' as T) {
  const [activeFilter, setActiveFilter] = useState<T>(defaultFilter)

  const handleFilterChange = useCallback((filter: T) => {
    setActiveFilter(prev => prev === filter ? defaultFilter : filter)
  }, [defaultFilter])

  const isFilterActive = useCallback((filter: T) => {
    return activeFilter === filter
  }, [activeFilter])

  return {
    activeFilter,
    setActiveFilter,
    handleFilterChange,
    isFilterActive,
  }
}
