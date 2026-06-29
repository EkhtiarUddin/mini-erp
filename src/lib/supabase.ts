import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: string
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: string
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          name: string
          sku: string
          description: string | null
          category: string | null
          unit_price: number
          cost_price: number
          stock_quantity: number
          min_stock_level: number
          unit: string
          created_at: string
          updated_at: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          total_purchases: number
          created_at: string
          updated_at: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          contact_person: string | null
          total_supplied: number
          created_at: string
          updated_at: string
        }
      }
      purchases: {
        Row: {
          id: string
          supplier_id: string
          total_amount: number
          status: string
          notes: string | null
          purchase_date: string
          created_at: string
          updated_at: string
        }
      }
      purchase_items: {
        Row: {
          id: string
          purchase_id: string
          product_id: string
          quantity: number
          unit_cost: number
          total_cost: number
        }
      }
      sales: {
        Row: {
          id: string
          customer_id: string | null
          invoice_number: string
          total_amount: number
          discount: number
          tax: number
          grand_total: number
          status: string
          payment_method: string
          notes: string | null
          sale_date: string
          created_at: string
          updated_at: string
        }
      }
      sale_items: {
        Row: {
          id: string
          sale_id: string
          product_id: string
          quantity: number
          unit_price: number
          total_price: number
        }
      }
    }
  }
}
