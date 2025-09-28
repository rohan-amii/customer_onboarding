import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  sendOtp: (phone: string, email: string, type: 'phone' | 'email') => Promise<boolean>;
  verifyOtp: (otp: string, type: 'phone' | 'email') => Promise<boolean>;
  refreshAuthState: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Function to check network connectivity
  const checkConnectivity = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch('https://httpbin.org/get', {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (err) {
      return false;
    }
  }, []);

  // Function to refresh auth state
  const refreshAuthState = useCallback(async () => {
    try {
      console.log('AuthProvider: Refreshing auth state');
      
      // Check network connectivity first
      const isNetworkConnected = await checkConnectivity();
      if (!isNetworkConnected) {
        throw new Error('Network connection unavailable. Please check your internet connection.');
      }
      
      setLoading(true);
      setError(null);
      
      // Get current session
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error(`Failed to get session: ${sessionError.message}`);
      }
      
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('AuthProvider: Error refreshing auth state:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh authentication state';
      setError(errorMessage);
      setLoading(false);
    }
  }, [checkConnectivity]);

  useEffect(() => {
    // Monitor network connectivity
    const handleOnline = () => {
      console.log('Network connection restored');
      setIsOnline(true);
      // When coming back online, refresh auth state
      if (error) {
        refreshAuthState();
      }
    };
    
    const handleOffline = () => {
      console.log('Network connection lost');
      setIsOnline(false);
      setError('Network connection lost. Please check your internet connection.');
      setLoading(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout | null = null;
    let refreshInterval: NodeJS.Timeout | null = null;
    
    console.log('AuthProvider: Initializing auth');
    
    const initializeAuth = async () => {
      try {
        console.log('AuthProvider: Getting session');
        
        // Check network connectivity first
        const isNetworkConnected = await checkConnectivity();
        if (!isNetworkConnected) {
          throw new Error('Network connection unavailable. Please check your internet connection.');
        }
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('AuthProvider: Session result', { session, sessionError });
        
        if (sessionError) {
          console.error('AuthProvider: Session error details', sessionError);
          throw new Error(`Failed to get session: ${sessionError.message}`);
        }
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('AuthProvider: User found, fetching profile', session.user.id);
            await fetchProfile(session.user.id);
          } else {
            console.log('AuthProvider: No user found, setting loading to false');
            setLoading(false);
          }
        }
      } catch (err) {
        console.error('AuthProvider: Error initializing auth:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Listen for auth changes
    console.log('AuthProvider: Setting up auth state change listener');
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state changed', { event, session });
      
      // Clear any existing timeout when auth state changes
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
      }
      
      // Add detailed logging for each event type
      switch (event) {
        case 'INITIAL_SESSION':
          console.log('AuthProvider: Initial session event');
          break;
        case 'SIGNED_IN':
          console.log('AuthProvider: Signed in event');
          break;
        case 'SIGNED_OUT':
          console.log('AuthProvider: Signed out event');
          break;
        case 'TOKEN_REFRESHED':
          console.log('AuthProvider: Token refreshed event');
          break;
        case 'USER_UPDATED':
          console.log('AuthProvider: User updated event');
          break;
        default:
          console.log('AuthProvider: Other auth event', event);
      }
      
      if (!isMounted) {
        console.log('AuthProvider: Component not mounted, ignoring auth state change');
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          console.log('AuthProvider: User logged in, fetching profile', session.user.id);
          await fetchProfile(session.user.id);
        } catch (err) {
          console.error('AuthProvider: Error fetching profile:', err);
          const errorMessage = err instanceof Error ? err.message : 'Failed to fetch profile';
          setError(errorMessage);
        }
      } else {
        console.log('AuthProvider: User logged out, resetting profile');
        setProfile(null);
        setLoading(false);
        setError(null); // Clear any previous errors when signing out
      }
    });

    // Add a timeout to prevent infinite loading
    loadingTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('AuthProvider: Loading timeout reached, forcing loading to false');
        setLoading(false);
        // Only set error if we don't already have user data
        if (!user) {
          setError('Authentication timeout - please refresh the page');
        }
      }
    }, 15000); // 15 seconds timeout

    initializeAuth().catch(err => {
      console.error('AuthProvider: Error in initializeAuth:', err);
      if (isMounted) {
        setLoading(false);
        setError(err instanceof Error ? err.message : 'Authentication initialization failed');
      }
    });

    // Set up periodic refresh to handle network issues
    refreshInterval = setInterval(() => {
      if (!loading && isMounted) {
        // Refresh session periodically to ensure it's still valid
        supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
          if (!error && currentSession?.user?.id !== user?.id) {
            // User has changed, trigger a refresh
            refreshAuthState();
          }
        });
      }
    }, 60000); // Refresh every 60 seconds

    return () => {
      console.log('AuthProvider: Cleaning up');
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, refreshAuthState, checkConnectivity]);

  const fetchProfile = async (userId: string) => {
    console.log('AuthProvider: Fetching profile for user', userId);
    
    try {
      // Use a more explicit query that's less likely to cause 406 errors
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle cases where profile doesn't exist

      console.log('AuthProvider: Profile fetch result', { data, error });
      
      if (error) {
        // Handle specific error cases
        if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
          console.error('AuthProvider: 406 Not Acceptable error - this might be due to RLS policies');
          // Try a different approach - fetch without user_id filter to see if we can access the table at all
          const { data: testData, error: testError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);
            
          if (testError) {
            console.error('AuthProvider: Cannot access profiles table at all:', testError);
            throw new Error('Cannot access user profiles. Please check your Supabase table policies.');
          } else {
            console.log('AuthProvider: Profiles table is accessible, but user-specific query failed');
            // This suggests an RLS policy issue
            throw new Error('Access denied to your profile. Please contact support.');
          }
        } else if (error.code !== 'PGRST116') {
          // PGRST116 means no rows returned, which is not an error in this case
          throw error;
        }
      }

      if (data) {
        console.log('AuthProvider: Profile found', data);
        setProfile(data);
      } else {
        console.log('AuthProvider: No profile found, creating new profile');
        // Create a new profile if it doesn't exist
        await createProfile(userId);
        return; // Exit early since createProfile handles setLoading
      }
    } catch (error) {
      console.error('AuthProvider: Error fetching profile:', error);
      throw error;
    } finally {
      console.log('AuthProvider: Setting loading to false');
      setLoading(false);
    }
  };

  const createProfile = async (userId: string) => {
    console.log('AuthProvider: Creating profile for user', userId);
    
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      console.log('AuthProvider: User data result', { userData, userError });
      
      if (userError) throw userError;
      
      const email = userData.user?.email || '';
      
      // Try to insert the profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          email: email,
        })
        .select()
        .maybeSingle(); // Use maybeSingle to handle potential issues

      console.log('AuthProvider: Profile creation result', { profileData, profileError });
      
      if (profileError) {
        console.error('AuthProvider: Profile creation failed:', profileError);
        throw new Error(`Failed to create user profile: ${profileError.message}`);
      }
      
      if (profileData) {
        // Set the newly created profile directly
        console.log('AuthProvider: Setting newly created profile');
        setProfile(profileData);
      } else {
        console.warn('AuthProvider: Profile creation succeeded but no data returned');
        // Try to fetch the profile we just created
        await fetchProfile(userId);
      }
    } catch (error) {
      console.error('AuthProvider: Error creating profile:', error);
      throw error;
    } finally {
      console.log('AuthProvider: Profile creation complete, setting loading to false');
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log('Signing up user:', { email, fullName });
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      console.log('Sign up result:', { data, error });
      
      if (error) {
        console.error('Sign up error details:', error);
        throw error;
      }

      if (data.user) {
        // Update profile with full name
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', data.user.id);

        if (profileError) {
          console.error('Profile update error details:', profileError);
          throw profileError;
        }

        // Send welcome notification
        await sendWelcomeNotification(data.user.id);
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Signing in user:', { email });
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Sign in result:', { error });
      
      if (error) {
        console.error('Sign in error details:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user');
      
      const { error } = await supabase.auth.signOut();
      
      console.log('Sign out result:', { error });
      
      if (error) {
        console.error('Sign out error details:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      console.log('Updating profile:', updates);
      
      const { error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      console.log('Profile update result:', { error });
      
      if (error) {
        console.error('Profile update error details:', error);
        throw error;
      }

      await fetchProfile(user.id);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const sendOtp = async (phone: string, email: string, type: 'phone' | 'email'): Promise<boolean> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      console.log('Sending OTP:', { phone, email, type });
      
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration time (10 minutes from now)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      // Save OTP to database
      const { error } = await supabase
        .from('otp_verifications')
        .insert({
          user_id: user.id,
          phone: type === 'phone' ? phone : undefined,
          email: type === 'email' ? email : undefined,
          otp_code: otp,
          otp_type: type,
          expires_at: expiresAt
        });

      console.log('OTP send result:', { error });
      
      if (error) {
        console.error('OTP send error details:', error);
        throw error;
      }
      
      // In a real application, you would send the OTP via SMS/email service
      console.log(`OTP for ${type}: ${otp}`);
      
      return true;
    } catch (error) {
      console.error('Error sending OTP:', error);
      return false;
    }
  };

  const verifyOtp = async (otp: string, type: 'phone' | 'email'): Promise<boolean> => {
    if (!user) throw new Error('No user logged in');
    
    try {
      console.log('Verifying OTP:', { otp, type });
      
      // Get the latest OTP for this user and type
      const { data, error } = await supabase
        .from('otp_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('otp_type', type)
        .gt('expires_at', new Date().toISOString())
        .eq('is_verified', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('OTP verification result:', { data, error });
      
      if (error || !data) {
        console.error('OTP verification error details:', error);
        throw new Error('No valid OTP found');
      }

      // Check if OTP matches
      if (data.otp_code === otp) {
        // Mark OTP as verified
        const { error: updateError } = await supabase
          .from('otp_verifications')
          .update({
            is_verified: true,
            verified_at: new Date().toISOString()
          })
          .eq('id', data.id);

        if (updateError) {
          console.error('OTP verification update error details:', updateError);
          throw updateError;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      return false;
    }
  };

  const sendWelcomeNotification = async (userId: string) => {
    try {
      console.log('Sending welcome notification for user:', userId);
      
      // First check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Cannot send notification: Auth session error:', sessionError);
        return;
      }
      
      if (!session?.user) {
        console.error('Cannot send notification: User not authenticated');
        return;
      }
      
      // Try to send the notification
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: '🎉 Welcome to Our Investment Platform!',
          message: 'We\'re excited to have you on board. Let\'s get you set up with a quick onboarding process to start your wealth journey.',
          type: 'success',
          category: 'onboarding'
        });
      
      if (error) {
        console.error('Error sending welcome notification:', error);
        // Don't throw error here as it shouldn't break the signup flow
      } else {
        console.log('Welcome notification sent successfully');
      }
    } catch (error) {
      console.error('Error sending welcome notification:', error);
      // Don't throw error here as it shouldn't break the signup flow
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    updateProfile,
    sendOtp,
    verifyOtp,
    refreshAuthState,
    isOnline
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}