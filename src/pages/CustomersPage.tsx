import { useState, useEffect } from 'react'
import { Users, Phone, Mail, MapPin, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CustomerForm } from '@/components/forms/CustomerForm'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { useTable } from '@/hooks/useTable'
import { customerService } from '@/services/customerService'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Customer } from '@/types'

type SortKey = 'default' | 'name' | 'created_at' | 'total_purchases' | 'city'
type SortDir = 'asc' | 'desc'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Customer | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  const table = useTable({
    data: customers,
    searchKeys: ['name', 'email', 'phone', 'city'],
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    table.setCurrentPage(1)
  }, [sortKey, sortDir])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await customerService.getAll()
      setCustomers(data)
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = customers.reduce((sum, c) => sum + c.total_purchases, 0)

  const filteredData = (() => {
    const data = table.paginatedItems as Customer[]
    
    if (sortKey === 'default') {
      return data
    }
    
    return [...data].sort((a, b) => {
      let aVal: any = a[sortKey as keyof Customer]
      let bVal: any = b[sortKey as keyof Customer]
      
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
    { key: 'name', header: 'Name', render: (c: Customer) => (
      <div>
        <p className="font-medium">{c.name}</p>
        {c.address && <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{c.address}</div>}
      </div>
    )},
    { key: 'contact', header: 'Contact', render: (c: Customer) => (
      <div className="space-y-0.5">
        {c.email && <div className="text-sm flex items-center gap-1 text-gray-600"><Mail className="h-3 w-3" />{c.email}</div>}
        {c.phone && <div className="text-sm flex items-center gap-1 text-gray-600"><Phone className="h-3 w-3" />{c.phone}</div>}
      </div>
    )},
    { key: 'city', header: 'City', render: (c: Customer) => c.city || '-' },
    { key: 'total_purchases', header: 'Total Purchases', render: (c: Customer) => <span className="font-medium text-green-700">{formatCurrency(c.total_purchases)}</span>},
    { key: 'created_at', header: 'Created', render: (c: Customer) => <span className="text-sm text-gray-500">{formatDate(c.created_at)}</span>},
    { key: 'actions', header: 'Actions', className: 'text-right', render: (c: Customer) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}><Edit2 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelected(c); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    )},
  ]

  const openCreate = () => {
    setIsEdit(false)
    setSelected(null)
    setDialogOpen(true)
  }

  const openEdit = (customer: Customer) => {
    setIsEdit(true)
    setSelected(customer)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      if (selected) {
        await customerService.update(selected.id, data)
        toast({ title: 'Customer updated' })
      } else {
        await customerService.create(data)
        toast({ title: 'Customer created' })
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
      await customerService.delete(selected.id)
      toast({ title: 'Customer deleted' })
      setDeleteDialogOpen(false)
      loadData()
    } catch (error) {
      toast({ title: 'Cannot delete', description: 'Customer has associated sales.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Customers" count={customers.length} onAdd={openCreate} addLabel="Add Customer" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Customers</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Avg. Purchase</p>
            <p className="text-lg font-bold">{formatCurrency(customers.length ? totalRevenue / customers.length : 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <SearchBar value={table.search} onChange={table.setSearch} placeholder="Search by name, email, phone, city..." />
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
              <SelectItem value="name_asc">Name A → Z</SelectItem>
              <SelectItem value="name_desc">Name Z → A</SelectItem>
              <SelectItem value="total_purchases_desc">Highest Purchase</SelectItem>
              <SelectItem value="total_purchases_asc">Lowest Purchase</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
          emptyMessage="No customers found"
          emptyIcon={<Users className="h-12 w-12" />}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          </DialogHeader>
          <CustomerForm
            defaultValues={selected ? {
              name: selected.name,
              email: selected.email || '',
              phone: selected.phone || '',
              address: selected.address || '',
              city: selected.city || '',
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
        title="Delete Customer"
        description={`Delete ${selected?.name}? This cannot be undone.`}
        onDelete={handleDelete}
      />
    </div>
  )
}
