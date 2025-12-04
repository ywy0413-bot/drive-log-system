'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, clearCurrentUser } from '@/lib/auth';
import Link from 'next/link';

export default function EmployeePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  function checkUser() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    setLoading(false);
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
              <h3 className="font-semibold text-lg mb-2">운행 기록 조회</h3>
              <p className="text-sm text-gray-600">지난 운행 기록을 확인하세요</p>
            </Link>

            <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer opacity-50">
              <h3 className="font-semibold text-lg mb-2">월별 현황</h3>
              <p className="text-sm text-gray-600">이번 달 운행 현황을 확인하세요 (준비중)</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 transition-colors cursor-pointer opacity-50">
              <h3 className="font-semibold text-lg mb-2">정산 내역</h3>
              <p className="text-sm text-gray-600">유류비 정산 내역을 확인하세요 (준비중)</p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">사용자 정보</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">이름:</span> {user?.name}</p>
              <p><span className="font-medium">이메일:</span> {user?.email}</p>
              <p><span className="font-medium">차종:</span> {
                user?.vehicle_type === 'gasoline' ? '휘발유' :
                user?.vehicle_type === 'diesel' ? '경유' : '전기'
              }</p>
              <p><span className="font-medium">역할:</span> {
                user?.role === 'admin' ? '관리자' : '직원'
              }</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
