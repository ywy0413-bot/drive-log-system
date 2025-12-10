'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function RecordsPage({
  params,
  searchParams,
}: {
  params?: any;
  searchParams?: any;
}) {
  const router = useRouter();
  const user = getCurrentUser();

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadRecords();
    loadSubmissionStatus();
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

  async function loadSubmissionStatus() {
    const [year, month] = selectedMonth.split('-').map(Number);

    const { data, error } = await supabase
      .from('monthly_submissions')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .single();

    if (!error && data) {
      setSubmissionStatus(data);
    } else {
      setSubmissionStatus(null);
    }
  }

  async function handleSubmit() {
    if (!confirm('이번 달 운행 기록을 제출하시겠습니까?')) {
      return;
    }

    setSubmitting(true);

    const [year, month] = selectedMonth.split('-').map(Number);

    const { data, error } = await supabase
      .from('monthly_submissions')
      .insert({
        user_id: user.id,
        year,
        month,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      alert('제출에 실패했습니다: ' + error.message);
      setSubmitting(false);
      return;
    }

    alert('운행 기록이 제출되었습니다!');
    setSubmissionStatus(data);
    setSubmitting(false);
  }

  async function handleCancelSubmission() {
    if (!confirm('제출을 취소하시겠습니까?')) {
      return;
    }

    setSubmitting(true);

    const { error } = await supabase
      .from('monthly_submissions')
      .delete()
      .eq('id', submissionStatus.id);

    if (error) {
      alert('제출 취소에 실패했습니다: ' + error.message);
      setSubmitting(false);
      return;
    }

    alert('제출이 취소되었습니다.');
    setSubmissionStatus(null);
    setSubmitting(false);
  }

  async function handleDeleteRecord(recordId: string) {
    // 정산 상태 체크
    if (submissionStatus?.status === 'completed') {
      alert('정산이 완료되어 추가 및 수정이 불가능합니다. 추가 및 수정이 필요한 경우에는 담당자에게 문의 부탁드립니다.');
      return;
    }

    if (submissionStatus?.status === 'pending') {
      alert('정산중인 상태를 취소한 후 운행 기록을 수정해 주세요.');
      return;
    }

    if (!confirm('이 운행 기록을 삭제하시겠습니까?')) {
      return;
    }

    const { error } = await supabase
      .from('drive_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      alert('삭제에 실패했습니다: ' + error.message);
      return;
    }

    alert('운행 기록이 삭제되었습니다.');
    loadRecords(); // 목록 새로고침
  }

  function handleNewRecordClick(e: React.MouseEvent) {
    // 정산 상태 체크
    if (submissionStatus?.status === 'completed') {
      e.preventDefault();
      alert('정산이 완료되어 추가 및 수정이 불가능합니다. 추가 및 수정이 필요한 경우에는 담당자에게 문의 부탁드립니다.');
      return;
    }

    if (submissionStatus?.status === 'pending') {
      e.preventDefault();
      alert('정산중인 상태를 취소한 후 운행 기록을 수정해 주세요.');
      return;
    }
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">운행 기록 조회</h1>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        {/* 월 선택 및 요약 */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                조회 월
              </label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div className="flex gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-600">총 운행 건수</p>
                <p className="text-lg font-bold text-blue-600">{records.length}건</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">총 운행 거리</p>
                <p className="text-lg font-bold text-green-600">{totalDistance.toFixed(1)}km</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-600">작성중</p>
                <p className="text-lg font-bold text-gray-600">{draftCount}건</p>
              </div>
            </div>
          </div>

          {/* 정산 상태 및 제출 버튼 */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-gray-200">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">정산 상태</p>
              {submissionStatus ? (
                <div className="flex flex-col gap-2">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                      submissionStatus.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {submissionStatus.status === 'pending' ? '⏳ 정산중' : '✓ 정산완료'}
                  </span>
                  {submissionStatus.status === 'completed' && (
                    <p className="text-sm text-gray-600">정산이 완료되어 수정이 불가능합니다</p>
                  )}
                </div>
              ) : (
                <span className="text-gray-500 text-sm">미제출</span>
              )}
            </div>

            {!submissionStatus && (
              <button
                onClick={handleSubmit}
                disabled={submitting || records.length === 0}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {submitting ? '제출 중...' : '📝 운행기록 제출'}
              </button>
            )}

            {submissionStatus && submissionStatus.status === 'pending' && (
              <button
                onClick={handleCancelSubmission}
                disabled={submitting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {submitting ? '취소 중...' : '🗑️ 제출 취소'}
              </button>
            )}
          </div>
        </div>

        {/* 운행 기록 목록 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center text-gray-500 text-sm">로딩 중...</div>
          ) : records.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p className="mb-3 text-sm">이번 달 운행 기록이 없습니다.</p>
              <Link
                href="/employee/new-record"
                onClick={handleNewRecordClick}
                className="inline-block bg-blue-600 text-white px-4 py-2 text-sm rounded-md hover:bg-blue-700"
              >
                새 운행 기록 작성
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      날짜
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      출발지
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      도착지
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      거리(km)
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      외근지
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900">
                        {new Date(record.drive_date).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {record.departure}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {record.destination}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-900 font-medium">
                        {parseFloat(record.distance).toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {record.client_name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 text-xs font-semibold rounded-full ${
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
                      <td className="px-3 py-2 whitespace-nowrap text-xs">
                        <button
                          onClick={() => handleDeleteRecord(record.id)}
                          className="text-red-600 hover:text-red-800 font-medium transition-colors"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="mt-4 flex gap-2">
          <Link
            href="/employee"
            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            ← 대시보드로
          </Link>
          <Link
            href="/employee/new-record"
            onClick={handleNewRecordClick}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + 새 운행 기록
          </Link>
        </div>
      </main>
    </div>
  );
}
