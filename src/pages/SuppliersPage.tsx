import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Edit2, Trash2, Truck, Loader2, Phone, Mail, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Supplier } from '@/types'

const supplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  contact_person: z.string().optional(),
})
type SupplierForm = z.infer<typeof supplierSchema>

function SortIcon({ column, sort }: { column: string; sort: { key: string; direction: string } }) {
  if (sort.key !== column) return <ArrowUpDown className="h-3 w-3 ml-1 text-gray-400" />
  return sort.direction === 'asc' ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [saving, setSaving] = useState(false)

  const { search, setSearch, sort, handleSort, currentPage, pageSize, totalItems, paginatedItems, handlePageChange, handlePageSizeChange } = useTableControls(
    suppliers as unknown as Record<string, unknown>[],
    ['name', 'email', 'phone', 'contact_person'],
    { key: 'created_at', direction: 'desc' }
  )

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
  })

  useEffect(() => { loadSuppliers() }, [])

  const loadSuppliers = async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*')
    setSuppliers(data || [])
    setLoading(false)
  }

  const openCreate = () => {
    setSelected(null)
    reset({ name: '', email: '', phone: '', address: '', contact_person: '' })
    setDialogOpen(true)
  }

  const openEdit = (s: Supplier) => {
    setSelected(s)
    reset({ name: s.name, email: s.email || '', phone: s.phone || '', address: s.address || '', contact_person: s.contact_person || '' })
    setDialogOpen(true)
  }

  const onSubmit = async (data: SupplierForm) => {
    setSaving(true)
    try {
      const payload = {
        name: data.name, email: data.email || null, phone: data.phone || null,
        address: data.address || null, contact_person: data.contact_person || null,
        updated_at: new Date().toISOString(),
      }
      if (selected) {
        const { error } = await supabase.from('suppliers').update(payload).eq('id', selected.id)
        if (error) throw error
        toast({ title: 'Supplier updated' })
      } else {
        const { error } = await supabase.from('suppliers').insert({ ...payload, total_supplied: 0, created_at: new Date().toISOString() })
        if (error) throw error
        toast({ title: 'Supplier created' })
      }
      setDialogOpen(false)
      loadSuppliers()
    } catch (e: unknown) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    const { error } = await supabase.from('suppliers').delete().eq('id', selected.id)
    if (error) {
      toast({ title: 'Cannot delete', description: 'Supplier has associated purchases.', variant: 'destructive' })
    } else {
      toast({ title: 'Supplier deleted' })
      loadSuppliers()
    }
    setDeleteDialogOpen(false)
  }

  const typedPaginated = paginatedItems as unknown as Supplier[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-sm text-gray-500">{suppliers.length} total suppliers</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Supplier</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Total Suppliers</p><p className="text-2xl font-bold">{suppliers.length}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Total Supplied</p><p className="text-lg font-bold text-blue-600">{formatCurrency(suppliers.reduce((s, sup) => s + sup.total_supplied, 0))}</p></CardContent></Card>
        <Card className="border-0 shadow-sm"><CardContent className="p-4"><p className="text-xs text-gray-500">Avg. Supplied</p><p className="text-lg font-bold">{formatCurrency(suppliers.length ? suppliers.reduce((s, sup) => s + sup.total_supplied, 0) / suppliers.length : 0)}</p></CardContent></Card>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search by name, email, contact..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select
              value={`${sort.key}_${sort.direction}`}
              onValueChange={v => { const [key, dir] = v.split('_'); handleSort(key); if (dir !== sort.direction) handleSort(key) }}
            >
              <SelectTrigger className="w-44"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Newest First</SelectItem>
                <SelectItem value="created_at_asc">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name A → Z</SelectItem>
                <SelectItem value="name_desc">Name Z → A</SelectItem>
                <SelectItem value="total_supplied_desc">Highest Supplied</SelectItem>
                <SelectItem value="total_supplied_asc">Lowest Supplied</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : totalItems === 0 ? (
            <div className="flex flex-col items-center py-16"><Truck className="h-12 w-12 text-gray-300 mb-3" /><p className="text-gray-500">No suppliers found</p></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('name')}>Company <SortIcon column="name" sort={sort} /></button></TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('total_supplied')}>Total Supplied <SortIcon column="total_supplied" sort={sort} /></button></TableHead>
                    <TableHead><button className="flex items-center font-medium" onClick={() => handleSort('created_at')}>Created <SortIcon column="created_at" sort={sort} /></button></TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typedPaginated.map(s => (
                    <TableRow key={s.id}>
                      <TableCell><div className="font-medium">{s.name}</div>{s.address && <div className="text-xs text-gray-500 mt-0.5">{s.address}</div>}</TableCell>
                      <TableCell>{s.contact_person ? <div className="flex items-center gap-1 text-sm"><User className="h-3 w-3 text-gray-400" />{s.contact_person}</div> : '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {s.email && <div className="text-sm flex items-center gap-1 text-gray-600"><Mail className="h-3 w-3" />{s.email}</div>}
                          {s.phone && <div className="text-sm flex items-center gap-1 text-gray-600"><Phone className="h-3 w-3" />{s.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-blue-700">{formatCurrency(s.total_supplied)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{formatDate(s.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2"><Label>Company Name *</Label><Input placeholder="Supplier company name" {...register('name')} />{errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}</div>
            <div className="space-y-2"><Label>Contact Person</Label><Input placeholder="Primary contact name" {...register('contact_person')} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@supplier.com" {...register('email')} />{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}</div>
              <div className="space-y-2"><Label>Phone</Label><Input placeholder="+1 234 567 8900" {...register('phone')} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea placeholder="Full address" {...register('address')} rows={2} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{selected ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Supplier</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Delete <strong>{selected?.name}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
