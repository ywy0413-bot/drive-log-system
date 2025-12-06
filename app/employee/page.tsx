'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, clearCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function EmployeePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonthSubmission, setCurrentMonthSubmission] = useState<any>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadCurrentMonthSubmission();
      loadMonthlyTrends();
    }
  }, [user]);

  function checkUser() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    setLoading(false);
  }

  async function loadCurrentMonthSubmission() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data, error } = await supabase
      .from('monthly_submissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .single();

    if (!error && data) {
      setCurrentMonthSubmission(data);
    } else {
      setCurrentMonthSubmission(null);
    }
  }

  async function loadMonthlyTrends() {
    // 최근 6개월의 제출 내역을 조회
    const trends = [];
    const now = new Date();

    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      // 해당 월의 제출 상태 조회
      const { data: submission } = await supabase
        .from('monthly_submissions')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .eq('month', month)
        .single();

      // 해당 월의 총 운행 거리 조회
      let totalDistance = 0;
      if (submission) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const { data: records } = await supabase
          .from('drive_records')
          .select('distance')
          .eq('user_id', user.id)
          .gte('drive_date', startDateStr)
          .lte('drive_date', endDateStr);

        totalDistance = records?.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0) || 0;
      }

      trends.push({
        year,
        month,
        submission: submission || null,
        totalDistance,
      });
    }

    setMonthlyTrends(trends);
  }

  function handleSignOut() {
    clearCurrentUser();
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">자가운전대장</h1>
            <p className="text-sm text-gray-600">
              {user?.name}님 환영합니다
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">운행 기록 관리</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href="/employee/new-record"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
            >
              <h3 className="font-semibold text-lg mb-2">새 운행 기록</h3>
              <p className="text-sm text-gray-600">오늘의 운행 기록을 등록하세요</p>
            </Link>

            <Link
              href="/employee/records"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
            >
              <h3 className="font-semibold text-lg mb-2">운행 기록 조회 및 제출</h3>
              <p className="text-sm text-gray-600">지난 운행 기록을 확인하고 제출하세요</p>
            </Link>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-lg mb-3">월별 정산 현황</h3>
              <p className="text-sm text-gray-600 mb-2">최근 6개월 정산 추이</p>
              <p className="text-xs text-blue-600 mb-3">💡 정산 금액에는 감가 상각비용이 포함되어 있습니다</p>
              <div className="space-y-2">
                {monthlyTrends.map((trend) => (
                  <div key={`${trend.year}-${trend.month}`} className="flex justify-between items-center text-sm py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-700">
                      {trend.year}년 {trend.month}월
                    </span>
                    {trend.submission ? (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            trend.submission.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {trend.submission.status === 'pending' ? '정산중' : '정산완료'}
                        </span>
                        {trend.submission.status === 'completed' && (
                          <div className="text-xs text-gray-600">
                            <div>{trend.totalDistance.toFixed(1)} km</div>
                            <div className="font-semibold text-green-700">
                              {trend.submission.settlement_amount?.toLocaleString()}원
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">미제출</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/employee/records"
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer"
            >
              <h3 className="font-semibold text-lg mb-2">정산 내역</h3>
              <p className="text-sm text-gray-600 mb-2">이번 달 운행기록 제출 상태</p>
              {currentMonthSubmission ? (
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      currentMonthSubmission.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {currentMonthSubmission.status === 'pending' ? '⏳ 정산중' : '✓ 정산완료'}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-red-600 mt-2">아직 제출하지 않았습니다</p>
              )}
            </Link>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">사용자 정보</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">이름:</span> {user?.name}</p>
              <p><span className="font-medium">연료형태:</span> {
                user?.vehicle_type === 'gasoline' ? '휘발유' :
                user?.vehicle_type === 'diesel' ? '경유' : '전기'
              }</p>
              <p>
                <span className="font-medium">연비:</span> {
                  user?.fuel_efficiency?.toFixed(1) || '10.0'
                } {user?.vehicle_type === 'electric' ? 'km/kWh' : 'km/L'}
                <span className="text-xs text-gray-600 ml-1">(차량등록증 상 연비에 85% 적용)</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
