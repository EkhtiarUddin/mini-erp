import { supabase } from '@/lib/supabase'
import type { Customer } from '@/types'

export const customerService = {
  async getAll(): Promise<Customer[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async create(customer: any): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({ ...customer, total_purchases: 0, created_at: new Date().toISOString() })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, customer: any): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .update({ ...customer, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },
}
