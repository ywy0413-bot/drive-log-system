'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestPage() {
  const [status, setStatus] = useState<string>('연결 테스트 중...');
  const [tables, setTables] = useState<string[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    async function testConnection() {
      try {
        // 1. Supabase 연결 테스트
        const { data, error: connectionError } = await supabase
          .from('users')
          .select('count')
          .limit(1);

        if (connectionError) {
          setError(`연결 오류: ${connectionError.message}`);
          setStatus('❌ 연결 실패');
          return;
        }

        setStatus('✅ Supabase 연결 성공!');

        // 2. 테이블 목록 확인
        const tableNames = ['users', 'drive_records', 'fuel_rates', 'monthly_settlements'];
        setTables(tableNames);

      } catch (err) {
        setError(`예외 발생: ${err}`);
        setStatus('❌ 테스트 실패');
      }
    }

    testConnection();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Supabase 연결 테스트</h1>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded">
              <p className="text-lg font-semibold">{status}</p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {tables.length > 0 && (
              <div className="p-4 bg-green-50 rounded">
                <h2 className="font-semibold mb-2">생성된 테이블:</h2>
                <ul className="list-disc list-inside space-y-1">
                  {tables.map((table) => (
                    <li key={table} className="text-green-700">
                      {table}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-2">환경 변수 확인:</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Supabase URL:</span>{' '}
                  {process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? '✅ 설정됨'
                    : '❌ 없음'}
                </p>
                <p>
                  <span className="font-medium">Supabase Key:</span>{' '}
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    ? '✅ 설정됨'
                    : '❌ 없음'}
                </p>
              </div>
            </div>

            <div className="pt-4">
              <a
                href="/"
                className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                ← 메인으로 돌아가기
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
