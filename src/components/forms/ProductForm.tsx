import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/misc'
import { generateSKU } from '@/lib/utils'

const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  sku: z.string().min(1, 'SKU is required'),
  description: z.string().optional(),
  category: z.string().optional(),
  unit_price: z.number().min(0, 'Price must be 0 or greater'),
  cost_price: z.number().min(0, 'Cost must be 0 or greater'),
  stock_quantity: z.number().int().min(0, 'Stock must be 0 or greater'),
  min_stock_level: z.number().int().min(0, 'Min stock must be 0 or greater'),
  unit: z.string().min(1, 'Unit is required'),
})

export type ProductFormData = z.infer<typeof productSchema>

const CATEGORIES = ['Electronics', 'Clothing', 'Food & Beverage', 'Office Supplies', 'Furniture', 'Tools', 'Accessories', 'Other']
const UNITS = ['pcs', 'kg', 'liter', 'box', 'meter', 'set', 'pair']

interface ProductFormProps {
  defaultValues?: Partial<ProductFormData>
  onSubmit: (data: ProductFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
  isSaving?: boolean
}

export function ProductForm({
  defaultValues,
  onSubmit,
  onCancel,
  isEdit = false,
  isSaving = false,
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      unit: 'pcs',
      min_stock_level: 10,
      cost_price: undefined,   // ← FIXED: undefined instead of 0
      unit_price: undefined,   // ← FIXED: undefined instead of 0
      stock_quantity: undefined, // ← FIXED: undefined instead of 0
      ...defaultValues,
    },
  })

  const nameValue = watch('name')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-2">
          <Label>Product Name *</Label>
          <Input placeholder="Enter product name" {...register('name')} />
          {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>SKU *</Label>
          <div className="flex gap-2">
            <Input placeholder="e.g. LAP-0001" {...register('sku')} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-shrink-0"
              onClick={() => setValue('sku', generateSKU(nameValue || 'PRD'))}
            >
              Generate
            </Button>
          </div>
          {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            onValueChange={v => setValue('category', v)}
            value={watch('category') || ''}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Cost Price *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('cost_price', { valueAsNumber: true })}
          />
          {errors.cost_price && <p className="text-sm text-destructive">{errors.cost_price.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Unit Price *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('unit_price', { valueAsNumber: true })}
          />
          {errors.unit_price && <p className="text-sm text-destructive">{errors.unit_price.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Stock Quantity *</Label>
          <Input
            type="number"
            min="0"
            placeholder="e.g. 100"
            {...register('stock_quantity', { valueAsNumber: true })}
          />
          {errors.stock_quantity && <p className="text-sm text-destructive">{errors.stock_quantity.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Min Stock Level</Label>
          <Input
            type="number"
            min="0"
            placeholder="e.g. 10"
            {...register('min_stock_level', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label>Unit *</Label>
          <Select
            onValueChange={v => setValue('unit', v)}
            value={watch('unit') || 'pcs'}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map(u => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label>Description</Label>
          <Textarea placeholder="Product description (optional)" {...register('description')} rows={3} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <span className="animate-spin mr-2">⟳</span>}
          {isEdit ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </form>
  )
}
