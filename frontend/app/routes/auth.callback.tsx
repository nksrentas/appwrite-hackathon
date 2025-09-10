import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { useLoaderData, useNavigate } from '@remix-run/react';
import { useEffect } from 'react';
import { useAuthStore } from '@features/auth/stores/auth.store';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  
  return { 
    searchParams: Object.fromEntries(url.searchParams.entries())
  };
}

export default function AuthCallback() {
  const { searchParams } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('OAuth callback params:', searchParams);
        
        await checkAuth();
        navigate('/dashboard');
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/auth/error?error=callback_failed');
      }
    };

    const timer = setTimeout(handleAuthCallback, 1000);
    return () => clearTimeout(timer);
  }, [checkAuth, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-carbon-50 via-primary-50/30 to-scientific-50/20">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-carbon-900 mb-2">Completing sign in...</h2>
        <p className="text-carbon-600">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  );
}