import { useState, useMemo } from 'react'

export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  const totalItems = items.length
  const totalPages = Math.ceil(totalItems / pageSize)

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, currentPage, pageSize])

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  // Reset to page 1 when items change (e.g. search filter)
  const resetPage = () => setCurrentPage(1)

  return {
    currentPage,
    pageSize,
    totalItems,
    paginatedItems,
    handlePageChange,
    handlePageSizeChange,
    resetPage,
  }
}
