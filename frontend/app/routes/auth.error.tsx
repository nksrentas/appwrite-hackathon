import type { LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { AlertCircle } from 'lucide-react';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error') || 'unknown';
  
  const errorMessages = {
    missing_parameters: 'Missing required authentication parameters.',
    callback_failed: 'Authentication callback failed. Please try again.',
    unknown: 'An unknown error occurred during authentication.',
  };

  return json({
    error,
    message: errorMessages[error as keyof typeof errorMessages] || errorMessages.unknown,
  });
}

export default function AuthError() {
  const { error, message } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-carbon-50 via-primary-50/30 to-scientific-50/20">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-danger-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-carbon-900 mb-4">Authentication Error</h1>
        <p className="text-carbon-600 mb-8">{message}</p>
        
        <div className="space-y-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-4 focus:ring-primary-300 transition-all duration-200 w-full"
          >
            Try Again
          </Link>
          
          <Link
            to="/"
            className="inline-flex items-center justify-center px-6 py-3 text-carbon-600 hover:text-carbon-900 transition-colors w-full"
          >
            Back to Home
          </Link>
        </div>
        
        {error && (
          <div className="mt-8 p-4 bg-carbon-50 rounded border text-left">
            <p className="text-xs text-carbon-500 font-mono">Error Code: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}