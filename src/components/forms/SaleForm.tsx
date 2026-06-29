import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/misc'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils'
import type { Customer, Product } from '@/types'

const saleSchema = z.object({
  customer_id: z.string().optional(),
  sale_date: z.string().min(1, 'Date required'),
  status: z.enum(['paid', 'unpaid', 'cancelled']),
  payment_method: z.string().min(1, 'Payment method required'),
  discount: z.number().min(0).max(100).default(0),
  tax: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().min(1, 'Product required'),
    quantity: z.number().int().min(1),
    unit_price: z.number().min(0),
  })).min(1, 'Add at least one item'),
})

export type SaleFormData = z.infer<typeof saleSchema>

interface SaleFormProps {
  defaultValues?: Partial<SaleFormData>
  customers: Customer[]
  products: Product[]
  onSubmit: (data: SaleFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
  isSaving?: boolean
}

export function SaleForm({
  defaultValues,
  customers,
  products,
  onSubmit,
  onCancel,
  isEdit = false,
  isSaving = false,
}: SaleFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<SaleFormData>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      sale_date: new Date().toISOString().split('T')[0],
      status: 'paid',
      payment_method: 'cash',
      discount: undefined,  // ← FIXED: undefined instead of 0
      tax: undefined,       // ← FIXED: undefined instead of 0
      notes: '',
      items: [{ product_id: '', quantity: 1, unit_price: undefined }],  // ← FIXED: undefined instead of 0
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const watchDiscount = watch('discount') || 0
  const watchTax = watch('tax') || 0

  const subtotal = watchedItems?.reduce((sum, i) => sum + (i?.quantity || 0) * (i?.unit_price || 0), 0) || 0
  const discountAmount = subtotal * (watchDiscount / 100)
  const taxAmount = (subtotal - discountAmount) * (watchTax / 100)
  const grandTotal = subtotal - discountAmount + taxAmount

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Header Fields */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 space-y-1">
          <Label>Customer</Label>
          <Select
            onValueChange={v => setValue('customer_id', v === 'walkin' ? '' : v)}
            defaultValue={defaultValues?.customer_id || ''}
          >
            <SelectTrigger>
              <SelectValue placeholder="Walk-in customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walkin">Walk-in Customer</SelectItem>
              {customers.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Date *</Label>
          <Input type="date" {...register('sale_date')} />
          {errors.sale_date && <p className="text-sm text-destructive">{errors.sale_date.message}</p>}
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select
            onValueChange={v => setValue('status', v as 'paid' | 'unpaid' | 'cancelled')}
            defaultValue={defaultValues?.status || 'paid'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Payment Method</Label>
          <Select
            onValueChange={v => setValue('payment_method', v)}
            defaultValue={defaultValues?.payment_method || 'cash'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Discount %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            {...register('discount', { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-1">
          <Label>Tax %</Label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.1"
            placeholder="0"
            {...register('tax', { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Items Table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-base font-semibold">Sale Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: '', quantity: 1, unit_price: 0 })}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Product</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-28">Unit Price</TableHead>
                <TableHead className="w-24">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell className="p-2">
                    <Select
                      onValueChange={v => {
                        setValue(`items.${index}.product_id`, v)
                        const p = products.find(pr => pr.id === v)
                        if (p) setValue(`items.${index}.unit_price`, p.unit_price)
                      }}
                      defaultValue={field.product_id}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — Stock: {p.stock_quantity}
                            {p.stock_quantity === 0 && ' ⚠️'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="p-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="1"
                      className="h-8 w-20 text-xs"
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="h-8 w-28 text-xs"
                      {...register(`items.${index}.unit_price`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell className="p-2 text-sm font-medium">
                    {formatCurrency((watchedItems?.[index]?.quantity || 0) * (watchedItems?.[index]?.unit_price || 0))}
                  </TableCell>
                  <TableCell className="p-2">
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-gray-400 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {errors.items && <p className="text-sm text-destructive mt-1">{errors.items.message}</p>}
      </div>

      {/* Notes & Totals */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-1">
          <Label>Notes</Label>
          <Textarea placeholder="Optional notes..." {...register('notes')} rows={3} />
        </div>
        <div className="bg-gray-50 rounded-lg p-4 min-w-[200px] space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-green-600">
            <span>Discount ({watchDiscount || 0}%)</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
          <div className="flex justify-between text-orange-600">
            <span>Tax ({watchTax || 0}%)</span>
            <span>+{formatCurrency(taxAmount)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-base">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
        ⚡ Stock will be automatically deducted when this sale is saved.
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <span className="animate-spin mr-2">⟳</span>}
          {isEdit ? 'Update Sale' : 'Create Sale & Invoice'}
        </Button>
      </div>
    </form>
  )
}
