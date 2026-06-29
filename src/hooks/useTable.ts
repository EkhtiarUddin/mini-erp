import { useState, useMemo, useEffect } from 'react'

interface UseTableOptions<T> {
  data: T[]
  searchKeys?: (keyof T)[]
  defaultPageSize?: number
}

export function useTable<T extends Record<string, any>>({
  data,
  searchKeys = [],
  defaultPageSize = 10,
}: UseTableOptions<T>) {
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // Reset page on search change
  useEffect(() => {
    setCurrentPage(1)
  }, [search])

  // Search filter
  const searched = useMemo(() => {
    if (!search.trim()) return data
    const q = search.toLowerCase()
    return data.filter((item) =>
      searchKeys.some((key) => {
        const val = item[key]
        return val != null && String(val).toLowerCase().includes(q)
      })
    )
  }, [data, search, searchKeys])

  // Paginate
  const totalItems = searched.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return searched.slice(start, start + pageSize)
  }, [searched, currentPage, pageSize])

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)))
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

  return {
    search,
    setSearch,
    currentPage,
    pageSize,
    totalItems,
    paginatedItems,
    handlePageChange,
    handlePageSizeChange,
    setCurrentPage,
  }
}
