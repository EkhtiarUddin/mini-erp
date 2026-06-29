import { supabase } from '@/lib/supabase'
import type { Sale, Customer, Product } from '@/types'

export const saleService = {
  async getAll(): Promise<Sale[]> {
    const { data, error } = await supabase
      .from('sales')
      .select('*, customer:customers(name), sale_items(*, product:products(name,sku))')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as unknown as Sale[]
  },

  async getCustomers(): Promise<Pick<Customer, 'id' | 'name'>[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('id,name')
      .order('name')
    
    if (error) throw error
    return data as unknown as Pick<Customer, 'id' | 'name'>[]
  },

  async getProducts(): Promise<Pick<Product, 'id' | 'name' | 'sku' | 'unit_price' | 'stock_quantity'>[]> {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,sku,unit_price,stock_quantity')
      .order('name')
    
    if (error) throw error
    return data as unknown as Pick<Product, 'id' | 'name' | 'sku' | 'unit_price' | 'stock_quantity'>[]
  },

  async create(sale: any): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .insert(sale)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async update(id: string, sale: any): Promise<Sale> {
    const { data, error } = await supabase
      .from('sales')
      .update({ ...sale, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  async createSaleItems(saleId: string, items: any[]): Promise<void> {
    const { error } = await supabase
      .from('sale_items')
      .insert(items.map(item => ({
        sale_id: saleId,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      })))
    
    if (error) throw error
  },

  async deleteSaleItems(saleId: string): Promise<void> {
    const { error } = await supabase
      .from('sale_items')
      .delete()
      .eq('sale_id', saleId)
    
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

  async updateCustomerTotal(customerId: string, amountChange: number): Promise<void> {
    const { data: customer } = await supabase
      .from('customers')
      .select('total_purchases')
      .eq('id', customerId)
      .single()
    
    if (!customer) return
    
    const newTotal = Math.max(0, customer.total_purchases + amountChange)
    await supabase
      .from('customers')
      .update({ 
        total_purchases: newTotal, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', customerId)
  },
}
