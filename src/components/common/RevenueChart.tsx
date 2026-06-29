import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number; purchases: number }>
  title?: string
  description?: string
  height?: number
}

export function RevenueChart({ 
  data, 
  title = 'Revenue & Purchases (6 months)',
  description = 'Monthly financial overview',
  height = 250 
}: RevenueChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[250px] text-gray-400">
            No data available
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
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              name="Revenue" 
              stroke="#3b82f6" 
              fill="url(#colorRevenue)" 
              strokeWidth={2} 
            />
            <Area 
              type="monotone" 
              dataKey="purchases" 
              name="Purchases" 
              stroke="#10b981" 
              fill="url(#colorPurchases)" 
              strokeWidth={2} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
