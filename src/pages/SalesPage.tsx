import { useState, useEffect, useRef } from 'react'
import { Eye, Edit2, Trash2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { StatsCards } from '@/components/common/StatsCards'
import { DataTable } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SaleForm } from '@/components/forms/SaleForm'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { useTable } from '@/hooks/useTable'
import { useStats } from '@/hooks/useStats'
import { saleService } from '@/services/saleService'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type { Sale } from '@/types'

type SortKey = 'default' | 'created_at' | 'invoice_number' | 'grand_total' | 'status' | 'sale_date' | 'customer'
type SortDir = 'asc' | 'desc'

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Sale | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const table = useTable({
    data: sales,
    searchKeys: ['invoice_number', 'status', 'payment_method'],
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    table.setCurrentPage(1)
  }, [statusFilter, sortKey, sortDir])

  const loadData = async () => {
    setLoading(true)
    try {
      const [salesData, customersData, productsData] = await Promise.all([
        saleService.getAll(),
        saleService.getCustomers(),
        saleService.getProducts(),
      ])
      setSales(salesData)
      setCustomers(customersData)
      setProducts(productsData)
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const statsConfig = [
    { key: 'all', label: 'Total Sales', filter: () => true, isDefault: true },
    { key: 'paid', label: 'Paid', filter: (s: Sale) => s.status === 'paid', color: 'green' as const },
    { key: 'unpaid', label: 'Unpaid', filter: (s: Sale) => s.status === 'unpaid', color: 'yellow' as const },
    { key: 'cancelled', label: 'Cancelled', filter: (s: Sale) => s.status === 'cancelled', color: 'red' as const },
  ]

  const stats = useStats(sales, statsConfig)
  const totalRevenue = sales.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.grand_total, 0)

  const filteredData = (() => {
    let filtered = table.paginatedItems as Sale[]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }
    
    if (sortKey === 'default') {
      return filtered
    }
    
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortKey as keyof Sale]
      let bVal: any = b[sortKey as keyof Sale]
      
      if (sortKey === 'customer') {
        aVal = (a.customer as any)?.name || ''
        bVal = (b.customer as any)?.name || ''
      }
      
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  })()

  const handleSort = (key: string) => {
    if (key === 'default') {
      setSortKey('default')
      setSortDir('asc')
      return
    }
    
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key as SortKey)
      setSortDir('asc')
    }
  }

  const columns = [
    { 
      key: 'invoice_number', 
      header: 'Invoice', 
      render: (s: Sale) => <span className="font-mono text-xs font-semibold text-primary">{s.invoice_number}</span>,
    },
    { 
      key: 'customer', 
      header: 'Customer', 
      render: (s: Sale) => (s.customer as any)?.name || 'Walk-in Customer',
    },
    { 
      key: 'sale_date', 
      header: 'Date', 
      render: (s: Sale) => formatDate(s.sale_date),
    },
    { 
      key: 'payment_method', 
      header: 'Payment', 
      render: (s: Sale) => <span className="capitalize">{s.payment_method}</span>
    },
    { 
      key: 'grand_total', 
      header: 'Total', 
      render: (s: Sale) => <span className="font-semibold">{formatCurrency(s.grand_total)}</span>
    },
    { 
      key: 'status', 
      header: 'Status', 
      render: (s: Sale) => (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>
          {s.status}
        </span>
      ),

    },
    { 
      key: 'actions', 
      header: 'Actions', 
      className: 'text-right',
      render: (s: Sale) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(s); setViewDialogOpen(true) }}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelected(s); setDeleteDialogOpen(true) }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) 
    },
  ]

  const openCreate = () => {
    setIsEdit(false)
    setSelected(null)
    setDialogOpen(true)
  }

  const openEdit = (sale: Sale) => {
    setIsEdit(true)
    setSelected(sale)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const sub = data.items.reduce((s: number, i: any) => s + i.quantity * i.unit_price, 0)
      const disc = sub * ((data.discount || 0) / 100)
      const tax = (sub - disc) * ((data.tax || 0) / 100)
      const grand = sub - disc + tax

      for (const item of data.items) {
        const product = products.find((p: any) => p.id === item.product_id)
        if (product && item.quantity > product.stock_quantity) {
          throw new Error(`Insufficient stock for "${product.name}"`)
        }
      }

      const invoice_number = selected?.invoice_number || `INV-${Date.now().toString().slice(-8)}`

      if (selected) {
        for (const oldItem of selected.sale_items || []) {
          await saleService.updateProductStock(oldItem.product_id, oldItem.quantity)
        }
        if (selected.customer_id) {
          await saleService.updateCustomerTotal(selected.customer_id, -selected.grand_total)
        }

        await saleService.update(selected.id, {
          customer_id: data.customer_id || null,
          sale_date: data.sale_date,
          status: data.status,
          payment_method: data.payment_method,
          discount: data.discount || 0,
          tax: data.tax || 0,
          total_amount: sub,
          grand_total: grand,
          notes: data.notes || null,
        })

        await saleService.deleteSaleItems(selected.id)
        await saleService.createSaleItems(selected.id, data.items)
      } else {
        const newSale = await saleService.create({
          customer_id: data.customer_id || null,
          invoice_number,
          sale_date: data.sale_date,
          status: data.status,
          payment_method: data.payment_method,
          discount: data.discount || 0,
          tax: data.tax || 0,
          total_amount: sub,
          grand_total: grand,
          notes: data.notes || null,
        })

        await saleService.createSaleItems(newSale.id, data.items)
      }

      for (const item of data.items) {
        await saleService.updateProductStock(item.product_id, -item.quantity)
      }

      if (data.customer_id) {
        await saleService.updateCustomerTotal(data.customer_id, grand)
      }

      toast({ title: isEdit ? 'Sale updated' : 'Sale created' })
      setDialogOpen(false)
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    try {
      for (const item of selected.sale_items || []) {
        await saleService.updateProductStock(item.product_id, item.quantity)
      }
      if (selected.customer_id) {
        await saleService.updateCustomerTotal(selected.customer_id, -selected.grand_total)
      }
      await saleService.delete(selected.id)
      toast({ title: 'Sale deleted' })
      setDeleteDialogOpen(false)
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Sales" count={sales.length} onAdd={openCreate} addLabel="New Sale" />

      <StatsCards 
        stats={stats} 
        activeFilter={statusFilter} 
        onFilterChange={(key) => setStatusFilter(key)} 
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Revenue (Paid)</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <SearchBar 
            value={table.search} 
            onChange={table.setSearch} 
            placeholder="Search by invoice, customer, status..." 
          />
          <Select
            value={`${sortKey}_${sortDir}`}
            onValueChange={(v) => {
              const parts = v.split('_')
              const dir = parts.pop() as SortDir
              const key = parts.join('_') as SortKey
              setSortKey(key)
              setSortDir(key === 'default' ? 'asc' : dir)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default_asc">Default</SelectItem>
              <SelectItem value="created_at_desc">Newest First</SelectItem>
              <SelectItem value="created_at_asc">Oldest First</SelectItem>
              <SelectItem value="grand_total_desc">Highest Amount</SelectItem>
              <SelectItem value="grand_total_asc">Lowest Amount</SelectItem>
              <SelectItem value="invoice_number_asc">Invoice A → Z</SelectItem>
              <SelectItem value="invoice_number_desc">Invoice Z → A</SelectItem>
              <SelectItem value="customer_asc">Customer A → Z</SelectItem>
              <SelectItem value="customer_desc">Customer Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
          emptyMessage="No sales found"
          emptyIcon={<Receipt className="h-12 w-12" />}
          currentPage={table.currentPage}
          totalItems={table.totalItems}
          pageSize={table.pageSize}
          onPageChange={table.handlePageChange}
          onPageSizeChange={table.handlePageSizeChange}
          onSort={handleSort}
          sortKey={sortKey}
          sortDirection={sortDir}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Sale / Invoice' : 'New Sale / Invoice'}</DialogTitle>
            {isEdit && selected && (
              <p className="text-sm text-gray-500">Editing invoice: {selected.invoice_number}</p>
            )}
          </DialogHeader>
          <SaleForm
            defaultValues={selected ? {
              customer_id: selected.customer_id || '',
              sale_date: selected.sale_date.split('T')[0],
              status: selected.status,
              payment_method: selected.payment_method,
              discount: selected.discount || 0,
              tax: selected.tax || 0,
              notes: selected.notes || '',
              items: selected.sale_items?.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity,
                unit_price: i.unit_price,
              })) || [{ product_id: '', quantity: 1, unit_price: 0 }],
            } : undefined}
            customers={customers}
            products={products}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isEdit={isEdit}
            isSaving={saving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Invoice</DialogTitle>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </DialogHeader>
          {selected && (
            <div ref={invoiceRef} className="space-y-6 p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-primary">INVOICE</h2>
                  <p className="text-sm text-gray-500 font-mono">{selected.invoice_number}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">Mini ERP System</p>
                  <p className="text-sm text-gray-500">{formatDate(selected.sale_date)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Bill To</p>
                  <p className="font-semibold">{(selected.customer as any)?.name || 'Walk-in Customer'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Payment Info</p>
                  <p className="text-sm"><span className="text-gray-500">Method:</span> <span className="capitalize font-medium">{selected.payment_method}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Status:</span> <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(selected.status)}`}>{selected.status}</span></p>
                </div>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="p-2 text-left text-white">Item</th>
                    <th className="p-2 text-center text-white">Qty</th>
                    <th className="p-2 text-right text-white">Unit Price</th>
                    <th className="p-2 text-right text-white">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.sale_items?.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">
                        <p className="font-medium">{(item.product as any)?.name}</p>
                        <p className="text-xs text-gray-500">{(item.product as any)?.sku}</p>
                      </td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(selected.total_amount)}</span></div>
                  {selected.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount ({selected.discount}%)</span><span>-{formatCurrency(selected.total_amount * selected.discount / 100)}</span></div>}
                  {selected.tax > 0 && <div className="flex justify-between text-orange-600"><span>Tax ({selected.tax}%)</span><span>+{formatCurrency((selected.total_amount - selected.total_amount * selected.discount / 100) * selected.tax / 100)}</span></div>}
                  <div className="border-t pt-2 flex justify-between font-bold text-base bg-primary/5 px-3 py-2 rounded">
                    <span>Grand Total</span><span className="text-primary">{formatCurrency(selected.grand_total)}</span>
                  </div>
                </div>
              </div>
              {selected.notes && <div className="bg-gray-50 rounded p-3 text-sm text-gray-600"><strong>Notes:</strong> {selected.notes}</div>}
              <div className="text-center text-xs text-gray-400 border-t pt-4">Thank you for your business! — Mini ERP System</div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button>
            <Button onClick={() => window.print()}>Print Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Sale"
        description={`Delete invoice ${selected?.invoice_number}? Stock will be restored.`}
        onDelete={handleDelete}
      />
    </div>
  )
}
