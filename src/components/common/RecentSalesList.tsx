import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type { Sale } from '@/types'

interface RecentSalesListProps {
  sales: Sale[]
  title?: string
  description?: string
}

export function RecentSalesList({ 
  sales, 
  title = 'Recent Sales',
  description = 'Latest transactions'
}: RecentSalesListProps) {
  if (!sales || sales.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            No sales yet. Create your first sale!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{sale.invoice_number}</p>
                <p className="text-xs text-gray-500">
                  {(sale.customer as any)?.name || 'Walk-in Customer'} · {formatDate(sale.sale_date)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(sale.status)}`}>
                  {sale.status}
                </span>
                <span className="text-sm font-semibold">{formatCurrency(sale.grand_total)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
