import { useState, useEffect } from 'react'
import { Eye, Edit2, Trash2, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { StatsCards } from '@/components/common/StatsCards'
import { DataTable } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PurchaseForm } from '@/components/forms/PurchaseForm'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { useTable } from '@/hooks/useTable'
import { useStats } from '@/hooks/useStats'
import { purchaseService } from '@/services/purchaseService'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type { Purchase } from '@/types'

type SortKey = 'default' | 'created_at' | 'total_amount' | 'purchase_date' | 'supplier'
type SortDir = 'asc' | 'desc'

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Purchase | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  const table = useTable({
    data: purchases,
    searchKeys: ['status', 'notes'],
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
      const [purchasesData, suppliersData, productsData] = await Promise.all([
        purchaseService.getAll(),
        purchaseService.getSuppliers(),
        purchaseService.getProducts(),
      ])
      setPurchases(purchasesData)
      setSuppliers(suppliersData)
      setProducts(productsData)
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const statsConfig = [
    { key: 'all', label: 'Total Orders', filter: () => true, isDefault: true },
    { key: 'completed', label: 'Completed', filter: (p: Purchase) => p.status === 'completed', color: 'green' as const },
    { key: 'pending', label: 'Pending', filter: (p: Purchase) => p.status === 'pending', color: 'yellow' as const },
    { key: 'cancelled', label: 'Cancelled', filter: (p: Purchase) => p.status === 'cancelled', color: 'red' as const },
  ]

  const stats = useStats(purchases, statsConfig)
  const totalSpent = purchases.reduce((sum, p) => sum + p.total_amount, 0)

  const filteredData = (() => {
    let filtered = table.paginatedItems as Purchase[]
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }
    
    if (sortKey === 'default') {
      return filtered
    }
    
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortKey as keyof Purchase]
      let bVal: any = b[sortKey as keyof Purchase]
      
      if (sortKey === 'supplier') {
        aVal = (a.supplier as any)?.name || ''
        bVal = (b.supplier as any)?.name || ''
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
    { key: 'id', header: 'Order ID', render: (p: Purchase) => <span className="font-mono text-xs text-gray-500">{p.id.slice(0, 8)}...</span> },
    { key: 'supplier', header: 'Supplier', render: (p: Purchase) => (p.supplier as any)?.name || '-'},
    { key: 'purchase_date', header: 'Date', render: (p: Purchase) => formatDate(p.purchase_date)},
    { key: 'items', header: 'Items', render: (p: Purchase) => `${p.purchase_items?.length || 0} items` },
    { key: 'total_amount', header: 'Total', render: (p: Purchase) => <span className="font-semibold">{formatCurrency(p.total_amount)}</span>},
    { key: 'status', header: 'Status', render: (p: Purchase) => <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>{p.status}</span>},
    { key: 'actions', header: 'Actions', className: 'text-right', render: (p: Purchase) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(p); setViewDialogOpen(true) }}><Eye className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelected(p); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    ) },
  ]

  const openCreate = () => {
    setIsEdit(false)
    setSelected(null)
    setDialogOpen(true)
  }

  const openEdit = (purchase: Purchase) => {
    setIsEdit(true)
    setSelected(purchase)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      const total_amount = data.items.reduce((s: number, i: any) => s + i.quantity * i.unit_cost, 0)

      if (selected) {
        const wasCompleted = selected.status === 'completed'
        const isNowCompleted = data.status === 'completed'

        await purchaseService.update(selected.id, {
          supplier_id: data.supplier_id,
          purchase_date: data.purchase_date,
          status: data.status,
          notes: data.notes || null,
          total_amount,
        })

        if (wasCompleted) {
          for (const item of selected.purchase_items || []) {
            await purchaseService.updateProductStock(item.product_id, -item.quantity)
          }
          await purchaseService.updateSupplierTotal(selected.supplier_id, -selected.total_amount)
        }

        if (isNowCompleted) {
          for (const item of data.items) {
            await purchaseService.updateProductStock(item.product_id, item.quantity)
          }
          await purchaseService.updateSupplierTotal(data.supplier_id, total_amount)
        }

        await purchaseService.deletePurchaseItems(selected.id)
        await purchaseService.createPurchaseItems(selected.id, data.items)
      } else {
        const newPurchase = await purchaseService.create({
          supplier_id: data.supplier_id,
          purchase_date: data.purchase_date,
          status: data.status,
          notes: data.notes || null,
          total_amount,
        })

        await purchaseService.createPurchaseItems(newPurchase.id, data.items)

        if (data.status === 'completed') {
          for (const item of data.items) {
            await purchaseService.updateProductStock(item.product_id, item.quantity)
          }
          await purchaseService.updateSupplierTotal(data.supplier_id, total_amount)
        }
      }

      toast({ title: isEdit ? 'Purchase updated' : 'Purchase created' })
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
      if (selected.status === 'completed') {
        for (const item of selected.purchase_items || []) {
          await purchaseService.updateProductStock(item.product_id, -item.quantity)
        }
        await purchaseService.updateSupplierTotal(selected.supplier_id, -selected.total_amount)
      }
      await purchaseService.delete(selected.id)
      toast({ title: 'Purchase deleted' })
      setDeleteDialogOpen(false)
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Purchases" count={purchases.length} onAdd={openCreate} addLabel="New Purchase" />

      <StatsCards stats={stats} activeFilter={statusFilter} onFilterChange={(key) => setStatusFilter(key)} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Spent</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <SearchBar value={table.search} onChange={table.setSearch} placeholder="Search purchases..." />
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
              <SelectItem value="total_amount_desc">Highest Amount</SelectItem>
              <SelectItem value="total_amount_asc">Lowest Amount</SelectItem>
              <SelectItem value="supplier_asc">Supplier A → Z</SelectItem>
              <SelectItem value="supplier_desc">Supplier Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
          emptyMessage="No purchases found"
          emptyIcon={<ShoppingCart className="h-12 w-12" />}
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
            <DialogTitle>{isEdit ? 'Edit Purchase' : 'New Purchase Order'}</DialogTitle>
            {isEdit && selected && <p className="text-sm text-gray-500">Editing order: {selected.id.slice(0, 8)}</p>}
          </DialogHeader>
          <PurchaseForm
            defaultValues={selected ? {
              supplier_id: selected.supplier_id,
              purchase_date: selected.purchase_date.split('T')[0],
              status: selected.status,
              notes: selected.notes || '',
              items: selected.purchase_items?.map(i => ({
                product_id: i.product_id,
                quantity: i.quantity,
                unit_cost: i.unit_cost,
              })) || [{ product_id: '', quantity: 1, unit_cost: 0 }],
            } : undefined}
            suppliers={suppliers}
            products={products}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isEdit={isEdit}
            isSaving={saving}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Purchase Order Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Supplier:</span><p className="font-medium">{(selected.supplier as any)?.name}</p></div>
                <div><span className="text-gray-500">Date:</span><p className="font-medium">{formatDate(selected.purchase_date)}</p></div>
                <div><span className="text-gray-500">Status:</span><span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(selected.status)}`}>{selected.status}</span></div>
              </div>
              <table className="w-full">
                <thead><tr className="bg-gray-50"><th className="p-2 text-left">Product</th><th className="p-2 text-center">Qty</th><th className="p-2 text-right">Unit Cost</th><th className="p-2 text-right">Total</th></tr></thead>
                <tbody>
                  {selected.purchase_items?.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{(item.product as any)?.name}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(item.unit_cost)}</td>
                      <td className="p-2 text-right font-medium">{formatCurrency(item.total_cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right"><span className="text-gray-500 text-sm">Total: </span><span className="text-xl font-bold">{formatCurrency(selected.total_amount)}</span></div>
              {selected.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">Notes: {selected.notes}</p>}
            </div>
          )}
          <div className="flex justify-end"><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button></div>
        </DialogContent>
      </Dialog>

      <DeleteModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Purchase"
        description={`Delete this purchase? ${selected?.status === 'completed' ? 'Stock and supplier totals will be reverted.' : ''}`}
        onDelete={handleDelete}
      />
    </div>
  )
}
