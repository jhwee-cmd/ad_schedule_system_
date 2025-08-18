'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase';
import { toBase } from '@/lib/cell-builder';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const BookingDto = z.object({
  basis_dt: z.string(),          // 'YYYY-MM-DD'
  screen_id: z.string(),         // base 또는 실제 screen_id
  country_nm: z.string().nullable().optional(),
  guaranteed_exposure: z.number().nullable().optional(),
  advertiser_name: z.string().nullable().optional(),
});
type BookingInput = z.infer<typeof BookingDto>;

export async function createBookingsBulk(
  inputs: BookingInput[],
  opts?: {
    rowIdsByBase?: Record<string, string[]>; // base → 실제 행 screen_id 배열(표시 순서)
    revalidateTarget?: string;
  }
) {
  const supabase = createServerClient();
  
  const rowIdsByBase = opts?.rowIdsByBase ?? {};
  const rows = inputs.map(b => BookingDto.parse(b));

  // 준비
  const bases = new Set(rows.map(r => toBase(r.screen_id)));
  const baseToRows: Record<string, string[]> = {};
  for (const b of bases) baseToRows[b] = rowIdsByBase[b] ?? [];

  const allRowIds = Array.from(new Set(Object.values(baseToRows).flat()));
  const allDates  = Array.from(new Set(rows.map(r => r.basis_dt)));

  // 기존 점유 조회
  let existing: Record<string, Set<string>> = {};
  if (allRowIds.length && allDates.length) {
    const { data, error } = await supabase
      .from('bookings')
      .select('basis_dt, screen_id')
      .in('basis_dt', allDates)
      .in('screen_id', allRowIds);
    if (error) throw new Error(error.message);

    for (const d of data ?? []) {
      const k = d.basis_dt as string;
      (existing[k] ||= new Set()).add(d.screen_id as string);
    }
  }

  // 배치 중복 방지
  const batchTaken: Record<string, Set<string>> = {};
  const finalRows: BookingInput[] = [];
  const failures: Array<{ basis_dt: string; base: string; reason: string; capacity?: number; occupied?: number }> = [];

  for (const r of rows) {
    const base = toBase(r.screen_id);
    const candidates = baseToRows[base] ?? [];

    const isConcrete = candidates.some(id => id === r.screen_id);
    const k = r.basis_dt;

    if (isConcrete) {
      const taken = existing[k]?.has(r.screen_id) || batchTaken[k]?.has(r.screen_id);
      if (taken) {
        failures.push({ basis_dt: k, base, reason: '이미 해당 행이 점유됨', capacity: candidates.length, occupied: (existing[k]?.size ?? 0) });
        continue;
      }
      (batchTaken[k] ||= new Set()).add(r.screen_id);
      finalRows.push(r);
      continue;
    }

    if (!candidates.length) {
      failures.push({ basis_dt: k, base, reason: '해당 base의 실제 행 목록(rowIdsByBase)이 없음' });
      continue;
    }

    const occ = new Set([...(existing[k] ?? new Set()), ...(batchTaken[k] ?? new Set())]);
    const free = candidates.filter(id => !occ.has(id));

    if (free.length === 0) {
      failures.push({ basis_dt: k, base, reason: '행 수 초과(수용 불가)', capacity: candidates.length, occupied: occ.size });
      continue;
    }

    const chosen = free[0];
    (batchTaken[k] ||= new Set()).add(chosen);
    finalRows.push({ ...r, screen_id: chosen });
  }

  if (failures.length) {
    const err = new Error('CAPACITY_EXCEEDED');
    (err as any).code = 'CAPACITY_EXCEEDED';
    (err as any).failures = failures;
    throw err;
  }

  if (finalRows.length) {
    const { error } = await supabase
      .from('bookings')
      .upsert(finalRows, { onConflict: 'basis_dt,screen_id' });
    if (error) throw new Error(error.message);
  }

  revalidatePath(opts?.revalidateTarget ?? '/');
  return { upserted: finalRows.length };
}
