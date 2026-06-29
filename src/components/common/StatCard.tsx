import { Card, CardContent } from '@/components/ui/card'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  color: string
  bg: string
  isAmount?: boolean
}

export function StatCard({ title, value, icon: Icon, color, bg, isAmount }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`${bg} rounded-lg p-2`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <ArrowUpRight className="h-3 w-3 text-green-500" />
        </div>
        <p className="text-xs text-gray-500 mb-1">{title}</p>
        <p className={`font-bold ${isAmount ? 'text-base' : 'text-2xl'} text-gray-900`}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}
