import { useEffect, useState, useRef } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Eye, Trash2, Receipt, Loader2, X, Printer, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
import { formatCurrency, formatDate, generateInvoiceNumber, getStatusColor } from '@/lib/utils'
import type { Sale, Customer, Product } from '@/types'

const saleSchema = z.object({
  customer_id: z.string().optional(),
  sale_date: z.string().min(1, 'Date required'),
  status: z.enum(['paid', 'unpaid', 'cancelled']),
  payment_method: z.string().min(1, 'Payment method required'),
  discount: z.number().min(0).max(100),
  tax: z.number().min(0).max(100),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().min(1, 'Product required'),
    quantity: z.number().int().min(1),
    unit_price: z.number().min(0),
  })).min(1, 'Add at least one item'),
})
type SaleForm = z.infer<typeof saleSchema>

function SortIcon({ column, sort }: { column: string; sort: { key: string; direction: string } }) {
  if (sort.key !== column) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />
  return sort.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Sale | null>(null)
  const [saving, setSaving] = useState(false)
  const invoiceRef = useRef<HTMLDivElement>(null)

  const {
    search, setSearch,
    sort, handleSort,
    currentPage, pageSize, totalItems,
    paginatedItems,
    handlePageChange, handlePageSizeChange,
  } = useTableControls(
    sales as unknown as Record<string, unknown>[],
    ['invoice_number', 'status', 'payment_method'],
    { key: 'created_at', direction: 'desc' }
  )

  const { register, handleSubmit, reset, watch, setValue, control, formState: { errors } } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sale_date: new Date().toISOString().split('T')[0],
      status: 'paid',
      payment_method: 'cash',
      discount: undefined as unknown as number,
      tax: undefined as unknown as number,
      items: [{ product_id: '', quantity: 1, unit_price: undefined as unknown as number }],
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const watchDiscount = watch('discount') || 0
  const watchTax = watch('tax') || 0

  const subtotal = watchedItems.reduce((sum, i) => sum + (i.quantity || 0) * (i.unit_price || 0), 0)
  const discountAmount = subtotal * (watchDiscount / 100)
  const taxAmount = (subtotal - discountAmount) * (watchTax / 100)
  const grandTotal = subtotal - discountAmount + taxAmount

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [salesRes, custRes, prodRes] = await Promise.all([
      supabase.from('sales').select('*, customer:customers(name), sale_items(*, product:products(name,sku))'),
      supabase.from('customers').select('id,name').order('name'),
      supabase.from('products').select('id,name,sku,unit_price,stock_quantity').order('name'),
    ])
    setSales((salesRes.data as unknown as Sale[]) || [])
    setCustomers((custRes.data as unknown as Customer[]) || [])
    setProducts((prodRes.data as unknown as Product[]) || [])
    setLoading(false)
  }

  const openCreate = () => {
    setSelected(null)
    reset({
      customer_id: '',
      sale_date: new Date().toISOString().split('T')[0],
      status: 'paid',
      payment_method: 'cash',
      discount: undefined as unknown as number,
      tax: undefined as unknown as number,
      notes: '',
      items: [{ product_id: '', quantity: 1, unit_price: undefined as unknown as number }],
    })
    setDialogOpen(true)
  }

  const onSubmit = async (data: SaleForm) => {
    setSaving(true)
    try {
      const sub = data.items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const disc = sub * ((data.discount || 0) / 100)
      const tax = (sub - disc) * ((data.tax || 0) / 100)
      const grand = sub - disc + tax

      // Check stock
      for (const item of data.items) {
        const product = products.find(p => p.id === item.product_id)
        if (product && item.quantity > product.stock_quantity) {
          throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stock_quantity}`)
        }
      }

      const invoice_number = selected?.invoice_number || generateInvoiceNumber()

      if (selected) {
        // Restore old stock
        for (const oldItem of selected.sale_items || []) {
          const product = products.find(p => p.id === oldItem.product_id)
          if (product) await supabase.from('products').update({ stock_quantity: product.stock_quantity + oldItem.quantity }).eq('id', oldItem.product_id)
        }
        // Restore old customer total
        if (selected.customer_id) {
          const cust = customers.find(c => c.id === selected.customer_id)
          if (cust) await supabase.from('customers').update({ total_purchases: Math.max(0, cust.total_purchases - selected.grand_total) }).eq('id', selected.customer_id)
        }
        const { error } = await supabase.from('sales').update({
          customer_id: data.customer_id || null, sale_date: data.sale_date,
          status: data.status, payment_method: data.payment_method,
          discount: data.discount || 0, tax: data.tax || 0,
          total_amount: sub, grand_total: grand, notes: data.notes || null,
          updated_at: new Date().toISOString(),
        }).eq('id', selected.id)
        if (error) throw error
        await supabase.from('sale_items').delete().eq('sale_id', selected.id)
        await supabase.from('sale_items').insert(data.items.map(i => ({ sale_id: selected.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, total_price: i.quantity * i.unit_price })))
        toast({ title: 'Sale updated' })
      } else {
        const { data: newSale, error } = await supabase.from('sales').insert({
          customer_id: data.customer_id || null, invoice_number,
          sale_date: data.sale_date, status: data.status,
          payment_method: data.payment_method, discount: data.discount || 0,
          tax: data.tax || 0, total_amount: sub, grand_total: grand,
          notes: data.notes || null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        }).select().single()
        if (error) throw error
        await supabase.from('sale_items').insert(data.items.map(i => ({ sale_id: newSale.id, product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price, total_price: i.quantity * i.unit_price })))
        toast({ title: 'Sale created', description: `Invoice: ${invoice_number}` })
      }

      // Deduct stock
      for (const item of data.items) {
        const product = products.find(p => p.id === item.product_id)
        if (product) await supabase.from('products').update({ stock_quantity: Math.max(0, product.stock_quantity - item.quantity), updated_at: new Date().toISOString() }).eq('id', item.product_id)
      }

      // Update customer total
      if (data.customer_id) {
        const cust = customers.find(c => c.id === data.customer_id)
        if (cust) await supabase.from('customers').update({ total_purchases: cust.total_purchases + grand, updated_at: new Date().toISOString() }).eq('id', data.customer_id)
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
    for (const item of selected.sale_items || []) {
      const product = products.find(p => p.id === item.product_id)
      if (product) await supabase.from('products').update({ stock_quantity: product.stock_quantity + item.quantity }).eq('id', item.product_id)
    }
    if (selected.customer_id) {
      const cust = customers.find(c => c.id === selected.customer_id)
      if (cust) await supabase.from('customers').update({ total_purchases: Math.max(0, cust.total_purchases - selected.grand_total) }).eq('id', selected.customer_id)
    }
    await supabase.from('sale_items').delete().eq('sale_id', selected.id)
    await supabase.from('sales').delete().eq('id', selected.id)
    toast({ title: 'Sale deleted' })
    setDeleteDialogOpen(false)
    loadData()
  }

  const typedPaginated = paginatedItems as unknown as Sale[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Sales</h1><p className="text-sm text-gray-500">{sales.length} total sales</p></div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Sale</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Total Sales</p><p className="text-2xl font-bold">{sales.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Paid</p><p className="text-2xl font-bold text-green-600">{sales.filter(s => s.status === 'paid').length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Unpaid</p><p className="text-2xl font-bold text-red-600">{sales.filter(s => s.status === 'unpaid').length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Revenue</p><p className="text-lg font-bold text-green-700">{formatCurrency(sales.filter(s => s.status === 'paid').reduce((s, sale) => s + sale.grand_total, 0))}</p></CardContent></Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by invoice, status, payment..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select
              value={`${sort.key}_${sort.direction}`}
              onValueChange={v => { const [key, dir] = v.split('_'); handleSort(key); if (dir !== sort.direction) handleSort(key) }}
            >
              <SelectTrigger className="w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
                <SelectItem value="created_at_asc">Oldest First</SelectItem>
                <SelectItem value="grand_total_desc">Highest Amount</SelectItem>
                <SelectItem value="grand_total_asc">Lowest Amount</SelectItem>
                <SelectItem value="status_asc">Status A → Z</SelectItem>
                <SelectItem value="invoice_number_asc">Invoice A → Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center py-16"><Receipt className="h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-500">No sales found</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('invoice_number')}>Invoice <SortIcon column="invoice_number" sort={sort} /></button></TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('sale_date')}>Date <SortIcon column="sale_date" sort={sort} /></button></TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('grand_total')}>Total <SortIcon column="grand_total" sort={sort} /></button></TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('status')}>Status <SortIcon column="status" sort={sort} /></button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typedPaginated.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{s.invoice_number}</TableCell>
                      <TableCell>{(s.customer as unknown as { name: string })?.name || 'Walk-in Customer'}</TableCell>
                      <TableCell>{formatDate(s.sale_date)}</TableCell>
                      <TableCell className="capitalize">{s.payment_method}</TableCell>
                      <TableCell className="font-semibold">{formatCurrency(s.grand_total)}</TableCell>
                      <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(s.status)}`}>{s.status}</span></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelected(s); setViewDialogOpen(true) }}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelected(s); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      {/* Create Sale Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Sale / Invoice</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Customer</Label>
                <Select onValueChange={v => setValue('customer_id', v === 'walkin' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Walk-in customer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walkin">Walk-in Customer</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Date *</Label><Input type="date" {...register('sale_date')} /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select onValueChange={v => setValue('status', v as 'paid' | 'unpaid' | 'cancelled')} defaultValue="paid">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Payment Method</Label>
                <Select onValueChange={v => setValue('payment_method', v)} defaultValue="cash">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Discount %</Label><Input type="number" min="0" max="100" step="0.1" placeholder="0" {...register('discount', { valueAsNumber: true })} /></div>
              <div className="space-y-1"><Label>Tax %</Label><Input type="number" min="0" max="100" step="0.1" placeholder="0" {...register('tax', { valueAsNumber: true })} /></div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-base font-semibold">Sale Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ product_id: '', quantity: 1, unit_price: undefined as unknown as number })}><Plus className="h-3.5 w-3.5 mr-1" /> Add Item</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader><TableRow className="bg-gray-50"><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Unit Price</TableHead><TableHead>Total</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id}>
                        <TableCell className="p-2">
                          <Select onValueChange={v => { setValue(`items.${index}.product_id`, v); const p = products.find(pr => pr.id === v); if (p) setValue(`items.${index}.unit_price`, p.unit_price) }} defaultValue={field.product_id}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select product" /></SelectTrigger>
                            <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — Stock: {p.stock_quantity}{p.stock_quantity === 0 ? ' ⚠️' : ''}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2"><Input type="number" min="1" placeholder="1" className="h-8 w-20 text-xs" {...register(`items.${index}.quantity`, { valueAsNumber: true })} /></TableCell>
                        <TableCell className="p-2"><Input type="number" step="0.01" min="0" placeholder="0.00" className="h-8 w-28 text-xs" {...register(`items.${index}.unit_price`, { valueAsNumber: true })} /></TableCell>
                        <TableCell className="p-2 text-sm font-medium">{formatCurrency((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unit_price || 0))}</TableCell>
                        <TableCell className="p-2">{fields.length > 1 && <button type="button" onClick={() => remove(index)} className="text-gray-400 hover:text-destructive"><X className="h-4 w-4" /></button>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {errors.items && <p className="text-sm text-destructive mt-1">{errors.items.message}</p>}
            </div>

            {/* Totals */}
            <div className="flex gap-4">
              <div className="flex-1 space-y-1"><Label>Notes</Label><Textarea placeholder="Optional notes..." {...register('notes')} rows={3} /></div>
              <div className="bg-gray-50 rounded-lg p-4 min-w-[200px] space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-green-600"><span>Discount ({watchDiscount || 0}%)</span><span>-{formatCurrency(discountAmount)}</span></div>
                <div className="flex justify-between text-orange-600"><span>Tax ({watchTax || 0}%)</span><span>+{formatCurrency(taxAmount)}</span></div>
                <div className="border-t pt-2 flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">{formatCurrency(grandTotal)}</span></div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              ⚡ Stock will be automatically deducted when this sale is saved.
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Sale & Invoice</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invoice View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Invoice</DialogTitle>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Print</Button>
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
                  <p className="font-semibold">{(selected.customer as unknown as { name: string })?.name || 'Walk-in Customer'}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Payment Info</p>
                  <p className="text-sm"><span className="text-gray-500">Method:</span> <span className="capitalize font-medium">{selected.payment_method}</span></p>
                  <p className="text-sm"><span className="text-gray-500">Status:</span> <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(selected.status)}`}>{selected.status}</span></p>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary">
                    <TableHead className="text-white">Item</TableHead>
                    <TableHead className="text-white text-center">Qty</TableHead>
                    <TableHead className="text-white text-right">Unit Price</TableHead>
                    <TableHead className="text-white text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.sale_items?.map(item => (
                    <TableRow key={item.id} className="border-b">
                      <TableCell>
                        <p className="font-medium">{(item.product as unknown as { name: string })?.name}</p>
                        <p className="text-xs text-gray-500">{(item.product as unknown as { sku: string })?.sku}</p>
                      </TableCell>
                      <TableCell className="text-center">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.total_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
            <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Sale</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete invoice <strong>{selected?.invoice_number}</strong>? Stock will be restored.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
