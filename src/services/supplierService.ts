import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/types'

export const supplierService = {
  async getAll(): Promise<Supplier[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async create(supplier: any): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .insert({ ...supplier, total_supplied: 0, created_at: new Date().toISOString() })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, supplier: any): Promise<Supplier> {
    const { data, error } = await supabase
      .from('suppliers')
      .update({ ...supplier, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },
}
