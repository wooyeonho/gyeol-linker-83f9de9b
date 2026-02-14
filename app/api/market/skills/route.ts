/**
 * GYEOL 스킬 목록
 */

import { NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET() {
  const supabase = createGyeolServerClient();
  const { data, error } = await supabase
    .from('gyeol_skills')
    .select('id, name, description, category, min_gen, price, rating, downloads')
    .eq('is_approved', true)
    .order('downloads', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
