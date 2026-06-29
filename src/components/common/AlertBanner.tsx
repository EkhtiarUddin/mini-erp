import { AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AlertBannerProps {
  type: 'warning' | 'info'
  message: React.ReactNode
  className?: string
}

export function AlertBanner({ type, message, className }: AlertBannerProps) {
  const styles = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }

  const icons = {
    warning: <AlertTriangle className="h-4 w-4 flex-shrink-0" />,
    info: <TrendingUp className="h-4 w-4 flex-shrink-0" />,
  }

  return (
    <div className={cn(`flex items-center gap-2 border rounded-lg px-4 py-2.5 text-sm`, styles[type], className)}>
      {icons[type]}
      <span>{message}</span>
    </div>
  )
}
