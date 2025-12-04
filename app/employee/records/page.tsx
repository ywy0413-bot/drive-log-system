'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RecordsPage() {
  const router = useRouter();
  const user = getCurrentUser();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadRecords();
  }, [selectedMonth]);

  async function loadRecords() {
    setLoading(true);

    // 선택한 달의 첫날과 마지막 날 계산
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 다음 달 0일 = 이번 달 마지막 날

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log('Loading records for user:', user.id);
    console.log('Date range:', startDateStr, 'to', endDateStr);

    const { data, error } = await supabase
      .from('drive_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('drive_date', startDateStr)
      .lte('drive_date', endDateStr)
      .order('drive_date', { ascending: false });

    console.log('Query result:', { data, error });

    if (!error && data) {
      setRecords(data);
    } else if (error) {
      console.error('Error loading records:', error);
    }

    setLoading(false);
  }

  const totalDistance = records.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0);
  const draftCount = records.filter(r => r.status === 'draft').length;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">운행 기록 조회</h1>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 월 선택 및 요약 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                조회 월
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">총 운행 건수</p>
                <p className="text-2xl font-bold text-blue-600">{records.length}건</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">총 운행 거리</p>
                <p className="text-2xl font-bold text-green-600">{totalDistance.toFixed(1)}km</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">작성중</p>
                <p className="text-2xl font-bold text-gray-600">{draftCount}건</p>
              </div>
            </div>
          </div>
        </div>

        {/* 운행 기록 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : records.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p className="mb-4">이번 달 운행 기록이 없습니다.</p>
              <Link
                href="/employee/new-record"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              >
                새 운행 기록 작성
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      날짜
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      출발지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      도착지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      거리(km)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      외근지
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.drive_date).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.departure}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.destination}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {parseFloat(record.distance).toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.client_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'draft'
                              ? 'bg-gray-100 text-gray-800'
                              : record.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {record.status === 'draft'
                            ? '작성중'
                            : record.status === 'pending'
                            ? '마감요청'
                            : '정산완료'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="mt-6 flex gap-3">
          <Link
            href="/employee"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            ← 대시보드로
          </Link>
          <Link
            href="/employee/new-record"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + 새 운행 기록
          </Link>
        </div>
      </main>
    </div>
  );
}
