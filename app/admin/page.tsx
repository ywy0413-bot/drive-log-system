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
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7) // YYYY-MM
  );

  // 연료 가격 관리
  const [fuelPrices, setFuelPrices] = useState({
    gasoline_price: '',
    diesel_price: '',
    lpg_price: '',
    electric_price: '',
    depreciation_cost: '',
  });
  const [fuelPricesLoading, setFuelPricesLoading] = useState(false);
  const [fuelPricesSaving, setFuelPricesSaving] = useState(false);

  // 운전자 추가 폼
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    pin: '',
    vehicleType: 'gasoline' as 'diesel' | 'gasoline' | 'lpg' | 'electric',
    fuelEfficiency: '10.0',
  });
  const [addError, setAddError] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // 운전자 수정 폼
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [editError, setEditError] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // 운행기록 보기
  const [showRecordsModal, setShowRecordsModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [driveRecords, setDriveRecords] = useState<any[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);

  useEffect(() => {
    checkUser();
    loadEmployees();
  }, []);

  useEffect(() => {
    loadSubmissions();
    loadFuelPrices();
  }, [selectedMonth]);

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
      .order('name', { ascending: true });

    if (!error && data) {
      setEmployees(data);
    }
  }

  async function loadSubmissions() {
    const [year, month] = selectedMonth.split('-').map(Number);

    const { data, error } = await supabase
      .from('monthly_submissions')
      .select(`
        *,
        users:user_id (
          name,
          email,
          vehicle_type
        )
      `)
      .eq('year', year)
      .eq('month', month)
      .order('submitted_at', { ascending: false });

    if (!error && data) {
      setSubmissions(data);
    } else {
      console.error('Error loading submissions:', error);
    }
  }

  async function handleCompleteSubmission(submissionId: string) {
    if (!confirm('이 제출 건을 정산 완료 처리하시겠습니까?')) {
      return;
    }

    // 해당 submission 정보 가져오기
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) return;

    // 해당 월의 연료 가격 조회
    const { data: fuelPriceData, error: fuelPriceError } = await supabase
      .from('monthly_fuel_prices')
      .select('*')
      .eq('year', submission.year)
      .eq('month', submission.month)
      .single();

    if (fuelPriceError || !fuelPriceData) {
      alert('연료 금액을 입력해주세요');
      return;
    }

    // 연료 타입에 맞는 가격 선택
    const vehicleType = submission.users?.vehicle_type;
    const fuelEfficiency = submission.users?.fuel_efficiency || 10;
    let fuelPrice = 0;
    if (vehicleType === 'gasoline') {
      fuelPrice = parseFloat(fuelPriceData.gasoline_price);
    } else if (vehicleType === 'diesel') {
      fuelPrice = parseFloat(fuelPriceData.diesel_price);
    } else if (vehicleType === 'lpg') {
      fuelPrice = parseFloat(fuelPriceData.lpg_price);
    } else if (vehicleType === 'electric') {
      fuelPrice = parseFloat(fuelPriceData.electric_price);
    }

    if (!fuelPrice || fuelPrice === 0) {
      alert('연료 금액을 입력해주세요');
      return;
    }

    if (!fuelEfficiency || fuelEfficiency === 0) {
      alert('연비 정보가 없습니다. 직원 정보를 확인해주세요.');
      return;
    }

    // 해당 사용자의 해당 월 운행 기록 총 거리 계산
    const [year, month] = selectedMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data: records, error: recordsError } = await supabase
      .from('drive_records')
      .select('distance')
      .eq('user_id', submission.user_id)
      .gte('drive_date', startDateStr)
      .lte('drive_date', endDateStr);

    if (recordsError) {
      alert('운행 기록을 불러오는데 실패했습니다: ' + recordsError.message);
      return;
    }

    const totalDistance = records?.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0) || 0;

    // 감가상각비 가져오기 (월별 설정값 사용)
    const depreciationCostPerKm = parseFloat(fuelPriceData.depreciation_cost) || 140;

    // 새로운 정산 계산 로직
    // 연료비 = (총운행거리 / 연비) × 리터당가격 (또는 kWh당가격)
    const fuelCost = Math.round((totalDistance / fuelEfficiency) * fuelPrice);

    // 감가상각비 = 총운행거리 × 월별 감가상각비/km
    const depreciationCost = Math.round(totalDistance * depreciationCostPerKm);

    // 정산금액 = 연료비 + 감가상각비
    const settlementAmount = fuelCost + depreciationCost;

    const { error } = await supabase
      .from('monthly_submissions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
        settlement_amount: settlementAmount,
      })
      .eq('id', submissionId);

    if (error) {
      alert('정산 완료 처리에 실패했습니다: ' + error.message);
      return;
    }

    alert(`정산 완료 처리되었습니다!\n\n- 총 운행거리: ${totalDistance.toFixed(1)} km\n- 연료비: ${fuelCost.toLocaleString()}원\n- 감가상각비: ${depreciationCost.toLocaleString()}원\n- 정산 금액: ${settlementAmount.toLocaleString()}원`);
    loadSubmissions(); // 목록 새로고침
  }

  async function handleCancelSubmission(submissionId: string) {
    if (!confirm('이 제출 건의 정산을 취소하시겠습니까?')) {
      return;
    }

    const { error } = await supabase
      .from('monthly_submissions')
      .update({
        status: 'pending',
        completed_at: null,
        completed_by: null,
        settlement_amount: null,
      })
      .eq('id', submissionId);

    if (error) {
      alert('정산 취소에 실패했습니다: ' + error.message);
      return;
    }

    alert('정산이 취소되었습니다.');
    loadSubmissions(); // 목록 새로고침
  }

  async function handleCloseMonth() {
    const [year, month] = selectedMonth.split('-').map(Number);
    const pendingCount = submissions.filter(s => s.status === 'pending').length;

    if (pendingCount === 0) {
      alert('정산중인 제출 건이 없습니다.');
      return;
    }

    if (!confirm(`${year}년 ${month}월의 모든 제출 건(${pendingCount}건)을 정산 완료 처리하시겠습니까?`)) {
      return;
    }

    const { error } = await supabase
      .from('monthly_submissions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: user.id,
      })
      .eq('year', year)
      .eq('month', month)
      .eq('status', 'pending');

    if (error) {
      alert('정산 마감 처리에 실패했습니다: ' + error.message);
      return;
    }

    alert(`${pendingCount}건의 제출이 정산 완료 처리되었습니다!`);
    loadSubmissions(); // 목록 새로고침
  }

  async function handleBulkSettlement() {
    const [year, month] = selectedMonth.split('-').map(Number);
    const pendingSubmissions = submissions.filter(s => s.status === 'pending');

    if (pendingSubmissions.length === 0) {
      alert('정산할 제출 건이 없습니다.');
      return;
    }

    if (!confirm(`${year}년 ${month}월의 모든 제출 건(${pendingSubmissions.length}건)을 일괄 정산하시겠습니까?\n\n각 제출 건의 운행 거리와 연비에 따라 정산 금액이 자동으로 계산됩니다.`)) {
      return;
    }

    // 해당 월의 연료 가격 조회
    const { data: fuelPriceData, error: fuelPriceError } = await supabase
      .from('monthly_fuel_prices')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single();

    if (fuelPriceError || !fuelPriceData) {
      alert('연료 가격을 먼저 설정해주세요.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // 각 제출 건에 대해 정산 처리
    for (const submission of pendingSubmissions) {
      try {
        // 연료 타입에 맞는 가격 선택
        const vehicleType = submission.users?.vehicle_type;
        const fuelEfficiency = submission.users?.fuel_efficiency || 10;
        let fuelPrice = 0;

        if (vehicleType === 'gasoline') {
          fuelPrice = parseFloat(fuelPriceData.gasoline_price);
        } else if (vehicleType === 'diesel') {
          fuelPrice = parseFloat(fuelPriceData.diesel_price);
        } else if (vehicleType === 'lpg') {
          fuelPrice = parseFloat(fuelPriceData.lpg_price);
        } else if (vehicleType === 'electric') {
          fuelPrice = parseFloat(fuelPriceData.electric_price);
        }

        if (!fuelPrice || fuelPrice === 0) {
          failCount++;
          continue;
        }

        if (!fuelEfficiency || fuelEfficiency === 0) {
          failCount++;
          continue;
        }

        // 해당 사용자의 해당 월 운행 기록 총 거리 계산
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const { data: records, error: recordsError } = await supabase
          .from('drive_records')
          .select('distance')
          .eq('user_id', submission.user_id)
          .gte('drive_date', startDateStr)
          .lte('drive_date', endDateStr);

        if (recordsError) {
          failCount++;
          continue;
        }

        const totalDistance = records?.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0) || 0;

        // 감가상각비 가져오기 (월별 설정값 사용)
        const depreciationCostPerKm = parseFloat(fuelPriceData.depreciation_cost) || 140;

        // 정산 금액 계산
        const fuelCost = Math.round((totalDistance / fuelEfficiency) * fuelPrice);
        const depreciationCost = Math.round(totalDistance * depreciationCostPerKm);
        const settlementAmount = fuelCost + depreciationCost;

        // 정산 완료 처리
        const { error } = await supabase
          .from('monthly_submissions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: user.id,
            settlement_amount: settlementAmount,
          })
          .eq('id', submission.id);

        if (error) {
          failCount++;
        } else {
          successCount++;
        }
      } catch (error) {
        failCount++;
      }
    }

    alert(`일괄 정산이 완료되었습니다!\n\n성공: ${successCount}건\n실패: ${failCount}건`);
    loadSubmissions(); // 목록 새로고침
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

    // 연비 유효성 검사
    const fuelEff = parseFloat(newEmployee.fuelEfficiency);
    if (isNaN(fuelEff) || fuelEff <= 0) {
      setAddError('연비는 0보다 큰 숫자여야 합니다.');
      setAddLoading(false);
      return;
    }

    const { data, error } = await addEmployee(
      newEmployee.name,
      newEmployee.pin,
      newEmployee.vehicleType,
      fuelEff
    );

    if (error) {
      setAddError('직원 추가에 실패했습니다: ' + error.message);
      setAddLoading(false);
      return;
    }

    // 성공
    setNewEmployee({ name: '', pin: '', vehicleType: 'gasoline', fuelEfficiency: '10.0' });
    setShowAddForm(false);
    setAddLoading(false);
    loadEmployees(); // 목록 새로고침
    alert(`${newEmployee.name}님이 추가되었습니다!`);
  }

  function handleEditEmployee(employee: any) {
    setEditingEmployee({
      id: employee.id,
      name: employee.name,
      pin: employee.pin,
      vehicleType: employee.vehicle_type,
      fuelEfficiency: employee.fuel_efficiency?.toString() || '10.0',
    });
    setShowEditForm(true);
    setEditError('');
  }

  async function handleUpdateEmployee(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);

    if (!editingEmployee) return;

    // PIN 유효성 검사
    if (editingEmployee.pin.length !== 4) {
      setEditError('PIN은 4자리 숫자여야 합니다.');
      setEditLoading(false);
      return;
    }

    // 연비 유효성 검사
    const fuelEff = parseFloat(editingEmployee.fuelEfficiency);
    if (isNaN(fuelEff) || fuelEff <= 0) {
      setEditError('연비는 0보다 큰 숫자여야 합니다.');
      setEditLoading(false);
      return;
    }

    const { error } = await supabase
      .from('users')
      .update({
        name: editingEmployee.name,
        pin: editingEmployee.pin,
        vehicle_type: editingEmployee.vehicleType,
        fuel_efficiency: fuelEff,
      })
      .eq('id', editingEmployee.id);

    if (error) {
      setEditError('운전자 정보 수정에 실패했습니다: ' + error.message);
      setEditLoading(false);
      return;
    }

    // 성공
    setShowEditForm(false);
    setEditingEmployee(null);
    setEditLoading(false);
    loadEmployees(); // 목록 새로고침
    alert('운전자 정보가 수정되었습니다!');
  }

  async function handleDeleteEmployee(employeeId: string, employeeName: string) {
    if (!confirm(`${employeeName}님을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 해당 운전자의 모든 운행 기록도 함께 삭제됩니다.`)) {
      return;
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', employeeId);

    if (error) {
      alert('운전자 삭제에 실패했습니다: ' + error.message);
      return;
    }

    alert(`${employeeName}님이 삭제되었습니다.`);
    loadEmployees(); // 목록 새로고침
  }

  async function loadFuelPrices() {
    setFuelPricesLoading(true);
    const [year, month] = selectedMonth.split('-').map(Number);

    const { data, error } = await supabase
      .from('monthly_fuel_prices')
      .select('*')
      .eq('year', year)
      .eq('month', month)
      .single();

    if (!error && data) {
      setFuelPrices({
        gasoline_price: data.gasoline_price.toString(),
        diesel_price: data.diesel_price.toString(),
        lpg_price: data.lpg_price?.toString() || '',
        electric_price: data.electric_price.toString(),
        depreciation_cost: data.depreciation_cost?.toString() || '140',
      });
    } else {
      // 데이터가 없으면 빈 값으로 초기화
      setFuelPrices({
        gasoline_price: '',
        diesel_price: '',
        lpg_price: '',
        electric_price: '',
        depreciation_cost: '140',
      });
    }

    setFuelPricesLoading(false);
  }

  async function handleSaveFuelPrices() {
    if (!fuelPrices.gasoline_price || !fuelPrices.diesel_price || !fuelPrices.lpg_price || !fuelPrices.electric_price || !fuelPrices.depreciation_cost) {
      alert('모든 연료 가격과 감가상각비를 입력해주세요.');
      return;
    }

    setFuelPricesSaving(true);
    const [year, month] = selectedMonth.split('-').map(Number);

    const { error } = await supabase
      .from('monthly_fuel_prices')
      .upsert({
        year,
        month,
        gasoline_price: parseFloat(fuelPrices.gasoline_price),
        diesel_price: parseFloat(fuelPrices.diesel_price),
        lpg_price: parseFloat(fuelPrices.lpg_price),
        electric_price: parseFloat(fuelPrices.electric_price),
        depreciation_cost: parseFloat(fuelPrices.depreciation_cost),
      }, {
        onConflict: 'year,month'
      });

    if (error) {
      alert('연료 가격 저장에 실패했습니다: ' + error.message);
      setFuelPricesSaving(false);
      return;
    }

    alert('연료 가격이 저장되었습니다!');
    setFuelPricesSaving(false);
    loadFuelPrices(); // 목록 새로고침
  }

  async function handleViewRecords(submission: any) {
    setSelectedSubmission(submission);
    setShowRecordsModal(true);
    setRecordsLoading(true);

    // 해당 월의 운행 기록 조회
    const startDate = new Date(submission.year, submission.month - 1, 1);
    const endDate = new Date(submission.year, submission.month, 0);
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('drive_records')
      .select('*')
      .eq('user_id', submission.user_id)
      .gte('drive_date', startDateStr)
      .lte('drive_date', endDateStr)
      .order('drive_date', { ascending: false });

    if (!error && data) {
      setDriveRecords(data);
    } else {
      console.error('Error loading drive records:', error);
      setDriveRecords([]);
    }

    setRecordsLoading(false);
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
        {/* 연료 가격 관리 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">월별 연료 가격 관리</h2>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            ℹ️ 선택한 월({selectedMonth})의 연료 단가를 입력하세요. 이 가격은 유류비 정산 계산에 사용됩니다.
          </div>

          {fuelPricesLoading ? (
            <div className="text-center py-4 text-gray-500">로딩 중...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    휘발유 (원/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelPrices.gasoline_price}
                    onChange={(e) => setFuelPrices({ ...fuelPrices, gasoline_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="예: 1650.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    경유 (원/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelPrices.diesel_price}
                    onChange={(e) => setFuelPrices({ ...fuelPrices, diesel_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="예: 1500.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LPG (원/L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelPrices.lpg_price}
                    onChange={(e) => setFuelPrices({ ...fuelPrices, lpg_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="예: 1200.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    전기 (원/kWh)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={fuelPrices.electric_price}
                    onChange={(e) => setFuelPrices({ ...fuelPrices, electric_price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="예: 300.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    감가상각비 (원/km)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={fuelPrices.depreciation_cost}
                    onChange={(e) => setFuelPrices({ ...fuelPrices, depreciation_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="예: 140"
                  />
                </div>
              </div>

              <button
                onClick={handleSaveFuelPrices}
                disabled={fuelPricesSaving}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {fuelPricesSaving ? '저장 중...' : '💾 연료 가격 저장'}
              </button>
            </div>
          )}
        </div>

        {/* 운행기록 제출 관리 */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold">운행기록 제출 관리</h2>

            <div className="flex gap-3 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  조회 월
                </label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <button
                onClick={handleBulkSettlement}
                disabled={submissions.filter(s => s.status === 'pending').length === 0}
                className="mt-6 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                💰 일괄 정산
              </button>

              <button
                onClick={handleCloseMonth}
                disabled={submissions.filter(s => s.status === 'pending').length === 0}
                className="mt-6 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                🔒 정산 마감
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    구성원
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연료
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제출 월
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제출일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    정산 금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      제출된 운행기록이 없습니다.
                    </td>
                  </tr>
                ) : (
                  submissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {submission.users?.name || '알 수 없음'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.users?.vehicle_type === 'gasoline' ? '휘발유' :
                         submission.users?.vehicle_type === 'diesel' ? '경유' :
                         submission.users?.vehicle_type === 'lpg' ? 'LPG' :
                         submission.users?.vehicle_type === 'electric' ? '전기' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {submission.year}년 {submission.month}월
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(submission.submitted_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            submission.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {submission.status === 'pending' ? '⏳ 정산중' : '✓ 정산완료'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {submission.settlement_amount ?
                          `${submission.settlement_amount.toLocaleString()}원` :
                          '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewRecords(submission)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                          >
                            운행기록 보기
                          </button>
                          {submission.status === 'pending' ? (
                            <button
                              onClick={() => handleCompleteSubmission(submission.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                            >
                              정산
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelSubmission(submission.id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
                            >
                              정산 취소
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 운전자 관리 */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">운전자 관리</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {showAddForm ? '취소' : '+ 운전자 추가'}
            </button>
          </div>

          {/* 운전자 추가 폼 */}
          {showAddForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-4">새 운전자 추가</h3>

              {addError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {addError}
                </div>
              )}

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="gasoline">휘발유</option>
                      <option value="diesel">경유</option>
                      <option value="lpg">LPG</option>
                      <option value="electric">전기</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연비 ({newEmployee.vehicleType === 'electric' ? 'km/kWh' : 'km/L'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newEmployee.fuelEfficiency}
                      onChange={(e) => setNewEmployee({ ...newEmployee, fuelEfficiency: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="10.0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                  {addLoading ? '추가 중...' : '운전자 추가'}
                </button>
              </form>
            </div>
          )}

          {/* 운전자 수정 폼 */}
          {showEditForm && editingEmployee && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold mb-4">운전자 정보 수정</h3>

              {editError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {editError}
                </div>
              )}

              <form onSubmit={handleUpdateEmployee} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      이름
                    </label>
                    <input
                      type="text"
                      value={editingEmployee.name}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN (4자리)
                    </label>
                    <input
                      type="text"
                      value={editingEmployee.pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setEditingEmployee({ ...editingEmployee, pin: value });
                      }}
                      required
                      maxLength={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      차종
                    </label>
                    <select
                      value={editingEmployee.vehicleType}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, vehicleType: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      <option value="gasoline">휘발유</option>
                      <option value="diesel">경유</option>
                      <option value="lpg">LPG</option>
                      <option value="electric">전기</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      연비 ({editingEmployee.vehicleType === 'electric' ? 'km/kWh' : 'km/L'})
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={editingEmployee.fuelEfficiency}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, fuelEfficiency: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={editLoading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                  >
                    {editLoading ? '수정 중...' : '수정 완료'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditingEmployee(null);
                    }}
                    className="px-6 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 운전자 목록 */}
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
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
                    연료
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    연비
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      등록된 운전자가 없습니다.
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
                         employee.vehicle_type === 'diesel' ? '경유' :
                         employee.vehicle_type === 'lpg' ? 'LPG' : '전기'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.fuel_efficiency?.toFixed(1)} ({employee.vehicle_type === 'electric' ? 'km/kWh' : 'km/L'})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(employee.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 운행기록 보기 모달 */}
        {showRecordsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* 모달 헤더 */}
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {selectedSubmission?.users?.name}님의 운행기록
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedSubmission?.year}년 {selectedSubmission?.month}월
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowRecordsModal(false);
                    setSelectedSubmission(null);
                    setDriveRecords([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* 모달 바디 */}
              <div className="flex-1 overflow-y-auto p-6">
                {recordsLoading ? (
                  <div className="text-center py-8 text-gray-500">로딩 중...</div>
                ) : driveRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    운행 기록이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 요약 정보 */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">운행 요약</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">총 운행 건수</p>
                          <p className="text-lg font-bold text-gray-900">{driveRecords.length}건</p>
                        </div>
                        <div>
                          <p className="text-gray-600">총 운행 거리</p>
                          <p className="text-lg font-bold text-blue-600">
                            {driveRecords.reduce((sum, r) => sum + parseFloat(r.distance || 0), 0).toFixed(1)}km
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">정산 상태</p>
                          <p className={`text-lg font-bold ${selectedSubmission?.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}`}>
                            {selectedSubmission?.status === 'pending' ? '정산중' : '정산완료'}
                          </p>
                        </div>
                        {selectedSubmission?.settlement_amount && (
                          <div>
                            <p className="text-gray-600">정산 금액</p>
                            <p className="text-lg font-bold text-green-600">
                              {selectedSubmission.settlement_amount.toLocaleString()}원
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 운행기록 테이블 */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              날짜
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              출발지
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              도착지
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              거리
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              외근지
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {driveRecords.map((record) => (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {new Date(record.drive_date).toLocaleDateString('ko-KR')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {record.departure || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {record.destination || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-blue-600">
                                {parseFloat(record.distance || 0).toFixed(1)}km
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {record.client_name || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* 모달 푸터 */}
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowRecordsModal(false);
                    setSelectedSubmission(null);
                    setDriveRecords([]);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
