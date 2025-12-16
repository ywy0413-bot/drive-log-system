'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import KakaoMap from '@/components/KakaoMap';
import AddressSearch from '@/components/AddressSearch';
import { Address } from '@/types';

export default function NewRecordPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // 한국 시간 기준으로 오늘 날짜 설정
  const getKoreanToday = () => {
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const year = koreaTime.getFullYear();
    const month = String(koreaTime.getMonth() + 1).padStart(2, '0');
    const day = String(koreaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [driveDate, setDriveDate] = useState(getKoreanToday());
  const [clientName, setClientName] = useState('');
  const [distance, setDistance] = useState('');
  const [manualDistance, setManualDistance] = useState('');

  const [departure, setDeparture] = useState<Address | null>(null);
  const [destination, setDestination] = useState<Address | null>(null);
  const [waypoints, setWaypoints] = useState<{ id: number; address: Address | null }[]>([]);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [baseDistance, setBaseDistance] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDistance, setLoadingDistance] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [showClientSuggestions, setShowClientSuggestions] = useState(false);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const clientSuggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      loadRecentRecords(currentUser.id);
    }
    setIsClient(true);
  }, [router]);

  useEffect(() => {
    if (user && driveDate) {
      loadSubmissionStatus();
    }
  }, [user, driveDate]);

  // 외부 클릭 감지
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (clientSuggestionsRef.current && !clientSuggestionsRef.current.contains(event.target as Node)) {
        setShowClientSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadRecentRecords(userId: string) {
    const { data, error } = await supabase
      .from('drive_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setRecentRecords(data);
    }
  }

  async function loadSubmissionStatus() {
    const [year, month] = driveDate.split('-').map(Number);

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

  const handleAddressSelect = (type: string, address: Address) => {
    if (type === 'departure') setDeparture(address);
    else if (type === 'destination') setDestination(address);
    else if (type.startsWith('waypoint-')) {
      const index = parseInt(type.split('-')[1], 10);
      setWaypoints(prev =>
        prev.map(wp => (wp.id === index ? { ...wp, address } : wp))
      );
    }
  };

  const addWaypoint = () => {
    setWaypoints(prev => [...prev, { id: Date.now(), address: null }]);
  };

  const removeWaypoint = (id: number) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id));
  };

  const handleDistanceCalculated = (d: number) => {
    setBaseDistance(d.toString());
    setDistance(isRoundTrip ? (d * 2).toString() : d.toString());
  };

  const handleRoundTripToggle = () => {
    const newRoundTrip = !isRoundTrip;
    setIsRoundTrip(newRoundTrip);
    if (baseDistance) {
      const base = parseFloat(baseDistance);
      setDistance(newRoundTrip ? (base * 2).toString() : base.toString());
    }
  };

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setClientName(value);

    if (value.trim().length > 0) {
      // 업체명으로 필터링
      const uniqueClients = new Map();
      recentRecords.forEach(record => {
        if (record.client_name.toLowerCase().includes(value.toLowerCase())) {
          if (!uniqueClients.has(record.client_name)) {
            uniqueClients.set(record.client_name, record);
          }
        }
      });
      const filtered = Array.from(uniqueClients.values());
      setFilteredClients(filtered);
      setShowClientSuggestions(true);
    } else {
      setFilteredClients([]);
      setShowClientSuggestions(false);
    }
  };

  const handleClientSelect = (record: any) => {
    // 업체명만 설정
    setClientName(record.client_name);
    setShowClientSuggestions(false);
  };

  if (!isClient || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 정산 상태 체크
    if (submissionStatus?.status === 'completed') {
      alert('정산이 완료되어 추가 및 수정이 불가능합니다. 추가 및 수정이 필요한 경우에는 담당자에게 문의 부탁드립니다.');
      return;
    }

    if (submissionStatus?.status === 'pending') {
      alert('정산중인 상태를 취소한 후 운행 기록을 수정해 주세요.');
      return;
    }

    if (!departure || !destination) {
      setError('출발지와 도착지를 모두 입력해주세요.');
      return;
    }

    if (!departure.address_name || !destination.address_name) {
      setError('출발지와 도착지를 모두 입력해주세요.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // 직접 입력 거리가 있으면 그것을 사용, 없으면 자동 계산 거리 사용
      const isManualDistance = manualDistance && manualDistance.trim() !== '';
      const finalDistance = isManualDistance ? parseFloat(manualDistance) : parseFloat(distance);

      const { error } = await supabase.from('drive_records').insert([
        {
          user_id: user.id,
          drive_date: driveDate,
          departure: departure.address_name,
          destination: destination.address_name,
          waypoints: waypoints.map(wp => wp.address?.address_name).filter(Boolean),
          distance: finalDistance,
          is_manual_distance: isManualDistance,
          client_name: clientName,
          status: 'draft',
        },
      ]);

      if (error) {
        throw error;
      }

      alert('운행 기록이 저장되었습니다!');
      router.push('/employee/records');
    } catch (err) {
      setError('운행 기록 저장에 실패했습니다: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-3 px-3 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">새 운행 기록</h1>
            <p className="text-xs text-gray-500 mt-0.5">출발지와 도착지를 선택하고 운행 정보를 입력하세요</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>←</span> 뒤로
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 px-3 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Form Section */}
            <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-white">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-lg">📝</span>
                </div>
                <div>
                  <h2 className="text-base md:text-lg font-bold text-gray-900">운행 정보 입력</h2>
                  <p className="text-xs text-gray-500">모든 항목을 입력해주세요</p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="drive_date" className="block text-xs font-semibold text-gray-700 mb-1.5">📅 운행일자</label>
                  <input
                    type="date"
                    id="drive_date"
                    value={driveDate}
                    onChange={(e) => setDriveDate(e.target.value)}
                    required
                    className="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm text-gray-900"
                  />
                </div>

                <div className="relative" ref={clientSuggestionsRef}>
                  <label htmlFor="client_name" className="block text-xs font-semibold text-gray-700 mb-1.5">🏢 외근지 (업체명)</label>
                  <input
                    type="text"
                    id="client_name"
                    name="client_name_unique"
                    value={clientName}
                    onChange={handleClientNameChange}
                    onFocus={() => {
                      // 포커스 시 최근 업체명 목록 표시
                      if (recentRecords.length > 0) {
                        const uniqueClients = new Map();
                        recentRecords.forEach(record => {
                          if (!uniqueClients.has(record.client_name)) {
                            uniqueClients.set(record.client_name, record);
                          }
                        });
                        const clients = Array.from(uniqueClients.values()).slice(0, 10);
                        setFilteredClients(clients);
                        setShowClientSuggestions(true);
                      }
                    }}
                    required
                    placeholder="예: ㈜앤비젼"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm text-gray-900"
                  />
                  {showClientSuggestions && filteredClients.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-60 overflow-auto">
                      <div className="p-2">
                        <div className="px-2 py-1 text-xs font-semibold text-gray-500 flex items-center gap-1">
                          📋 최근 업체명
                        </div>
                        {filteredClients.map((record, index) => (
                          <div
                            key={index}
                            onClick={() => handleClientSelect(record)}
                            className="px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer rounded-lg transition-all mb-1 last:mb-0 border border-transparent hover:border-blue-200"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-bold text-blue-600 mb-1">
                                {record.client_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {record.departure} → {record.destination}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isClient ? (
                  <>
                    <div className="space-y-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base">🚗</span>
                        <h3 className="text-sm font-semibold text-gray-800">경로 정보</h3>
                      </div>
                      <AddressSearch
                        label="🔵 출발지"
                        onAddressSelect={(addr) => handleAddressSelect('departure', addr)}
                      />
                      <AddressSearch
                        label="🔴 도착지"
                        onAddressSelect={(addr) => handleAddressSelect('destination', addr)}
                      />
                      <div className="pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isRoundTrip}
                            onChange={handleRoundTripToggle}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            🔄 왕복 (거리 2배 적용)
                          </span>
                        </label>
                      </div>
                    </div>

                    {waypoints.length > 0 && (
                      <div className="space-y-2 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base">📍</span>
                          <h3 className="text-sm font-semibold text-gray-800">경유지</h3>
                        </div>
                        {waypoints.map((wp, index) => (
                          <div key={wp.id} className="flex items-end gap-2">
                            <div className="flex-grow">
                              <AddressSearch
                                label={`경유지 ${index + 1}`}
                                onAddressSelect={(addr) => handleAddressSelect(`waypoint-${wp.id}`, addr)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => removeWaypoint(wp.id)}
                              className="mb-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={addWaypoint}
                      className="w-full py-2 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-xs"
                    >
                      + 경유지 추가
                    </button>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    📏 운행거리 (km) {isRoundTrip && <span className="text-blue-600">(왕복)</span>}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* 자동 계산 거리 */}
                    <div>
                      <label htmlFor="auto_distance" className="block text-xs text-gray-600 mb-1">
                        자동 계산
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="auto_distance"
                          value={distance}
                          readOnly
                          step="0.1"
                          placeholder="계산 중..."
                          className="block w-full px-3 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-700 shadow-sm text-sm cursor-not-allowed"
                        />
                        {loadingDistance && (
                          <div className="absolute right-2 top-2">
                            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 직접 입력 거리 */}
                    <div>
                      <label htmlFor="manual_distance" className="block text-xs text-gray-600 mb-1">
                        직접 입력 (선택)
                      </label>
                      <input
                        type="number"
                        id="manual_distance"
                        value={manualDistance}
                        onChange={(e) => setManualDistance(e.target.value)}
                        step="0.1"
                        placeholder="직접 입력"
                        className="block w-full px-3 py-2 rounded-lg border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all text-sm text-gray-900"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">
                    💡 자동 계산: 직선 거리 × 1.4 (보정계수){isRoundTrip && <span className="text-blue-600 font-semibold"> × 2 (왕복)</span>}
                    <br />
                    직접 입력란이 비어있으면 자동 계산 거리가 저장됩니다
                  </p>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        저장 중...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        운행 기록 저장
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Map Section */}
            <div className="relative h-full min-h-[400px] lg:min-h-[600px] bg-gray-100">
              <div className="absolute top-2 left-2 right-2 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-base">🗺️</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">경로 미리보기</h3>
                    <p className="text-xs text-gray-500">지도에서 경로를 확인하세요</p>
                  </div>
                </div>
              </div>
              {isClient ? (
                <KakaoMap
                  departure={departure}
                  destination={destination}
                  waypoints={waypoints.map(w => w.address).filter((a): a is Address => a !== null)}
                  onDistanceCalculated={handleDistanceCalculated}
                  setLoading={setLoadingDistance}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                  <p className="text-gray-600 font-medium">지도 로딩 중...</p>
                </div>
              )}
            </div>
          </div>
          {error && (
            <div className="p-4 bg-red-50 border-t border-red-200">
              <p className="text-sm text-red-600 text-center">⚠️ {error}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
