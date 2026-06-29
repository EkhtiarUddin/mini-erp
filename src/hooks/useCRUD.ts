import { useState, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

interface UseCRUDOptions<T, CreateData, UpdateData> {
  fetchAll: () => Promise<T[]>
  create: (data: CreateData) => Promise<T>
  update: (id: string, data: UpdateData) => Promise<T>
  delete: (id: string) => Promise<void>
  successMessages?: {
    create?: string
    update?: string
    delete?: string
  }
}

export function useCRUD<T, CreateData, UpdateData>({
  fetchAll,
  create,
  update,
  delete: deleteFn,
  successMessages = {
    create: 'Created successfully',
    update: 'Updated successfully',
    delete: 'Deleted successfully',
  },
}: UseCRUDOptions<T, CreateData, UpdateData>) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchAll()
      setData(result)
    } catch (error) {
      toast({
        title: 'Error loading data',
        description: (error as Error).message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [fetchAll])

  const handleCreate = useCallback(
    async (formData: CreateData) => {
      setSaving(true)
      try {
        await create(formData)
        toast({ title: successMessages.create })
        await loadData()
      } catch (error) {
        toast({
          title: 'Error',
          description: (error as Error).message,
          variant: 'destructive',
        })
        throw error
      } finally {
        setSaving(false)
      }
    },
    [create, loadData, successMessages.create]
  )

  const handleUpdate = useCallback(
    async (id: string, formData: UpdateData) => {
      setSaving(true)
      try {
        await update(id, formData)
        toast({ title: successMessages.update })
        await loadData()
      } catch (error) {
        toast({
          title: 'Error',
          description: (error as Error).message,
          variant: 'destructive',
        })
        throw error
      } finally {
        setSaving(false)
      }
    },
    [update, loadData, successMessages.update]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteFn(id)
        toast({ title: successMessages.delete })
        await loadData()
      } catch (error) {
        toast({
          title: 'Error',
          description: (error as Error).message,
          variant: 'destructive',
        })
        throw error
      }
    },
    [deleteFn, loadData, successMessages.delete]
  )

  return {
    data,
    loading,
    saving,
    loadData,
    handleCreate,
    handleUpdate,
    handleDelete,
  }
}
