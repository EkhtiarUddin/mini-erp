export interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
}

export interface Product {
  id: string
  name: string
  sku: string
  description: string | null
  category: string | null
  unit_price: number
  cost_price: number
  stock_quantity: number
  min_stock_level: number
  unit: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  total_purchases: number
  created_at: string
  updated_at: string
}

export interface Supplier {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  contact_person: string | null
  total_supplied: number
  created_at: string
  updated_at: string
}

export interface PurchaseItem {
  id?: string
  purchase_id?: string
  product_id: string
  product?: Product
  quantity: number
  unit_cost: number
  total_cost: number
}

export interface Purchase {
  id: string
  supplier_id: string
  supplier?: Supplier
  total_amount: number
  status: 'pending' | 'completed' | 'cancelled'
  notes: string | null
  purchase_date: string
  created_at: string
  updated_at: string
  purchase_items?: PurchaseItem[]
}

export interface SaleItem {
  id?: string
  sale_id?: string
  product_id: string
  product?: Product
  quantity: number
  unit_price: number
  total_price: number
}

export interface Sale {
  id: string
  customer_id: string | null
  customer?: Customer | null
  invoice_number: string
  total_amount: number
  discount: number
  tax: number
  grand_total: number
  status: 'paid' | 'unpaid' | 'cancelled'
  payment_method: string
  notes: string | null
  sale_date: string
  created_at: string
  updated_at: string
  sale_items?: SaleItem[]
}

export interface DashboardStats {
  totalProducts: number
  totalCustomers: number
  totalSuppliers: number
  totalPurchases: number
  totalSales: number
  totalRevenue: number
  lowStockProducts: number
  pendingPurchases: number
  recentSales: Sale[]
  monthlySalesData: { month: string; sales: number; revenue: number }[]
  topProducts: { name: string; quantity: number; revenue: number }[]
}

export interface ProductReport {
  id: string
  name: string
  sku: string
  category: string | null
  stock_quantity: number
  unit_price: number
  cost_price: number
  total_value: number
  total_sold: number
  revenue: number
}

export interface CustomerReport {
  id: string
  name: string
  email: string | null
  phone: string | null
  total_purchases: number
  total_orders: number
  last_purchase: string | null
}

export interface SupplierReport {
  id: string
  name: string
  email: string | null
  phone: string | null
  total_supplied: number
  total_orders: number
  last_order: string | null
}

export type SortDirection = 'asc' | 'desc'

export interface TableSort {
  column: string
  direction: SortDirection
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}
