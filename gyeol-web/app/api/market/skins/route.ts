import { NextResponse } from 'next/server';
import { createGyeolServerClient } from '@/lib/gyeol/supabase-server';

export async function GET() {
  const supabase = createGyeolServerClient();
  const { data, error } = await supabase
    .from('gyeol_skins')
    .select('id, name, description, price, preview_url, rating, downloads')
    .eq('is_approved', true)
    .order('downloads', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
