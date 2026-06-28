import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, Package, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge, Textarea } from '@/components/ui/misc'
import Pagination from '@/components/ui/pagination'
import { usePagination } from '@/hooks/usePagination'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, generateSKU } from '@/lib/utils'
import type { Product } from '@/types'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit_price: z.number().min(0),
  cost_price: z.number().min(0),
  stock_quantity: z.number().int().min(0),
  min_stock_level: z.number().int().min(0),
  unit: z.string().min(1, 'Unit is required'),
})
type ProductForm = z.infer<typeof productSchema>

const CATEGORIES = ['Electronics', 'Clothing', 'Food & Beverage', 'Office Supplies', 'Furniture', 'Tools', 'Other']
const UNITS = ['pcs', 'kg', 'liter', 'box', 'meter', 'set', 'pair']

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: { unit: 'pcs', min_stock_level: 10 },
  })

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const { currentPage, pageSize, totalItems, paginatedItems, handlePageChange, handlePageSizeChange, resetPage } = usePagination(filtered, 10)

  useEffect(() => { loadProducts() }, [])
  useEffect(() => { resetPage() }, [search])

  const loadProducts = async () => {
    setLoading(true)
    const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setSelectedProduct(null)
    reset({ unit: 'pcs', min_stock_level: 10, name: '', sku: '', description: '', category: '' })
    setDialogOpen(true)
  }

  const openEdit = (product: Product) => {
    setSelectedProduct(product)
    reset({
      name: product.name, sku: product.sku,
      description: product.description || '',
      category: product.category || '',
      unit_price: product.unit_price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity,
      min_stock_level: product.min_stock_level,
      unit: product.unit,
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: ProductForm) => {
    setSaving(true)
    try {
      if (selectedProduct) {
        const { error } = await supabase.from('products').update({ ...data, updated_at: new Date().toISOString() }).eq('id', selectedProduct.id)
        if (error) throw error
        toast({ title: 'Product updated' })
      } else {
        const { error } = await supabase.from('products').insert({ ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        if (error) throw error
        toast({ title: 'Product created' })
      }
      setDialogOpen(false)
      loadProducts()
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedProduct) return
    const { error } = await supabase.from('products').delete().eq('id', selectedProduct.id)
    if (error) {
      toast({ title: 'Cannot delete', description: 'Product may be used in sales or purchases.', variant: 'destructive' })
    } else {
      toast({ title: 'Product deleted' })
      loadProducts()
    }
    setDeleteDialogOpen(false)
  }

  const nameValue = watch('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-gray-500">{products.length} total products</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Product</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Total Products</p><p className="text-2xl font-bold">{products.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Low Stock</p><p className="text-2xl font-bold text-yellow-600">{products.filter(p => p.stock_quantity < p.min_stock_level).length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Out of Stock</p><p className="text-2xl font-bold text-red-600">{products.filter(p => p.stock_quantity === 0).length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Total Value</p><p className="text-lg font-bold text-green-600">{formatCurrency(products.reduce((s, p) => s + p.stock_quantity * p.cost_price, 0))}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search products..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16"><Package className="h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-500">No products found</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
                    <TableHead>Cost</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedItems.map(product => (
                    <TableRow key={product.id}>
                      <TableCell><div><p className="font-medium">{product.name}</p>{product.description && <p className="text-xs text-gray-500 truncate max-w-[180px]">{product.description}</p>}</div></TableCell>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>{product.category && <Badge variant="secondary" className="text-xs">{product.category}</Badge>}</TableCell>
                      <TableCell>{formatCurrency(product.cost_price)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(product.unit_price)}</TableCell>
                      <TableCell><span className="font-medium">{product.stock_quantity}</span><span className="text-gray-400 text-xs ml-1">{product.unit}</span></TableCell>
                      <TableCell>
                        {product.stock_quantity === 0 ? <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                          : product.stock_quantity < product.min_stock_level ? <div className="flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-yellow-500" /><Badge variant="warning" className="text-xs">Low Stock</Badge></div>
                          : <Badge variant="success" className="text-xs">In Stock</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(product)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelectedProduct(product); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2"><Label>Product Name *</Label><Input placeholder="Enter product name" {...register('name')} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
              <div className="space-y-2">
                <Label>SKU *</Label>
                <div className="flex gap-2">
                  <Input placeholder="e.g. LAP-0001" {...register('sku')} />
                  <Button type="button" variant="outline" size="sm" className="flex-shrink-0" onClick={() => setValue('sku', generateSKU(nameValue || 'PRD'))}>Generate</Button>
                </div>
                {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select onValueChange={v => setValue('category', v)} defaultValue={selectedProduct?.category || ''}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Cost Price *</Label><Input type="number" step="0.01" min="0" placeholder="0.00" {...register('cost_price', { valueAsNumber: true })} />{errors.cost_price && <p className="text-sm text-destructive">{errors.cost_price.message}</p>}</div>
              <div className="space-y-2"><Label>Unit Price *</Label><Input type="number" step="0.01" min="0" placeholder="0.00" {...register('unit_price', { valueAsNumber: true })} />{errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price.message}</p>}</div>
              <div className="space-y-2"><Label>Stock Quantity *</Label><Input type="number" min="0" placeholder="e.g. 100" {...register('stock_quantity', { valueAsNumber: true })} />{errors.stock_quantity && <p className="text-sm text-destructive">{errors.stock_quantity.message}</p>}</div>
              <div className="space-y-2"><Label>Min Stock Level</Label><Input type="number" min="0" placeholder="e.g. 10" {...register('min_stock_level', { valueAsNumber: true })} /></div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select defaultValue={selectedProduct?.unit || 'pcs'} onValueChange={v => setValue('unit', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea placeholder="Product description (optional)" {...register('description')} rows={3} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selectedProduct ? 'Update' : 'Create'} Product</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Product</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete <strong>{selectedProduct?.name}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
