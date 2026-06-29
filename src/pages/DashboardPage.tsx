import { useDashboard } from '@/hooks/useDashboard'
import { StatCard } from '@/components/common/StatCard'
import { AlertBanner } from '@/components/common/AlertBanner'
import { RevenueChart } from '@/components/common/RevenueChart'
import { SalesChart } from '@/components/common/SalesChart'
import { TopProductsChart } from '@/components/common/TopProductsChart'
import { RecentSalesList } from '@/components/common/RecentSalesList'
import { 
  Package, Users, Truck, ShoppingCart, 
  Receipt, DollarSign 
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function DashboardPage() {
  const { stats, recentSales, monthlyData, topProducts, loading } = useDashboard()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg h-28 animate-pulse shadow-sm" />
          ))}
        </div>
      </div>
    )
  }

  const statCards = [
    { title: 'Total Products', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Customers', value: stats.totalCustomers, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Suppliers', value: stats.totalSuppliers, icon: Truck, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Total Purchases', value: stats.totalPurchases, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Total Sales', value: stats.totalSales, icon: Receipt, color: 'text-pink-600', bg: 'bg-pink-50' },
    { title: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', isAmount: true },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
      </div>

      {/* Alert Banners */}
      {(stats.lowStockProducts > 0 || stats.pendingPurchases > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {stats.lowStockProducts > 0 && (
            <AlertBanner
              type="warning"
              message={
                <span>
                  <strong>{stats.lowStockProducts}</strong> products with low stock (below 10 units)
                </span>
              }
            />
          )}
          {stats.pendingPurchases > 0 && (
            <AlertBanner
              type="info"
              message={
                <span>
                  <strong>{stats.pendingPurchases}</strong> pending purchase orders
                </span>
              }
            />
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={monthlyData} />
        <SalesChart data={monthlyData} />
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsChart data={topProducts} />
        <RecentSalesList sales={recentSales} />
      </div>
    </div>
  )
}
