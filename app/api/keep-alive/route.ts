import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Supabase 프로젝트가 일시 중지되지 않도록 주기적으로 호출하는 API
export async function GET() {
  try {
    // 간단한 쿼리 실행으로 Supabase 연결 유지
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Keep-alive query failed:', error);
      return NextResponse.json(
        { success: false, error: error.message, timestamp: new Date().toISOString() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection is alive',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Keep-alive error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
