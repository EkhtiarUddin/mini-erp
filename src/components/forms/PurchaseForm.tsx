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
import type { Supplier, Product } from '@/types'

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

export type PurchaseFormData = z.infer<typeof purchaseSchema>

interface PurchaseFormProps {
  defaultValues?: Partial<PurchaseFormData>
  suppliers: Supplier[]
  products: Product[]
  onSubmit: (data: PurchaseFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
  isSaving?: boolean
}

export function PurchaseForm({
  defaultValues,
  suppliers,
  products,
  onSubmit,
  onCancel,
  isEdit = false,
  isSaving = false,
}: PurchaseFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<PurchaseFormData>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      purchase_date: new Date().toISOString().split('T')[0],
      status: 'pending',
      notes: '',
      items: [{ product_id: '', quantity: 1, unit_cost: undefined }],  // ← FIXED: undefined instead of 0
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')
  const totalAmount = watchedItems?.reduce((sum, i) => sum + (i?.quantity || 0) * (i?.unit_cost || 0), 0) || 0

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Supplier *</Label>
          <Select
            onValueChange={v => setValue('supplier_id', v)}
            defaultValue={defaultValues?.supplier_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.supplier_id && <p className="text-sm text-destructive">{errors.supplier_id.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input type="date" {...register('purchase_date')} />
          {errors.purchase_date && <p className="text-sm text-destructive">{errors.purchase_date.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Status *</Label>
          <Select
            onValueChange={v => setValue('status', v as 'pending' | 'completed' | 'cancelled')}
            defaultValue={defaultValues?.status || 'pending'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-base font-semibold">Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ product_id: '', quantity: 1, unit_cost: 0 })}
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
                <TableHead className="w-28">Unit Cost</TableHead>
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
                        if (p) setValue(`items.${index}.unit_cost`, p.cost_price || 0)
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
                      {...register(`items.${index}.unit_cost`, { valueAsNumber: true })}
                    />
                  </TableCell>
                  <TableCell className="p-2 text-sm font-medium">
                    {formatCurrency((watchedItems?.[index]?.quantity || 0) * (watchedItems?.[index]?.unit_cost || 0))}
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

      <div className="flex gap-4">
        <div className="flex-1 space-y-2">
          <Label>Notes</Label>
          <Textarea placeholder="Optional notes..." {...register('notes')} rows={2} />
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-right min-w-[160px]">
          <p className="text-sm text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        💡 Stock and supplier totals update automatically when status is <strong>Completed</strong>.
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <span className="animate-spin mr-2">⟳</span>}
          {isEdit ? 'Update' : 'Create'} Purchase
        </Button>
      </div>
    </form>
  )
}
