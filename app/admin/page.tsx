'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, clearCurrentUser, addEmployee } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);

  // 직원 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    pin: '',
    vehicleType: 'gasoline' as 'diesel' | 'gasoline' | 'electric',
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    checkUser();
    loadEmployees();
  }, []);

  function checkUser() {
    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/login');
      return;
    }

    setUser(currentUser);
    setLoading(false);
  }

  async function loadEmployees() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setEmployees(data);
    }
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddLoading(true);

    // PIN 유효성 검사
    if (newEmployee.pin.length !== 4) {
      setAddError('PIN은 4자리 숫자여야 합니다.');
      setAddLoading(false);
      return;
    }

    const { data, error } = await addEmployee(
      newEmployee.name,
      newEmployee.pin,
      newEmployee.vehicleType
    );

    if (error) {
      setAddError('직원 추가에 실패했습니다: ' + error.message);
      setAddLoading(false);
      return;
    }

    // 성공
    setNewEmployee({ name: '', pin: '', vehicleType: 'gasoline' });
    setShowAddForm(false);
    setAddLoading(false);
    loadEmployees(); // 목록 새로고침
    alert(`${newEmployee.name}님이 추가되었습니다!`);
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
            <h1 className="text-2xl font-bold text-gray-900">관리자 페이지</h1>
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">직원 관리</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? '취소' : '+ 직원 추가'}
            </button>
          </div>

          {/* 직원 추가 폼 */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-4">새 직원 추가</h3>

              {addError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="홍길동"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN (4자리)
                    </label>
                    <input
                      type="text"
                      value={newEmployee.pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setNewEmployee({ ...newEmployee, pin: value });
                      }}
                      required
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1234"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      차종
                    </label>
                    <select
                      value={newEmployee.vehicleType}
                      onChange={(e) => setNewEmployee({ ...newEmployee, vehicleType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gasoline">휘발유</option>
                      <option value="diesel">경유</option>
                      <option value="electric">전기</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {addLoading ? '추가 중...' : '직원 추가'}
                </button>
              </form>
            </div>
          )}

          {/* 직원 목록 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    차종
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                      등록된 직원이 없습니다.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {employee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.pin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.vehicle_type === 'gasoline' ? '휘발유' :
                         employee.vehicle_type === 'diesel' ? '경유' : '전기'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(employee.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
