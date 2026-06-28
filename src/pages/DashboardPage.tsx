import { useEffect, useState } from 'react'
import {
  Package, Users, Truck, ShoppingCart, Receipt,
  DollarSign, TrendingUp, AlertTriangle, ArrowUpRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/misc'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type { Sale } from '@/types'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface Stats {
  totalProducts: number
  totalCustomers: number
  totalSuppliers: number
  totalPurchases: number
  totalSales: number
  totalRevenue: number
  lowStockProducts: number
  pendingPurchases: number
}

interface MonthlySales {
  month: string
  sales: number
  revenue: number
  purchases: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0, totalCustomers: 0, totalSuppliers: 0,
    totalPurchases: 0, totalSales: 0, totalRevenue: 0,
    lowStockProducts: 0, pendingPurchases: 0,
  })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // Fetch all counts in parallel
      const [
        productsRes, customersRes, suppliersRes,
        purchasesRes, salesRes, lowStockRes, pendingRes
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('suppliers').select('*', { count: 'exact', head: true }),
        supabase.from('purchases').select('*', { count: 'exact', head: true }),
        supabase.from('sales').select('grand_total').eq('status', 'paid'),
        supabase.from('products').select('*', { count: 'exact', head: true }).lt('stock_quantity', 10),
        supabase.from('purchases').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ])

      const totalRevenue = salesRes.data?.reduce((sum, s) => sum + (s.grand_total || 0), 0) || 0

      setStats({
        totalProducts: productsRes.count || 0,
        totalCustomers: customersRes.count || 0,
        totalSuppliers: suppliersRes.count || 0,
        totalPurchases: purchasesRes.count || 0,
        totalSales: salesRes.data?.length || 0,
        totalRevenue,
        lowStockProducts: lowStockRes.count || 0,
        pendingPurchases: pendingRes.count || 0,
      })

      // Recent sales
      const { data: recentData } = await supabase
        .from('sales')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentSales(recentData || [])

      // Monthly data (last 6 months)
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        months.push({
          month: d.toLocaleString('default', { month: 'short' }),
          year: d.getFullYear(),
          monthNum: d.getMonth() + 1,
        })
      }

      const { data: allSales } = await supabase
        .from('sales')
        .select('grand_total, created_at, status')
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())

      const { data: allPurchases } = await supabase
        .from('purchases')
        .select('total_amount, created_at')
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString())

      const monthlyData = months.map(({ month, monthNum }) => {
        const monthSales = allSales?.filter(s => new Date(s.created_at).getMonth() + 1 === monthNum) || []
        const monthPurchases = allPurchases?.filter(p => new Date(p.created_at).getMonth() + 1 === monthNum) || []
        return {
          month,
          sales: monthSales.length,
          revenue: monthSales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.grand_total, 0),
          purchases: monthPurchases.reduce((sum, p) => sum + p.total_amount, 0),
        }
      })
      setMonthlySales(monthlyData)

      // Top products by sales
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('quantity, total_price, product:products(name)')
      
      if (saleItems) {
        const productMap = new Map<string, { quantity: number; revenue: number }>()
        saleItems.forEach((item: { quantity: number; total_price: number; product: { name: string } | null }) => {
          const name = item.product?.name || 'Unknown'
          const existing = productMap.get(name) || { quantity: 0, revenue: 0 }
          productMap.set(name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.total_price,
          })
        })
        const topProds = Array.from(productMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
        setTopProducts(topProds)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    { title: 'Total Products', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Customers', value: stats.totalCustomers, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Suppliers', value: stats.totalSuppliers, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Total Purchases', value: stats.totalPurchases, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Total Sales', value: stats.totalSales, icon: Receipt, color: 'text-pink-600', bg: 'bg-pink-50' },
    { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', isAmount: true },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Alert banners */}
      {(stats.lowStockProducts > 0 || stats.pendingPurchases > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {stats.lowStockProducts > 0 && (
            <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span><strong>{stats.lowStockProducts}</strong> products with low stock (below 10 units)</span>
            </div>
          )}
          {stats.pendingPurchases > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm text-blue-800">
              <TrendingUp className="h-4 w-4 flex-shrink-0" />
              <span><strong>{stats.pendingPurchases}</strong> pending purchase orders</span>
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`${card.bg} rounded-lg p-2`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              </div>
              <p className="text-xs text-gray-500 mb-1">{card.title}</p>
              <p className={`font-bold ${card.isAmount ? 'text-base' : 'text-2xl'} text-gray-900`}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue & Purchases (6 months)</CardTitle>
            <CardDescription>Monthly financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={monthlySales}>
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
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#10b981" fill="url(#colorPurchases)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Volume */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sales Volume (6 months)</CardTitle>
            <CardDescription>Number of transactions per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="sales" name="Sales" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        {topProducts.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top Selling Products</CardTitle>
              <CardDescription>By revenue generated</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={topProducts}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    dataKey="revenue"
                    nameKey="name"
                  >
                    {topProducts.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend
                    formatter={(value: string) => <span className="text-xs">{value.length > 15 ? value.slice(0, 15) + '...' : value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Sales */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent Sales</CardTitle>
            <CardDescription>Latest transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No sales yet. Create your first sale!
              </div>
            ) : (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{sale.invoice_number}</p>
                      <p className="text-xs text-gray-500">
                        {(sale.customer as unknown as { name: string })?.name || 'Walk-in Customer'} · {formatDate(sale.sale_date)}
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
