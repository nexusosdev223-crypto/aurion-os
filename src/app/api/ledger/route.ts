import { NextResponse } from 'next/server';
import { supabase, isValidSupabaseConfig } from '@/lib/supabase';

export async function GET() {
  if (!isValidSupabaseConfig()) {
    return NextResponse.json({
      success: true,
      data: [
        { id: 1, type: 'TRANSFER', amount: 1500, created_at: new Date().toISOString(), status: 'COMPLETED' },
        { id: 2, type: 'MINT', amount: 5000, created_at: new Date().toISOString(), status: 'COMPLETED' },
        { id: 3, type: 'STAKE', amount: 2500, created_at: new Date().toISOString(), status: 'PROCESSING' }
      ]
    });
  }

  try {
    const { data, error } = await supabase!
      .from('aurion_ledger')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query failed:', error.message);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
   } catch (err: unknown) {
    console.error('Ledger API internal error:', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
