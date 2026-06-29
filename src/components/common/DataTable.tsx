import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Pagination from '@/components/ui/pagination'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T = any> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface DataTableProps<T = any> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  emptyMessage?: string
  emptyIcon?: React.ReactNode
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  onRowClick?: (item: T) => void
  onSort?: (key: string) => void
  sortKey?: string
  sortDirection?: 'asc' | 'desc'
  className?: string
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data found',
  emptyIcon,
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onSort,
  sortKey,
  sortDirection,
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center py-16">
        {emptyIcon && <div className="text-gray-300 mb-3">{emptyIcon}</div>}
        <p className="text-gray-500 font-medium">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.className,
                    col.sortable && "cursor-pointer hover:text-primary transition-colors select-none"
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, index) => (
              <TableRow
                key={index}
                onClick={() => onRowClick?.(item)}
                className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render ? col.render(item) : item[col.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Pagination
        currentPage={currentPage}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  )
}
