import { supabase } from '@/lib/supabase'
import type { Product } from '@/types'

export const productService = {
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  async create(product: any): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, product: any): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...product, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async checkIfUsed(id: string): Promise<{ usedInSales: boolean; usedInPurchases: boolean }> {
    const [salesResult, purchaseResult] = await Promise.all([
      supabase.from('sale_items').select('id').eq('product_id', id).limit(1),
      supabase.from('purchase_items').select('id').eq('product_id', id).limit(1),
    ])

    return {
      usedInSales: (salesResult.data?.length || 0) > 0,
      usedInPurchases: (purchaseResult.data?.length || 0) > 0,
    }
  },
}
