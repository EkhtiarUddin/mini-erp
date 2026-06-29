import { useState, useEffect } from 'react'
import { Package, AlertTriangle, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/misc'
import { PageHeader } from '@/components/common/PageHeader'
import { StatsCards } from '@/components/common/StatsCards'
import { DataTable } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProductForm } from '@/components/forms/ProductForm'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { useTable } from '@/hooks/useTable'
import { useStats } from '@/hooks/useStats'
import { productService } from '@/services/productService'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { Product } from '@/types'

type SortKey = 'default' | 'name' | 'unit_price' | 'cost_price' | 'stock_quantity'
type SortDir = 'asc' | 'desc'
type StockFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [stockFilter, setStockFilter] = useState<StockFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Product | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  const table = useTable({
    data: products,
    searchKeys: ['name', 'sku', 'category'],
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    table.setCurrentPage(1)
  }, [stockFilter, sortKey, sortDir])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await productService.getAll()
      setProducts(data)
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const statsConfig = [
    { key: 'all', label: 'Total Products', filter: () => true, isDefault: true },
    { key: 'in_stock', label: 'In Stock', filter: (p: Product) => p.stock_quantity >= p.min_stock_level, color: 'green' as const },
    { key: 'low_stock', label: 'Low Stock', filter: (p: Product) => p.stock_quantity > 0 && p.stock_quantity < p.min_stock_level, color: 'yellow' as const },
    { key: 'out_of_stock', label: 'Out of Stock', filter: (p: Product) => p.stock_quantity === 0, color: 'red' as const },
  ]

  const stats = useStats(products, statsConfig)
  const totalValue = products.reduce((sum, p) => sum + p.stock_quantity * p.cost_price, 0)

  const filteredData = (() => {
    let filtered = table.paginatedItems as Product[]
    
    if (stockFilter === 'in_stock') {
      filtered = filtered.filter(p => p.stock_quantity >= p.min_stock_level)
    } else if (stockFilter === 'low_stock') {
      filtered = filtered.filter(p => p.stock_quantity > 0 && p.stock_quantity < p.min_stock_level)
    } else if (stockFilter === 'out_of_stock') {
      filtered = filtered.filter(p => p.stock_quantity === 0)
    }
    
    if (sortKey === 'default') {
      return filtered
    }
    
    return [...filtered].sort((a, b) => {
      let aVal: any = a[sortKey as keyof Product]
      let bVal: any = b[sortKey as keyof Product]
      
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
    { key: 'name', header: 'Product', render: (p: Product) => (
      <div>
        <p className="font-medium">{p.name}</p>
        {p.description && <p className="text-xs text-gray-500 truncate max-w-[180px]">{p.description}</p>}
      </div>
    ) },
    { key: 'sku', header: 'SKU', render: (p: Product) => <span className="font-mono text-sm">{p.sku}</span> },
    { key: 'category', header: 'Category', render: (p: Product) => p.category ? <Badge variant="secondary" className="text-xs">{p.category}</Badge> : '-' },
    { key: 'cost_price', header: 'Cost', render: (p: Product) => formatCurrency(p.cost_price) },
    { key: 'unit_price', header: 'Price', render: (p: Product) => <span className="font-medium">{formatCurrency(p.unit_price)}</span> },
    { key: 'stock_quantity', header: 'Stock', render: (p: Product) => <span><span className="font-medium">{p.stock_quantity}</span> <span className="text-gray-400 text-xs ml-1">{p.unit}</span></span> },
    { key: 'status', header: 'Status', render: (p: Product) => {
      if (p.stock_quantity === 0) return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
      if (p.stock_quantity < p.min_stock_level) return <div className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /><Badge variant="warning" className="text-xs">Low Stock</Badge></div>
      return <Badge variant="success" className="text-xs">In Stock</Badge>
    }},
    { key: 'actions', header: 'Actions', className: 'text-right', render: (p: Product) => (
      <div className="flex justify-end gap-1">
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

  const openEdit = (product: Product) => {
    setIsEdit(true)
    setSelected(product)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      if (selected) {
        await productService.update(selected.id, data)
        toast({ title: 'Product updated' })
      } else {
        await productService.create(data)
        toast({ title: 'Product created' })
      }
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
      const { usedInSales, usedInPurchases } = await productService.checkIfUsed(selected.id)
      if (usedInSales || usedInPurchases) {
        toast({ title: 'Cannot delete', description: 'Product is used in sales or purchases.', variant: 'destructive' })
        setDeleteDialogOpen(false)
        return
      }
      await productService.delete(selected.id)
      toast({ title: 'Product deleted' })
      setDeleteDialogOpen(false)
      loadData()
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Products" count={products.length} onAdd={openCreate} addLabel="Add Product" />

      <StatsCards stats={stats} activeFilter={stockFilter} onFilterChange={(key) => setStockFilter(key as StockFilter)} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm col-span-1">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Inventory Value</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalValue)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <SearchBar value={table.search} onChange={table.setSearch} placeholder="Search by name, SKU, category..." />
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
              <SelectItem value="name_asc">Name A → Z</SelectItem>
              <SelectItem value="name_desc">Name Z → A</SelectItem>
              <SelectItem value="unit_price_desc">Highest Price</SelectItem>
              <SelectItem value="unit_price_asc">Lowest Price</SelectItem>
              <SelectItem value="stock_quantity_desc">Most Stock</SelectItem>
              <SelectItem value="stock_quantity_asc">Least Stock</SelectItem>
              <SelectItem value="cost_price_desc">Highest Cost</SelectItem>
              <SelectItem value="cost_price_asc">Lowest Cost</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
          emptyMessage="No products found"
          emptyIcon={<Package className="h-12 w-12" />}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <ProductForm
            defaultValues={selected ? {
              name: selected.name,
              sku: selected.sku,
              description: selected.description || '',
              category: selected.category || '',
              unit_price: selected.unit_price,
              cost_price: selected.cost_price,
              stock_quantity: selected.stock_quantity,
              min_stock_level: selected.min_stock_level,
              unit: selected.unit,
            } : undefined}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
            isEdit={isEdit}
            isSaving={saving}
          />
        </DialogContent>
      </Dialog>

      <DeleteModal
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Product"
        description={`Delete ${selected?.name}? This cannot be undone.`}
        onDelete={handleDelete}
      />
    </div>
  )
}
