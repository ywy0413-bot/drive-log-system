export type VehicleType = 'diesel' | 'gasoline' | 'electric';
export type UserRole = 'employee' | 'admin';
export type RecordStatus = 'draft' | 'pending' | 'settled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  vehicle_type: VehicleType;
  created_at: string;
}

export interface DriveRecord {
  id: string;
  user_id: string;
  drive_date: string;
  departure: string;
  destination: string;
  waypoints?: string[];
  distance: number;
  client_name: string;
  status: RecordStatus;
  created_at: string;
  updated_at: string;
}

export interface FuelRate {
  id: string;
  vehicle_type: VehicleType;
  rate_per_km: number;
  effective_from: string;
  effective_to?: string;
}

export interface MonthlySettlement {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_distance: number;
  total_amount: number;
  status: RecordStatus;
  settled_at?: string;
  settled_by?: string;
}

// Kakao Maps 관련 타입
export interface Address {
  address_name: string;
  road_address_name?: string;
  x: string; // 경도
  y: string; // 위도
  place_name?: string; // 장소명 (업체명, 건물명 등)
}
