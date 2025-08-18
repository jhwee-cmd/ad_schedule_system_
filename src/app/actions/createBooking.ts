'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { eachDayOfInterval, parseISO, format } from 'date-fns'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const BookingDto = z.object({
  basis_dt: z.string(),
  screen_id: z.string(),
  country_nm: z.string().optional().default(''),
  guaranteed_exposure: z.coerce.number().optional().default(0),
})

const BookingRangeDto = z.object({
  start_date: z.string(),
  end_date: z.string(),
  screen_id: z.string(),
  country_nm: z.string().optional().default(''),
  guaranteed_exposure: z.coerce.number().optional().default(0),
})

export type BookingInput = z.infer<typeof BookingDto>
export type BookingRangeInput = z.infer<typeof BookingRangeDto>

export async function createBooking(input: unknown) {
  try {
    const payload = BookingDto.parse(input)
    console.log('Creating booking with payload:', payload)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession: false
      }
    })
    
    console.log('Supabase client created')
    
    // Check for existing booking on the same date and screen
    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('*')
      .eq('basis_dt', payload.basis_dt)
      .eq('screen_id', payload.screen_id)

    if (checkError) {
      console.error('Error checking existing bookings:', checkError)
      throw new Error(checkError.message)
    }

    if (existingBookings && existingBookings.length > 0) {
      throw new Error(`이미 ${payload.basis_dt} 날짜의 ${payload.screen_id} 지면에 예약이 있습니다.`)
    }
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(error.message)
    }
    
    console.log('Booking created successfully:', data)
    console.log('🔄 revalidatePath("/") 호출됨')
    revalidatePath('/')
    return data
  } catch (err) {
    console.error('createBooking error:', err)
    throw err
  }
}

export async function createBookingRange(input: unknown) {
  try {
    const payload = BookingRangeDto.parse(input)
    console.log('Creating booking range with payload:', payload)
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        persistSession: false
      }
    })
    
    // Generate all dates in the range
    const startDate = parseISO(payload.start_date)
    const endDate = parseISO(payload.end_date)
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
    
    // Check for existing bookings in the date range
    const { data: existingBookings, error: checkError } = await supabase
      .from('bookings')
      .select('*')
      .eq('screen_id', payload.screen_id)
      .gte('basis_dt', payload.start_date)
      .lte('basis_dt', payload.end_date)

    if (checkError) {
      console.error('Error checking existing bookings:', checkError)
      throw new Error(checkError.message)
    }

    if (existingBookings && existingBookings.length > 0) {
      const existingDates = existingBookings.map(b => b.basis_dt).join(', ')
      throw new Error(`다음 날짜에 이미 예약이 있습니다: ${existingDates}`)
    }
    
    // Create bookings for each day in the range
    const bookingsToInsert = dateRange.map(date => ({
      basis_dt: format(date, 'yyyy-MM-dd'),
      screen_id: payload.screen_id,
      country_nm: payload.country_nm,
      guaranteed_exposure: payload.guaranteed_exposure,
    }))
    
    const { data, error } = await supabase
      .from('bookings')
      .insert(bookingsToInsert)
      .select()

    if (error) {
      console.error('Supabase error:', error)
      throw new Error(error.message)
    }
    
    console.log(`Booking range created successfully: ${data?.length || 0} bookings`)
    console.log('🔄 revalidatePath("/") 호출됨 (범위)')
    revalidatePath('/')
    return data
  } catch (err) {
    console.error('createBookingRange error:', err)
    throw err
  }
}


