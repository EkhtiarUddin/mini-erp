import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/misc'

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
})

export type SupplierFormData = z.infer<typeof supplierSchema>

interface SupplierFormProps {
  defaultValues?: Partial<SupplierFormData>
  onSubmit: (data: SupplierFormData) => Promise<void>
  onCancel: () => void
  isEdit?: boolean
  isSaving?: boolean
}

export function SupplierForm({
  defaultValues,
  onSubmit,
  onCancel,
  isEdit = false,
  isSaving = false,
}: SupplierFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      address: '',
      contact_person: '',
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Company Name *</Label>
        <Input placeholder="Supplier company name" {...register('name')} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Contact Person</Label>
        <Input placeholder="Primary contact name" {...register('contact_person')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" placeholder="email@supplier.com" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input placeholder="+1 234 567 8900" {...register('phone')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <Textarea placeholder="Full address" {...register('address')} rows={2} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <span className="animate-spin mr-2">⟳</span>}
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
