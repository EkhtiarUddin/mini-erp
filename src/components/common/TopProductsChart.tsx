import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface TopProductsChartProps {
  data: Array<{ name: string; quantity: number; revenue: number }>
  title?: string
  description?: string
  height?: number
}

export function TopProductsChart({ 
  data, 
  title = 'Top Selling Products',
  description = 'By revenue generated',
  height = 220 
}: TopProductsChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[220px] text-gray-400">
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
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="revenue"
              nameKey="name"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend
              formatter={(value: string) => (
                <span className="text-xs">{value.length > 15 ? value.slice(0, 15) + '...' : value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
