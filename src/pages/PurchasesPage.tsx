import { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, ShoppingCart, Loader2, Eye, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/misc'
import Pagination from '@/components/ui/pagination'
import { useTableControls } from '@/hooks/useTableControls'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import type { Purchase, Supplier, Product } from '@/types'

const purchaseSchema = z.object({
  supplier_id: z.string().min(1, 'Supplier is required'),
  purchase_date: z.string().min(1, 'Date is required'),
  status: z.enum(['pending', 'completed', 'cancelled']),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().min(1, 'Product required'),
    quantity: z.number().int().min(1),
    unit_cost: z.number().min(0),
  })).min(1, 'Add at least one item'),
})
type PurchaseForm = z.infer<typeof purchaseSchema>

function SortIcon({ column, sort }: { column: string; sort: { key: string; direction: string } }) {
  if (sort.key !== column) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />
  return sort.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Purchase | null>(null)
  const [saving, setSaving] = useState(false)

  const { search, setSearch, sort, handleSort, currentPage, pageSize, totalItems, paginatedItems, handlePageChange, handlePageSizeChange } = useTableControls(
    purchases as unknown as Record<string, unknown>[],
    ['status', 'notes'],
    { key: 'created_at', direction: 'desc' }
  )

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<PurchaseForm>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: { status: 'pending', purchase_date: new Date().toISOString().split('T')[0], items: [{ product_id: '', quantity: 1, unit_cost: undefined as unknown as number }] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const totalAmount = watchedItems.reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_cost || 0), 0)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [purRes, supRes, prodRes] = await Promise.all([
      supabase.from('purchases').select('*, supplier:suppliers(name), purchase_items(*, product:products(name,sku))'),
      supabase.from('suppliers').select('id,name').order('name'),
      supabase.from('products').select('id,name,sku,cost_price,stock_quantity').order('name'),
    ])
    setPurchases((purRes.data as unknown as Purchase[]) || [])
    setSuppliers((supRes.data as unknown as Supplier[]) || [])
    setProducts((prodRes.data as unknown as Product[]) || [])
    setLoading(false)
  }

  const openCreate = () => {
    setSelected(null)
    reset({ supplier_id: '', purchase_date: new Date().toISOString().split('T')[0], status: 'pending', notes: '', items: [{ product_id: '', quantity: 1, unit_cost: undefined as unknown as number }] })
    setDialogOpen(true)
  }

  const openEdit = (p: Purchase) => {
    setSelected(p)
    reset({
      supplier_id: p.supplier_id, purchase_date: p.purchase_date.split('T')[0],
      status: p.status, notes: p.notes || '',
      items: p.purchase_items?.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost })) || [{ product_id: '', quantity: 1, unit_cost: undefined as unknown as number }],
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: PurchaseForm) => {
    setSaving(true)
    try {
      const total_amount = data.items.reduce((s, i) => s + i.quantity * i.unit_cost, 0)
      if (selected) {
        const { error } = await supabase.from('purchases').update({ supplier_id: data.supplier_id, purchase_date: data.purchase_date, status: data.status, notes: data.notes || null, total_amount, updated_at: new Date().toISOString() }).eq('id', selected.id)
        if (error) throw error
        if (data.status === 'completed' && selected.status !== 'completed') {
          for (const item of data.items) {
            const product = products.find(p => p.id === item.product_id)
            if (product) await supabase.from('products').update({ stock_quantity: product.stock_quantity + item.quantity }).eq('id', item.product_id)
          }
        }
        await supabase.from('purchase_items').delete().eq('purchase_id', selected.id)
        await supabase.from('purchase_items').insert(data.items.map(i => ({ purchase_id: selected.id, product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost, total_cost: i.quantity * i.unit_cost })))
        toast({ title: 'Purchase updated' })
      } else {
        const { data: newPurchase, error } = await supabase.from('purchases').insert({ supplier_id: data.supplier_id, purchase_date: data.purchase_date, status: data.status, notes: data.notes || null, total_amount, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select().single()
        if (error) throw error
        await supabase.from('purchase_items').insert(data.items.map(i => ({ purchase_id: newPurchase.id, product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost, total_cost: i.quantity * i.unit_cost })))
        if (data.status === 'completed') {
          for (const item of data.items) {
            const product = products.find(p => p.id === item.product_id)
            if (product) await supabase.from('products').update({ stock_quantity: product.stock_quantity + item.quantity, updated_at: new Date().toISOString() }).eq('id', item.product_id)
          }
          const supplier = suppliers.find(s => s.id === data.supplier_id)
          if (supplier) await supabase.from('suppliers').update({ total_supplied: supplier.total_supplied + total_amount, updated_at: new Date().toISOString() }).eq('id', data.supplier_id)
        }
        toast({ title: 'Purchase created' })
      }
      setDialogOpen(false)
      loadData()
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    if (selected.status === 'completed') {
      for (const item of selected.purchase_items || []) {
        const product = products.find(p => p.id === item.product_id)
        if (product) await supabase.from('products').update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity) }).eq('id', item.product_id)
      }
    }
    await supabase.from('purchase_items').delete().eq('purchase_id', selected.id)
    await supabase.from('purchases').delete().eq('id', selected.id)
    toast({ title: 'Purchase deleted' })
    setDeleteDialogOpen(false)
    loadData()
  }

  const typedPaginated = paginatedItems as unknown as Purchase[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Purchases</h1><p className="text-sm text-gray-500">{purchases.length} total orders</p></div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Purchase</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Total Orders</p><p className="text-2xl font-bold">{purchases.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Completed</p><p className="text-2xl font-bold text-green-600">{purchases.filter(p => p.status === 'completed').length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Pending</p><p className="text-2xl font-bold text-yellow-600">{purchases.filter(p => p.status === 'pending').length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Total Spent</p><p className="text-lg font-bold text-blue-600">{formatCurrency(purchases.reduce((s, p) => s + p.total_amount, 0))}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search purchases..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={`${sort.key}_${sort.direction}`} onValueChange={v => { const [key, dir] = v.split('_'); handleSort(key); if (dir !== sort.direction) handleSort(key) }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
                <SelectItem value="created_at_asc">Oldest First</SelectItem>
                <SelectItem value="total_amount_desc">Highest Amount</SelectItem>
                <SelectItem value="total_amount_asc">Lowest Amount</SelectItem>
                <SelectItem value="status_asc">Status A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center py-16"><ShoppingCart className="h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-500">No purchases found</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('purchase_date')}>Date <SortIcon column="purchase_date" sort={sort} /></button></TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('total_amount')}>Total <SortIcon column="total_amount" sort={sort} /></button></TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('status')}>Status <SortIcon column="status" sort={sort} /></button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typedPaginated.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-gray-500">{p.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-medium">{(p.supplier as unknown as { name: string })?.name || '-'}</TableCell>
                      <TableCell>{formatDate(p.purchase_date)}</TableCell>
                      <TableCell>{p.purchase_items?.length || 0} items</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(p.total_amount)}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(p.status)}`}>{p.status}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(p); setViewDialogOpen(true) }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelected(p); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination currentPage={currentPage} totalItems={totalItems} pageSize={pageSize} onPageChange={handlePageChange} onPageSizeChange={handlePageSizeChange} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selected ? 'Edit Purchase' : 'New Purchase Order'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select onValueChange={v => setValue('supplier_id', v)} defaultValue={selected?.supplier_id}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
                {errors.supplier_id && <p className="text-sm text-destructive">{errors.supplier_id.message}</p>}
              </div>
              <div className="space-y-2"><Label>Date *</Label><Input type="date" {...register('purchase_date')} /></div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select onValueChange={v => setValue('status', v as 'pending' | 'completed' | 'cancelled')} defaultValue={selected?.status || 'pending'}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: '', quantity: 1, unit_cost: undefined as unknown as number })}><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-gray-50"><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>Total</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="p-2">
                          <Select onValueChange={v => { setValue(`items.${index}.product_id`, v); const p = products.find(pr => pr.id === v); if (p) setValue(`items.${index}.unit_cost`, p.cost_price) }} defaultValue={field.product_id}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                            <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — Stock: {p.stock_quantity}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2"><Input type="number" min="1" placeholder="1" className="h-8 w-20 text-xs" {...register(`items.${index}.quantity`, { valueAsNumber: true })} /></TableCell>
                        <TableCell className="p-2"><Input type="number" step="0.01" min="0" placeholder="0.00" className="h-8 w-28 text-xs" {...register(`items.${index}.unit_cost`, { valueAsNumber: true })} /></TableCell>
                        <TableCell className="p-2 text-sm font-medium">{formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_cost || 0))}</TableCell>
                        <TableCell className="p-2">{fields.length > 1 && <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-destructive"><X className="h-4 w-4" /></button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {errors.items && <p className="text-sm text-destructive mt-1">{errors.items.message}</p>}
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2"><Label>Notes</Label><Textarea placeholder="Optional notes..." {...register('notes')} rows={2} /></div>
              <div className="bg-gray-50 rounded-lg p-4 text-right min-w-[160px]">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
              💡 Stock updates automatically when status is set to <strong>Completed</strong>.
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selected ? 'Update' : 'Create'} Purchase</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Purchase Order Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div><span className="text-gray-500">Supplier:</span><p className="font-medium">{(selected.supplier as unknown as { name: string })?.name}</p></div>
                <div><span className="text-gray-500">Date:</span><p className="font-medium">{formatDate(selected.purchase_date)}</p></div>
                <div><span className="text-gray-500">Status:</span><span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(selected.status)}`}>{selected.status}</span></div>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Unit Cost</TableHead><TableHead>Total</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selected.purchase_items?.map(item => (
                    <TableRow key={item.id}>
                      <TableCell>{(item.product as unknown as { name: string })?.name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatCurrency(item.unit_cost)}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.total_cost)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right"><span className="text-gray-500 text-sm">Total: </span><span className="text-xl font-bold">{formatCurrency(selected.total_amount)}</span></div>
              {selected.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">Notes: {selected.notes}</p>}
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setViewDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Purchase</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete this purchase? {selected?.status === 'completed' && <strong className="text-red-600">Stock will be reverted.</strong>}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
