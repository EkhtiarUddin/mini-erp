import { useState, useEffect } from 'react'
import { Truck, Phone, Mail, User, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/common/PageHeader'
import { DataTable } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SupplierForm } from '@/components/forms/SupplierForm'
import { DeleteModal } from '@/components/modals/DeleteModal'
import { useTable } from '@/hooks/useTable'
import { supplierService } from '@/services/supplierService'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Supplier } from '@/types'

type SortKey = 'default' | 'name' | 'created_at' | 'total_supplied' | 'contact_person'
type SortDir = 'asc' | 'desc'

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState<SortKey>('default')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Supplier | null>(null)
  const [isEdit, setIsEdit] = useState(false)
  const [saving, setSaving] = useState(false)

  const table = useTable({
    data: suppliers,
    searchKeys: ['name', 'email', 'phone', 'contact_person'],
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
      const data = await supplierService.getAll()
      setSuppliers(data)
    } catch (error) {
      toast({ title: 'Error', description: (error as Error).message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const totalSupplied = suppliers.reduce((sum, s) => sum + s.total_supplied, 0)

  const filteredData = (() => {
    const data = table.paginatedItems as Supplier[]
    
    if (sortKey === 'default') {
      return data
    }
    
    return [...data].sort((a, b) => {
      let aVal: any = a[sortKey as keyof Supplier]
      let bVal: any = b[sortKey as keyof Supplier]
      
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
    { key: 'name', header: 'Company', render: (s: Supplier) => (
      <div>
        <p className="font-medium">{s.name}</p>
        {s.address && <div className="text-xs text-gray-500 mt-0.5">{s.address}</div>}
      </div>
    )},
    { key: 'contact_person', header: 'Contact Person', render: (s: Supplier) => s.contact_person ? <div className="flex items-center gap-1 text-sm"><User className="h-3 w-3 text-gray-400" />{s.contact_person}</div> : '-'},
    { key: 'contact', header: 'Contact Info', render: (s: Supplier) => (
      <div className="space-y-0.5">
        {s.email && <div className="text-sm flex items-center gap-1 text-gray-600"><Mail className="h-3 w-3" />{s.email}</div>}
        {s.phone && <div className="text-sm flex items-center gap-1 text-gray-600"><Phone className="h-3 w-3" />{s.phone}</div>}
      </div>
    )},
    { key: 'total_supplied', header: 'Total Supplied', render: (s: Supplier) => <span className="font-medium text-blue-700">{formatCurrency(s.total_supplied)}</span>},
    { key: 'created_at', header: 'Created', render: (s: Supplier) => <span className="text-sm text-gray-500">{formatDate(s.created_at)}</span>},
    { key: 'actions', header: 'Actions', className: 'text-right', render: (s: Supplier) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Edit2 className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setSelected(s); setDeleteDialogOpen(true) }}><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    )},
  ]

  const openCreate = () => {
    setIsEdit(false)
    setSelected(null)
    setDialogOpen(true)
  }

  const openEdit = (supplier: Supplier) => {
    setIsEdit(true)
    setSelected(supplier)
    setDialogOpen(true)
  }

  const handleSubmit = async (data: any) => {
    setSaving(true)
    try {
      if (selected) {
        await supplierService.update(selected.id, data)
        toast({ title: 'Supplier updated' })
      } else {
        await supplierService.create(data)
        toast({ title: 'Supplier created' })
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
      await supplierService.delete(selected.id)
      toast({ title: 'Supplier deleted' })
      setDeleteDialogOpen(false)
      loadData()
    } catch (error) {
      toast({ title: 'Cannot delete', description: 'Supplier has associated purchases.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" count={suppliers.length} onAdd={openCreate} addLabel="Add Supplier" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Suppliers</p>
            <p className="text-2xl font-bold">{suppliers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Supplied</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(totalSupplied)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Avg. Supplied</p>
            <p className="text-lg font-bold">{formatCurrency(suppliers.length ? totalSupplied / suppliers.length : 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <SearchBar value={table.search} onChange={table.setSearch} placeholder="Search by name, email, contact..." />
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
              <SelectItem value="total_supplied_desc">Highest Supplied</SelectItem>
              <SelectItem value="total_supplied_asc">Lowest Supplied</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
          emptyMessage="No suppliers found"
          emptyIcon={<Truck className="h-12 w-12" />}
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
            <DialogTitle>{isEdit ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
          </DialogHeader>
          <SupplierForm
            defaultValues={selected ? {
              name: selected.name,
              email: selected.email || '',
              phone: selected.phone || '',
              address: selected.address || '',
              contact_person: selected.contact_person || '',
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
        title="Delete Supplier"
        description={`Delete ${selected?.name}? This cannot be undone.`}
        onDelete={handleDelete}
      />
    </div>
  )
}
