/**
 * GYEOL 스킨 목록
 */

import { NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET(req: Request) {
  const supabase = createGyeolServerClient();
  const { searchParams } = new URL(req.url);
  const skinId = searchParams.get('skinId');

  if (skinId) {
    const { data, error } = await supabase
      .from('gyeol_skins')
      .select('id, name, description, price, preview_url, rating, downloads, skin_data')
      .eq('id', skinId)
      .limit(1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  const { data, error } = await supabase
    .from('gyeol_skins')
    .select('id, name, description, price, preview_url, rating, downloads')
    .eq('is_approved', true)
    .order('downloads', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
