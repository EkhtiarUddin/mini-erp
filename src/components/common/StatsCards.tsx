import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface StatItem {
  key: string
  label: string
  count: number
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  isDefault?: boolean
  icon?: React.ReactNode
}

interface StatsCardsProps {
  stats: StatItem[]
  activeFilter: string
  onFilterChange: (key: string) => void
  className?: string
}

export function StatsCards({ stats, activeFilter, onFilterChange, className }: StatsCardsProps) {
  const getColorClasses = (color?: string, isActive?: boolean) => {
    if (!isActive) return ''
    switch (color) {
      case 'green': return 'ring-2 ring-green-500 ring-offset-2 bg-green-50'
      case 'yellow': return 'ring-2 ring-yellow-500 ring-offset-2 bg-yellow-50'
      case 'red': return 'ring-2 ring-red-500 ring-offset-2 bg-red-50'
      case 'blue': return 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50'
      case 'purple': return 'ring-2 ring-purple-500 ring-offset-2 bg-purple-50'
      default: return ''
    }
  }

  const getTextColor = (color?: string) => {
    switch (color) {
      case 'green': return 'text-green-600'
      case 'yellow': return 'text-yellow-600'
      case 'red': return 'text-red-600'
      case 'blue': return 'text-blue-600'
      case 'purple': return 'text-purple-600'
      default: return ''
    }
  }

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {stats.map((stat) => {
        const isActive = activeFilter === stat.key
        const isDefault = stat.isDefault
        
        return (
          <Card
            key={stat.key}
            className={cn(
              "border-0 shadow-sm cursor-pointer transition-all hover:shadow-md",
              !isDefault && getColorClasses(stat.color, isActive)
            )}
            onClick={() => onFilterChange(isActive && !isDefault ? 'all' : stat.key)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className={cn("text-xs", isDefault ? "text-gray-500" : getTextColor(stat.color))}>
                  {stat.label}
                </p>
                {stat.icon && <span className="text-gray-400">{stat.icon}</span>}
              </div>
              <p className={cn("text-2xl font-bold", isDefault ? "" : getTextColor(stat.color))}>
                {stat.count}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
