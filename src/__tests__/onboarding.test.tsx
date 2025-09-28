import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../hooks/useAuth';
import { OnboardingWizard } from '../components/Onboarding/OnboardingWizard';
import { Dashboard } from '../components/Dashboard/Dashboard';
import { supabase } from '../lib/supabase';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: jest.fn().mockImplementation((callback) => {
      callback('SIGNED_IN', { user: { id: 'test-user-id', email: 'test@example.com' } });
      return { data: { subscription: { unsubscribe: jest.fn() } } };
    }),
    signUp: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: { email: 'test@example.com' } }, error: null })
  },
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
  onConflict: jest.fn().mockReturnThis()
};

jest.mock('../lib/supabase', () => ({
  supabase: mockSupabase
}));

// Mock the child components to isolate the test
jest.mock('../components/Onboarding/steps/OtpVerificationStep', () => ({
  OtpVerificationStep: () => <div data-testid="otp-step">OTP Verification Step</div>
}));

jest.mock('../components/Onboarding/steps/KycDocumentationStep', () => ({
  KycDocumentationStep: () => <div data-testid="kyc-step">KYC Documentation Step</div>
}));

jest.mock('../components/Onboarding/steps/RiskProfilingStep', () => ({
  RiskProfilingStep: () => <div data-testid="risk-step">Risk Profiling Step</div>
}));

jest.mock('../components/Onboarding/steps/InvestmentGoalsStep', () => ({
  InvestmentGoalsStep: () => <div data-testid="goals-step">Investment Goals Step</div>
}));

jest.mock('../components/Onboarding/steps/PersonalizedRecommendationsStep', () => ({
  PersonalizedRecommendationsStep: () => <div data-testid="recommendations-step">Personalized Recommendations Step</div>
}));

jest.mock('../components/Onboarding/ProgressBar', () => ({
  ProgressBar: () => <div data-testid="progress-bar">Progress Bar</div>
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Onboarding Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders onboarding wizard when user is authenticated but onboarding is not complete', async () => {
    // Mock profile data
    (supabase.from as jest.Mock)
      .mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { 
                id: 'profile-id',
                user_id: 'test-user-id',
                email: 'test@example.com',
                onboarding_completed: false,
                onboarding_completion_percentage: 0,
                last_active_step: 1
              },
              error: null
            })
          };
        } else if (table === 'onboarding_steps') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [
                { id: 'step-1', step_number: 1, step_name: 'Welcome & Basic Details', is_required: true, is_active: true },
                { id: 'step-2', step_number: 2, step_name: 'KYC Documentation', is_required: true, is_active: true },
                { id: 'step-3', step_number: 3, step_name: 'Financial Risk Profiling', is_required: true, is_active: true },
                { id: 'step-4', step_number: 4, step_name: 'Investment Goals Setup', is_required: true, is_active: true },
                { id: 'step-5', step_number: 5, step_name: 'Personalized Recommendations', is_required: true, is_active: true }
              ],
              error: null
            })
          };
        } else if (table === 'onboarding_progress') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });

    render(
      <AuthProvider>
        <OnboardingWizard />
      </AuthProvider>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Customer Onboarding')).toBeInTheDocument();
    });

    // Check that the progress bar is rendered
    expect(screen.getByTestId('progress-bar')).toBeInTheDocument();

    // Check that the first step (OTP) is rendered
    expect(screen.getByTestId('otp-step')).toBeInTheDocument();
  });

  test('renders dashboard when onboarding is complete', async () => {
    // Mock profile data with completed onboarding
    (supabase.from as jest.Mock)
      .mockImplementation((table) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { 
                id: 'profile-id',
                user_id: 'test-user-id',
                email: 'test@example.com',
                full_name: 'Test User',
                onboarding_completed: true,
                onboarding_completion_percentage: 100
              },
              error: null
            })
          };
        } else if (table === 'notifications') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        } else if (table === 'investment_goals') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        } else if (table === 'mutual_funds') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        };
      });

    render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );

    // Wait for the component to load
    await waitFor(() => {
      expect(screen.getByText('Welcome back, Test User!')).toBeInTheDocument();
    });

    // Check that dashboard elements are rendered
    expect(screen.getByText('Onboarding Status')).toBeInTheDocument();
    expect(screen.getByText('Your Investment Goals')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Overview')).toBeInTheDocument();
  });
});