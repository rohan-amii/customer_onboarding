import { createClient } from '@supabase/supabase-js';

// Ensure environment variables are properly loaded
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase config:', { 
  supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET', 
  supabaseAnonKey: supabaseAnonKey ? 'SET' : 'NOT SET',
  supabaseUrlValue: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'NONE',
  supabaseAnonKeyValue: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 10)}...` : 'NONE'
});

// Check if environment variables are set and throw an error if they're missing
if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable. Please check your .env file.');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable. Please check your .env file.');
}

// Create a client with the environment variables
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Add debugging for Supabase client methods
const originalFrom = supabase.from;
supabase.from = function(table) {
  console.log('Supabase query on table:', table);
  const query = originalFrom.call(this, table);
  
  // Add debugging for select operations
  const originalSelect = query.select;
  query.select = function(...args: any[]) {
    console.log('Supabase select operation:', { table, args });
    return originalSelect.apply(this, args);
  };
  
  // Add debugging for eq operations
  const originalEq = query.eq;
  query.eq = function(column: string, value: any) {
    console.log('Supabase eq operation:', { table, column, value });
    return originalEq.apply(this, arguments);
  };
  
  return query;
};

// Types for Indian Investment Onboarding System
export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  pan_number?: string;
  aadhaar_number?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  employment_status?: string;
  annual_income?: number;
  investment_experience?: string;
  investment_objective?: string;
  risk_profile?: string;
  risk_score?: number;
  onboarding_completed: boolean;
  onboarding_completion_percentage: number;
  last_active_step: number;
  created_at: string;
  updated_at: string;
}

export interface OnboardingStep {
  id: string;
  step_number: number;
  step_name: string;
  step_description?: string;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
}

export interface OnboardingProgress {
  id: string;
  user_id: string;
  step_id: string;
  completed: boolean;
  completed_at?: string;
  data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  read: boolean;
  created_at: string;
}

export interface RiskQuestion {
  id: string;
  question_text: string;
  question_type: string;
  category: string;
  is_active: boolean;
  order_sequence: number;
  created_at: string;
}

export interface RiskOption {
  id: string;
  question_id: string;
  option_text: string;
  score: number;
  created_at: string;
}

export interface RiskResponse {
  id: string;
  user_id: string;
  question_id: string;
  option_ids: string[];
  score: number;
  created_at: string;
  updated_at: string;
}

export interface InvestmentGoal {
  id: string;
  user_id: string;
  goal_name: string;
  goal_type: string;
  target_amount: number;
  target_date: string;
  monthly_contribution?: number;
  current_savings: number;
  expected_return_rate: number;
  created_at: string;
  updated_at: string;
}

export interface MutualFund {
  id: string;
  scheme_name: string;
  fund_house: string;
  category: string;
  risk_level: string;
  expected_return: number;
  aum?: number;
  is_active: boolean;
  created_at: string;
}

export interface FundAllocation {
  id: string;
  user_id: string;
  goal_id: string;
  fund_id: string;
  allocation_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface KycDocument {
  id: string;
  user_id: string;
  document_type: string;
  file_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  verification_status: string;
  rejection_reason?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OtpVerification {
  id: string;
  user_id: string;
  phone?: string;
  email?: string;
  otp_code: string;
  otp_type: string;
  expires_at: string;
  is_verified: boolean;
  verified_at?: string;
  created_at: string;
}