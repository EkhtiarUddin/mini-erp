import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface PageHeaderProps {
  title: string
  count?: number
  onAdd?: () => void
  addLabel?: string
  children?: React.ReactNode
}

export function PageHeader({ title, count, onAdd, addLabel = 'Add New', children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {count !== undefined && <p className="text-sm text-gray-500">{count} total items</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" /> {addLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
