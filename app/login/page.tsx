'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInAdmin, signInEmployee, setCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState<'employee' | 'admin'>('employee');

  // 직원 로그인
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');

  // 관리자 로그인
  const [email, setEmail] = useState('gwp@envision.co.kr');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'employee')
      .order('name', { ascending: true });

    if (!error && data) {
      setEmployees(data);
    }
  }

  const handleEmployeeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await signInEmployee(name, pin);

      if (error || !data) {
        setError(error?.message || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      setCurrentUser(data);
      router.push('/employee');
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await signInAdmin(email, password);

      if (error || !data) {
        setError(error?.message || '로그인에 실패했습니다.');
        setLoading(false);
        return;
      }

      setCurrentUser(data);
      router.push('/admin');
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 px-4 py-4 flex flex-col">
      {/* 헤더 */}
      <div className="text-center text-white mb-4 pt-2">
        <h1 className="text-2xl md:text-3xl font-bold mb-1">자가운전대장</h1>
        <p className="text-blue-100 text-xs md:text-sm">운행 기록 관리 시스템</p>
      </div>

      {/* 메인 카드 */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-5 md:p-8 mx-auto">
          {/* 아이콘 */}
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
                <span className="text-3xl md:text-4xl">🔐</span>
              </div>
              <div className="absolute -right-1 -bottom-1 w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded-xl flex items-center justify-center shadow-md transform rotate-12">
                <span className="text-lg md:text-xl">🔑</span>
              </div>
            </div>
          </div>

          {/* 제목 */}
          <h2 className="text-xl md:text-2xl font-bold text-center text-gray-800 mb-4">로그인</h2>

          {/* 로그인 타입 선택 */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setLoginType('employee')}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-sm transition-all ${
                loginType === 'employee'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              👤 운전자
            </button>
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={`flex-1 py-3 px-3 rounded-xl font-bold text-sm transition-all ${
                loginType === 'admin'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              🔑 관리자
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-xl flex items-start gap-2">
              <span className="text-red-500 text-lg">⚠️</span>
              <p className="text-red-700 text-sm font-semibold flex-1">{error}</p>
            </div>
          )}

          {/* 직원 로그인 폼 */}
          {loginType === 'employee' && (
            <form onSubmit={handleEmployeeLogin} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                  운전자 선택 <span className="text-red-500">*</span>
                </label>
                <select
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500 transition-all text-sm bg-gray-50 text-gray-900"
                >
                  <option value="">운전자를 선택하세요</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pin" className="block text-sm font-bold text-gray-700 mb-2">
                  PIN 번호 (4자리) <span className="text-red-500">*</span>
                </label>
                <input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(value);
                  }}
                  required
                  maxLength={4}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500 transition-all text-3xl tracking-[0.7em] text-center font-bold bg-blue-50 text-gray-900"
                  placeholder="••••"
                />
                <p className="text-xs text-gray-500 mt-1.5 text-center">PIN번호는 개인 휴대전화 뒤 4자리입니다</p>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-xs text-gray-700 font-medium">
                  이 기기에서 자동 로그인
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-5 rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-bold text-base shadow-lg flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    로그인 중...
                  </>
                ) : (
                  '로그인'
                )}
              </button>
            </form>
          )}

          {/* 관리자 로그인 폼 */}
          {loginType === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500 transition-all text-sm bg-gray-50 text-gray-900"
                  placeholder="이메일을 입력하세요"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                  비밀번호 <span className="text-red-500">*</span>
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-0 focus:border-blue-500 transition-all text-sm bg-gray-50 text-gray-900"
                  placeholder="비밀번호를 입력하세요"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 px-5 rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-all font-bold text-base shadow-lg flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    로그인 중...
                  </>
                ) : (
                  '관리자 로그인'
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 하단 링크 */}
      <div className="text-center pb-4">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-white/80 hover:text-white font-medium transition-colors">
          ← 메인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
