import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Types
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'admin';
  vehicle_type: 'diesel' | 'gasoline' | 'electric';
  created_at: string;
};

export type DriveRecord = {
  id: string;
  user_id: string;
  drive_date: string;
  departure: string;
  destination: string;
  waypoints?: string[];
  distance: number;
  client_name: string;
  status: 'draft' | 'pending' | 'settled';
  created_at: string;
  updated_at: string;
};

export type FuelRate = {
  id: string;
  vehicle_type: 'diesel' | 'gasoline' | 'electric';
  rate_per_km: number;
  effective_from: string;
  effective_to?: string;
};

export type MonthlySettlement = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_distance: number;
  total_amount: number;
  status: 'draft' | 'pending' | 'settled';
  settled_at?: string;
  settled_by?: string;
};
