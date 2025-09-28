import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthForm } from './components/Auth/AuthForm';
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard';
import { Dashboard } from './components/Dashboard/Dashboard';

function AppContent() {
  const { user, profile, loading, error, refreshAuthState, isOnline } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [timeoutError, setTimeoutError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Log state changes for debugging
  useEffect(() => {
    console.log('App state changed:', { user, profile, loading, error, isOnline });
  }, [user, profile, loading, error, isOnline]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setTimeoutError('Application loading timeout - please refresh the page');
      }, 15000); // 15 seconds timeout

      return () => clearTimeout(timeout);
    } else {
      // Clear timeout error when loading completes
      setTimeoutError(null);
    }
  }, [loading]);

  // Auto-retry mechanism for network issues
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout | null = null;
    
    if ((error || !isOnline) && retryCount < 3) {
      retryTimeout = setTimeout(() => {
        console.log(`Retrying auth state refresh (attempt ${retryCount + 1})`);
        refreshAuthState();
        setRetryCount(prev => prev + 1);
      }, 5000); // Retry after 5 seconds
    }
    
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [error, isOnline, retryCount, refreshAuthState]);

  const handleRetry = useCallback(() => {
    setRetryCount(0);
    setTimeoutError(null);
    refreshAuthState();
  }, [refreshAuthState]);

  // Handle offline state
  if (!isOnline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Network Connection Lost</h2>
            <p className="text-gray-700 mb-4">Please check your internet connection and try again.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">If this takes too long, check the browser console for errors</p>
          {retryCount > 0 && (
            <p className="text-xs text-gray-400 mt-2">Retry attempt {retryCount} of 3</p>
          )}
        </div>
      </div>
    );
  }

  // Handle timeout error
  if (timeoutError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Timeout Error</h2>
            <p className="text-gray-700 mb-4">{timeoutError}</p>
            <p className="text-sm text-gray-500">
              This usually happens when there's a connection issue with the database or authentication service.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={handleRetry}
                className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="text-left bg-gray-100 p-3 rounded mb-4">
              <p className="text-sm text-gray-600">
                <strong>Troubleshooting steps:</strong>
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-600">
                <li>Check your internet connection</li>
                <li>Verify your .env file contains correct Supabase credentials</li>
                <li>Ensure your Supabase project is set up correctly</li>
                <li>Check browser console for detailed error messages</li>
              </ul>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Page
              </button>
              <button
                onClick={handleRetry}
                disabled={retryCount >= 3}
                className={`px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors ${
                  retryCount >= 3 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {retryCount >= 3 ? 'Max Retries Reached' : 'Retry Connection'}
              </button>
            </div>
            {retryCount > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                Retried {retryCount} time(s). Will automatically retry up to 3 times.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated - show auth form
  if (!user) {
    console.log('No user, showing auth form');
    return (
      <AuthForm
        mode={authMode}
        onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
      />
    );
  }

  // Authenticated but onboarding not complete - show onboarding wizard
  if (!profile?.onboarding_completed) {
    console.log('User authenticated but onboarding not complete, showing onboarding wizard');
    return <OnboardingWizard />;
  }

  // Authenticated and onboarding complete - show dashboard
  console.log('User authenticated and onboarding complete, showing dashboard');
  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;