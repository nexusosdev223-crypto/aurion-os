import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('aurion_ledger')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query failed:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Ledger API internal error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
