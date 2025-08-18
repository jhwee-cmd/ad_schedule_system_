'use server'

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function getBookings() {
  try {
    console.log('getBookings: Creating Supabase client with URL:', SUPABASE_URL)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession: false
      }
    })
    
    console.log('getBookings: Supabase client created, fetching data...')
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('basis_dt', { ascending: true })

    if (error) {
      console.error('getBookings: Supabase error:', error)
      throw new Error(error.message)
    }
    
    console.log('getBookings: Successfully fetched', data?.length || 0, 'bookings')
    return data || []
  } catch (err) {
    console.error('getBookings error:', err)
    return []
  }
}

export async function getBookingsByRange(startDate: string, endDate: string) {
  try {
    console.log('getBookingsByRange: Creating Supabase client with URL:', SUPABASE_URL)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession: false
      }
    })
    
    console.log('getBookingsByRange: Fetching bookings from', startDate, 'to', endDate)
    
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('basis_dt', startDate)
      .lte('basis_dt', endDate)
      .order('basis_dt', { ascending: true })

    if (error) {
      console.error('getBookingsByRange: Supabase error:', error)
      throw new Error(error.message)
    }
    
    console.log('getBookingsByRange: Successfully fetched', data?.length || 0, 'bookings for range')
    return data || []
  } catch (err) {
    console.error('getBookingsByRange error:', err)
    return []
  }
}
