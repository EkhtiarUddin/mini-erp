import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts'
import { Download, FileText, Package, Users, Truck, ShoppingCart, Receipt, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/misc'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

type ReportTab = 'products' | 'customers' | 'suppliers' | 'purchases' | 'sales'

interface ProductReport {
  id: string; name: string; sku: string; category: string | null
  stock_quantity: number; unit_price: number; cost_price: number
  total_value: number; total_sold: number; revenue: number
}
interface CustomerReport {
  id: string; name: string; email: string | null; city: string | null
  total_purchases: number; order_count: number; last_purchase: string | null
}
interface SupplierReport {
  id: string; name: string; contact_person: string | null; email: string | null
  total_supplied: number; order_count: number; last_order: string | null
}
interface PurchaseReport {
  month: string; total_orders: number; total_amount: number; completed: number; pending: number
}
interface SalesReport {
  month: string; total_orders: number; revenue: number; paid: number; unpaid: number
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('sales')
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState('all')

  const [productReport, setProductReport] = useState<ProductReport[]>([])
  const [customerReport, setCustomerReport] = useState<CustomerReport[]>([])
  const [supplierReport, setSupplierReport] = useState<SupplierReport[]>([])
  const [purchaseReport, setPurchaseReport] = useState<PurchaseReport[]>([])
  const [salesReport, setSalesReport] = useState<SalesReport[]>([])

  useEffect(() => { loadReport(activeTab) }, [activeTab, dateRange])

  const getDateFilter = () => {
    const now = new Date()
    if (dateRange === '7d') return new Date(now.setDate(now.getDate() - 7)).toISOString()
    if (dateRange === '30d') return new Date(now.setDate(now.getDate() - 30)).toISOString()
    if (dateRange === '90d') return new Date(now.setDate(now.getDate() - 90)).toISOString()
    if (dateRange === '1y') return new Date(now.setFullYear(now.getFullYear() - 1)).toISOString()
    return null
  }

  const loadReport = async (tab: ReportTab) => {
    setLoading(true)
    try {
      const dateFilter = getDateFilter()
      if (tab === 'products') {
        const { data: products } = await supabase.from('products').select('*').order('name')
        const { data: saleItems } = await supabase.from('sale_items').select('product_id, quantity, total_price')
        const soldMap = new Map<string, { qty: number; rev: number }>()
        saleItems?.forEach(i => {
          const e = soldMap.get(i.product_id) || { qty: 0, rev: 0 }
          soldMap.set(i.product_id, { qty: e.qty + i.quantity, rev: e.rev + i.total_price })
        })
        setProductReport((products || []).map(p => ({
          ...p,
          total_value: p.stock_quantity * p.cost_price,
          total_sold: soldMap.get(p.id)?.qty || 0,
          revenue: soldMap.get(p.id)?.rev || 0,
        })))
      }

      if (tab === 'customers') {
        const { data: customers } = await supabase.from('customers').select('*').order('total_purchases', { ascending: false })
        const { data: sales } = await supabase.from('sales').select('customer_id, created_at')
        const saleMap = new Map<string, { count: number; last: string }>()
        sales?.forEach(s => {
          if (!s.customer_id) return
          const e = saleMap.get(s.customer_id)
          saleMap.set(s.customer_id, {
            count: (e?.count || 0) + 1,
            last: !e || s.created_at > e.last ? s.created_at : e.last,
          })
        })
        setCustomerReport((customers || []).map(c => ({
          id: c.id, name: c.name, email: c.email, city: c.city,
          total_purchases: c.total_purchases,
          order_count: saleMap.get(c.id)?.count || 0,
          last_purchase: saleMap.get(c.id)?.last || null,
        })))
      }

      if (tab === 'suppliers') {
        const { data: suppliers } = await supabase.from('suppliers').select('*').order('total_supplied', { ascending: false })
        const { data: purchases } = await supabase.from('purchases').select('supplier_id, created_at')
        const purMap = new Map<string, { count: number; last: string }>()
        purchases?.forEach(p => {
          const e = purMap.get(p.supplier_id)
          purMap.set(p.supplier_id, {
            count: (e?.count || 0) + 1,
            last: !e || p.created_at > e.last ? p.created_at : e.last,
          })
        })
        setSupplierReport((suppliers || []).map(s => ({
          id: s.id, name: s.name, contact_person: s.contact_person, email: s.email,
          total_supplied: s.total_supplied,
          order_count: purMap.get(s.id)?.count || 0,
          last_order: purMap.get(s.id)?.last || null,
        })))
      }

      if (tab === 'purchases') {
        let query = supabase.from('purchases').select('total_amount, status, created_at')
        if (dateFilter) query = query.gte('created_at', dateFilter)
        const { data: purchases } = await query
        const monthMap = new Map<string, { total: number; amount: number; completed: number; pending: number }>()
        purchases?.forEach(p => {
          const month = new Date(p.created_at).toLocaleString('default', { month: 'short', year: '2-digit' })
          const e = monthMap.get(month) || { total: 0, amount: 0, completed: 0, pending: 0 }
          monthMap.set(month, {
            total: e.total + 1,
            amount: e.amount + p.total_amount,
            completed: e.completed + (p.status === 'completed' ? 1 : 0),
            pending: e.pending + (p.status === 'pending' ? 1 : 0),
          })
        })
        setPurchaseReport(Array.from(monthMap.entries()).map(([month, d]) => ({
          month, total_orders: d.total, total_amount: d.amount, completed: d.completed, pending: d.pending
        })))
      }

      if (tab === 'sales') {
        let query = supabase.from('sales').select('grand_total, status, created_at')
        if (dateFilter) query = query.gte('created_at', dateFilter)
        const { data: sales } = await query
        const monthMap = new Map<string, { total: number; revenue: number; paid: number; unpaid: number }>()
        sales?.forEach(s => {
          const month = new Date(s.created_at).toLocaleString('default', { month: 'short', year: '2-digit' })
          const e = monthMap.get(month) || { total: 0, revenue: 0, paid: 0, unpaid: 0 }
          monthMap.set(month, {
            total: e.total + 1,
            revenue: e.revenue + (s.status === 'paid' ? s.grand_total : 0),
            paid: e.paid + (s.status === 'paid' ? 1 : 0),
            unpaid: e.unpaid + (s.status === 'unpaid' ? 1 : 0),
          })
        })
        setSalesReport(Array.from(monthMap.entries()).map(([month, d]) => ({
          month, total_orders: d.total, revenue: d.revenue, paid: d.paid, unpaid: d.unpaid
        })))
      }
    } finally {
      setLoading(false)
    }
  }

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (!data.length) return
    const keys = Object.keys(data[0])
    const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${filename}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const tabs: { key: ReportTab; label: string; icon: React.ElementType }[] = [
    { key: 'sales', label: 'Sales Report', icon: Receipt },
    { key: 'purchases', label: 'Purchase Report', icon: ShoppingCart },
    { key: 'products', label: 'Product Report', icon: Package },
    { key: 'customers', label: 'Customer Report', icon: Users },
    { key: 'suppliers', label: 'Supplier Report', icon: Truck },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-gray-500">Business insights and data exports</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* SALES REPORT */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Orders', value: salesReport.reduce((s, r) => s + r.total_orders, 0) },
                  { label: 'Paid Orders', value: salesReport.reduce((s, r) => s + r.paid, 0), color: 'text-green-600' },
                  { label: 'Unpaid Orders', value: salesReport.reduce((s, r) => s + r.unpaid, 0), color: 'text-red-600' },
                  { label: 'Total Revenue', value: formatCurrency(salesReport.reduce((s, r) => s + r.revenue, 0)), color: 'text-green-700' },
                ].map(s => (
                  <Card key={s.label} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <p className="text-xs text-gray-500">{s.label}</p>
                      <p className={`text-xl font-bold ${s.color || ''}`}>{s.value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div><CardTitle className="text-base">Monthly Sales & Revenue</CardTitle><CardDescription>Sales performance over time</CardDescription></div>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(salesReport as unknown as Record<string, unknown>[], 'sales-report')}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {salesReport.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><FileText className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No sales data available</p></div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={salesReport}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: number, n: string) => n === 'revenue' ? formatCurrency(v) : v} />
                          <Legend />
                          <Line yAxisId="left" type="monotone" dataKey="total_orders" name="Orders" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                          <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                      <Table className="mt-4">
                        <TableHeader><TableRow>
                          <TableHead>Month</TableHead><TableHead>Total Orders</TableHead>
                          <TableHead>Paid</TableHead><TableHead>Unpaid</TableHead><TableHead className="text-right">Revenue</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {salesReport.map(r => (
                            <TableRow key={r.month}>
                              <TableCell className="font-medium">{r.month}</TableCell>
                              <TableCell>{r.total_orders}</TableCell>
                              <TableCell><Badge variant="success" className="text-xs">{r.paid}</Badge></TableCell>
                              <TableCell><Badge variant="destructive" className="text-xs">{r.unpaid}</Badge></TableCell>
                              <TableCell className="text-right font-semibold text-green-700">{formatCurrency(r.revenue)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* PURCHASE REPORT */}
          {activeTab === 'purchases' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Orders', value: purchaseReport.reduce((s, r) => s + r.total_orders, 0) },
                  { label: 'Completed', value: purchaseReport.reduce((s, r) => s + r.completed, 0), color: 'text-green-600' },
                  { label: 'Pending', value: purchaseReport.reduce((s, r) => s + r.pending, 0), color: 'text-yellow-600' },
                  { label: 'Total Spent', value: formatCurrency(purchaseReport.reduce((s, r) => s + r.total_amount, 0)), color: 'text-blue-700' },
                ].map(s => (
                  <Card key={s.label} className="border-0 shadow-sm"><CardContent className="p-4">
                    <p className="text-xs text-gray-500">{s.label}</p>
                    <p className={`text-xl font-bold ${s.color || ''}`}>{s.value}</p>
                  </CardContent></Card>
                ))}
              </div>
              <Card className="border-0 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div><CardTitle className="text-base">Monthly Purchase Orders</CardTitle></div>
                  <Button variant="outline" size="sm" onClick={() => exportCSV(purchaseReport as unknown as Record<string, unknown>[], 'purchase-report')}>
                    <Download className="h-4 w-4 mr-1" /> Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {purchaseReport.length === 0 ? (
                    <div className="text-center py-12 text-gray-400"><FileText className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>No purchase data available</p></div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={purchaseReport}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <Table className="mt-4">
                        <TableHeader><TableRow>
                          <TableHead>Month</TableHead><TableHead>Total Orders</TableHead>
                          <TableHead>Completed</TableHead><TableHead>Pending</TableHead><TableHead className="text-right">Total Spent</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>
                          {purchaseReport.map(r => (
                            <TableRow key={r.month}>
                              <TableCell className="font-medium">{r.month}</TableCell>
                              <TableCell>{r.total_orders}</TableCell>
                              <TableCell><Badge variant="success" className="text-xs">{r.completed}</Badge></TableCell>
                              <TableCell><Badge variant="warning" className="text-xs">{r.pending}</Badge></TableCell>
                              <TableCell className="text-right font-semibold text-blue-700">{formatCurrency(r.total_amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* PRODUCT REPORT */}
          {activeTab === 'products' && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div><CardTitle className="text-base">Product Inventory & Sales Report</CardTitle><CardDescription>{productReport.length} products</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => exportCSV(productReport as unknown as Record<string, unknown>[], 'product-report')}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 gap-4 p-6 pt-0">
                  <Card className="border bg-blue-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-blue-600">Inventory Value</p>
                    <p className="font-bold text-blue-800">{formatCurrency(productReport.reduce((s, p) => s + p.total_value, 0))}</p>
                  </CardContent></Card>
                  <Card className="border bg-green-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-green-600">Total Revenue</p>
                    <p className="font-bold text-green-800">{formatCurrency(productReport.reduce((s, p) => s + p.revenue, 0))}</p>
                  </CardContent></Card>
                  <Card className="border bg-purple-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-purple-600">Units Sold</p>
                    <p className="font-bold text-purple-800">{productReport.reduce((s, p) => s + p.total_sold, 0)}</p>
                  </CardContent></Card>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead><TableHead>Cost</TableHead><TableHead>Price</TableHead>
                    <TableHead>Sold</TableHead><TableHead className="text-right">Revenue</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {productReport.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell>{p.category ? <Badge variant="secondary" className="text-xs">{p.category}</Badge> : '-'}</TableCell>
                        <TableCell>
                          <span className={p.stock_quantity === 0 ? 'text-red-600 font-bold' : p.stock_quantity < 10 ? 'text-yellow-600 font-medium' : 'text-green-700 font-medium'}>
                            {p.stock_quantity}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(p.cost_price)}</TableCell>
                        <TableCell>{formatCurrency(p.unit_price)}</TableCell>
                        <TableCell>{p.total_sold}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">{formatCurrency(p.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* CUSTOMER REPORT */}
          {activeTab === 'customers' && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div><CardTitle className="text-base">Customer Report</CardTitle><CardDescription>{customerReport.length} customers</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => exportCSV(customerReport as unknown as Record<string, unknown>[], 'customer-report')}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 gap-4 p-6 pt-0">
                  <Card className="border bg-green-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-green-600">Total Revenue</p>
                    <p className="font-bold text-green-800">{formatCurrency(customerReport.reduce((s, c) => s + c.total_purchases, 0))}</p>
                  </CardContent></Card>
                  <Card className="border bg-blue-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-blue-600">Total Customers</p>
                    <p className="font-bold text-blue-800">{customerReport.length}</p>
                  </CardContent></Card>
                  <Card className="border bg-purple-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-purple-600">Avg. Purchase</p>
                    <p className="font-bold text-purple-800">{formatCurrency(customerReport.length ? customerReport.reduce((s, c) => s + c.total_purchases, 0) / customerReport.length : 0)}</p>
                  </CardContent></Card>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Customer</TableHead><TableHead>City</TableHead>
                    <TableHead>Orders</TableHead><TableHead>Last Purchase</TableHead><TableHead className="text-right">Total Spent</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {customerReport.map(c => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <p className="font-medium">{c.name}</p>
                          {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
                        </TableCell>
                        <TableCell>{c.city || '-'}</TableCell>
                        <TableCell>{c.order_count}</TableCell>
                        <TableCell className="text-sm text-gray-500">{c.last_purchase ? formatDate(c.last_purchase) : 'Never'}</TableCell>
                        <TableCell className="text-right font-semibold text-green-700">{formatCurrency(c.total_purchases)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* SUPPLIER REPORT */}
          {activeTab === 'suppliers' && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div><CardTitle className="text-base">Supplier Report</CardTitle><CardDescription>{supplierReport.length} suppliers</CardDescription></div>
                <Button variant="outline" size="sm" onClick={() => exportCSV(supplierReport as unknown as Record<string, unknown>[], 'supplier-report')}>
                  <Download className="h-4 w-4 mr-1" /> Export CSV
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 gap-4 p-6 pt-0">
                  <Card className="border bg-blue-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-blue-600">Total Supplied</p>
                    <p className="font-bold text-blue-800">{formatCurrency(supplierReport.reduce((s, sup) => s + sup.total_supplied, 0))}</p>
                  </CardContent></Card>
                  <Card className="border bg-green-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-green-600">Total Suppliers</p>
                    <p className="font-bold text-green-800">{supplierReport.length}</p>
                  </CardContent></Card>
                  <Card className="border bg-purple-50 shadow-none"><CardContent className="p-3">
                    <p className="text-xs text-purple-600">Total Orders</p>
                    <p className="font-bold text-purple-800">{supplierReport.reduce((s, sup) => s + sup.order_count, 0)}</p>
                  </CardContent></Card>
                </div>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Supplier</TableHead><TableHead>Contact</TableHead>
                    <TableHead>Orders</TableHead><TableHead>Last Order</TableHead><TableHead className="text-right">Total Supplied</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {supplierReport.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <p className="font-medium">{s.name}</p>
                          {s.email && <p className="text-xs text-gray-500">{s.email}</p>}
                        </TableCell>
                        <TableCell>{s.contact_person || '-'}</TableCell>
                        <TableCell>{s.order_count}</TableCell>
                        <TableCell className="text-sm text-gray-500">{s.last_order ? formatDate(s.last_order) : 'Never'}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-700">{formatCurrency(s.total_supplied)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
