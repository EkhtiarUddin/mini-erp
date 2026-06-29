import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { Sale } from '@/types'

interface DashboardStats {
  totalProducts: number
  totalCustomers: number
  totalSuppliers: number
  totalPurchases: number
  totalSales: number
  totalRevenue: number
  lowStockProducts: number
  pendingPurchases: number
}

interface MonthlyData {
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

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalCustomers: 0,
    totalSuppliers: 0,
    totalPurchases: 0,
    totalSales: 0,
    totalRevenue: 0,
    lowStockProducts: 0,
    pendingPurchases: 0,
  })
  const [recentSales, setRecentSales] = useState<Sale[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      // 1. Get all counts in parallel
      const [
        productsRes,
        customersRes,
        suppliersRes,
        purchasesRes,
        salesRes,
        lowStockRes,
        pendingRes,
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

      // 2. Recent Sales
      const { data: recentData } = await supabase
        .from('sales')
        .select('*, customer:customers(name)')
        .order('created_at', { ascending: false })
        .limit(5)
      setRecentSales(recentData || [])

      // 3. Monthly Data (last 6 months)
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

      const monthly = months.map(({ month, monthNum }) => {
        const monthSales = allSales?.filter(s => new Date(s.created_at).getMonth() + 1 === monthNum) || []
        const monthPurchases = allPurchases?.filter(p => new Date(p.created_at).getMonth() + 1 === monthNum) || []
        return {
          month,
          sales: monthSales.length,
          revenue: monthSales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.grand_total, 0),
          purchases: monthPurchases.reduce((sum, p) => sum + p.total_amount, 0),
        }
      })
      setMonthlyData(monthly)

      // 4. Top Products
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('quantity, total_price, product:products(name)')

      if (saleItems) {
        const productMap = new Map<string, { quantity: number; revenue: number }>()
        saleItems.forEach((item: any) => {
          const name = item.product?.name || 'Unknown'
          const existing = productMap.get(name) || { quantity: 0, revenue: 0 }
          productMap.set(name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.total_price,
          })
        })
        const top = Array.from(productMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5)
        setTopProducts(top)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return {
    stats,
    recentSales,
    monthlyData,
    topProducts,
    loading,
    refresh: loadDashboardData,
  }
}
