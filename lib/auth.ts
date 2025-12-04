import { supabase } from './supabase';

// 관리자 로그인 (이메일 + 비밀번호)
export async function signInAdmin(email: string, password: string) {
  // users 테이블에서 관리자 확인
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .eq('role', 'admin')
    .single();

  if (error || !users) {
    return { data: null, error: { message: '관리자 계정을 찾을 수 없습니다.' } };
  }

  // 비밀번호 확인 (pgcrypto 사용)
  const { data: passwordCheck } = await supabase.rpc('check_password', {
    user_id: users.id,
    input_password: password,
  });

  if (!passwordCheck) {
    return { data: null, error: { message: '비밀번호가 일치하지 않습니다.' } };
  }

  return { data: users, error: null };
}

// 직원 로그인 (이름 + PIN)
export async function signInEmployee(name: string, pin: string) {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('name', name)
    .eq('pin', pin)
    .eq('role', 'employee')
    .single();

  if (error || !users) {
    return { data: null, error: { message: '이름 또는 PIN이 일치하지 않습니다.' } };
  }

  return { data: users, error: null };
}

// 회원가입
export async function signUp(
  email: string,
  password: string,
  name: string,
  vehicleType: 'diesel' | 'gasoline' | 'electric'
) {
  // 1. Supabase Auth에 회원가입
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    return { data: null, error: authError };
  }

  // 2. users 테이블에 추가 정보 저장
  if (authData.user) {
    const { error: profileError } = await supabase.from('users').insert([
      {
        id: authData.user.id,
        email,
        name,
        role: 'employee', // 기본값은 직원
        vehicle_type: vehicleType,
      },
    ]);

    if (profileError) {
      return { data: null, error: profileError };
    }
  }

  return { data: authData, error: null };
}

// 로그아웃
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// 현재 사용자 정보 가져오기 (세션 스토리지 기반)
export function getCurrentUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  const userStr = sessionStorage.getItem('currentUser');
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// 사용자 세션 저장
export function setCurrentUser(user: any) {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem('currentUser', JSON.stringify(user));
}

// 사용자 세션 삭제
export function clearCurrentUser() {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem('currentUser');
}

// 관리자 직원 추가
export async function addEmployee(
  name: string,
  pin: string,
  vehicleType: 'diesel' | 'gasoline' | 'electric'
) {
  const { data, error } = await supabase.from('users').insert([
    {
      name,
      pin,
      vehicle_type: vehicleType,
      role: 'employee',
    },
  ]).select().single();

  return { data, error };
}
