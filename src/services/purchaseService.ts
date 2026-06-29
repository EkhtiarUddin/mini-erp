import { supabase } from '@/lib/supabase'
import type { Purchase, Supplier, Product } from '@/types'

export const purchaseService = {
  async getAll(): Promise<Purchase[]> {
    const { data, error } = await supabase
      .from('purchases')
      .select('*, supplier:suppliers(name), purchase_items(*, product:products(name,sku))')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as unknown as Purchase[]
  },

  async getSuppliers(): Promise<Pick<Supplier, 'id' | 'name'>[]> {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id,name')
      .order('name')
    
    if (error) throw error
    return data as unknown as Pick<Supplier, 'id' | 'name'>[]
  },

  async getProducts(): Promise<Pick<Product, 'id' | 'name' | 'sku' | 'cost_price' | 'stock_quantity'>[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,sku,cost_price,stock_quantity')
      .order('name')
    
    if (error) throw error
    return data as unknown as Pick<Product, 'id' | 'name' | 'sku' | 'cost_price' | 'stock_quantity'>[]
  },

  async create(purchase: any): Promise<Purchase> {
    const { data, error } = await supabase
      .from('purchases')
      .insert(purchase)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, purchase: any): Promise<Purchase> {
    const { data, error } = await supabase
      .from('purchases')
      .update({ ...purchase, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async createPurchaseItems(purchaseId: string, items: any[]): Promise<void> {
    const { error } = await supabase
      .from('purchase_items')
      .insert(items.map(item => ({
        purchase_id: purchaseId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_cost: item.unit_cost,
        total_cost: item.quantity * item.unit_cost,
      })))
    
    if (error) throw error
  },

  async deletePurchaseItems(purchaseId: string): Promise<void> {
    const { error } = await supabase
      .from('purchase_items')
      .delete()
      .eq('purchase_id', purchaseId)
    
    if (error) throw error
  },

  async updateProductStock(productId: string, quantityChange: number): Promise<void> {
    const { data: product } = await supabase
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single()
    
    if (!product) return
    
    const newQty = Math.max(0, product.stock_quantity + quantityChange)
    await supabase
      .from('products')
      .update({ 
        stock_quantity: newQty, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', productId)
  },

  async updateSupplierTotal(supplierId: string, amountChange: number): Promise<void> {
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('total_supplied')
      .eq('id', supplierId)
      .single()
    
    if (!supplier) return
    
    const newTotal = Math.max(0, supplier.total_supplied + amountChange)
    await supabase
      .from('suppliers')
      .update({ 
        total_supplied: newTotal, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', supplierId)
  },
}
