import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  LiveReload,
} from '@remix-run/react';
import type { LinksFunction, LoaderFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';

import globalStyles from './styles/globals.css?url';

export const links: LinksFunction = () => [
  { rel: 'stylesheet', href: globalStyles },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
  },
  { rel: 'icon', href: '/favicon.ico' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  return json({
    ENV: {
      APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
      APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID || '',
      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
    },
  });
}

export default function App() {
  const data = useLoaderData<typeof loader>();

  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="EcoTrace - Real-time carbon footprint tracking for developers"
        />
        <meta name="theme-color" content="#10B981" />
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-background text-foreground antialiased">
        <Outlet />
        <ScrollRestoration />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(data.ENV)}`,
          }}
        />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}

export const ErrorBoundary = () => {
  return (
    <html lang="en" className="h-full">
      <head>
        <title>EcoTrace - Error</title>
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-background text-foreground">
        <div className="min-h-full flex flex-col justify-center items-center px-4">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="text-6xl font-bold text-danger">500</div>
            <h1 className="text-2xl font-semibold text-carbon-900">Something went wrong</h1>
            <p className="text-carbon-600">
              We're experiencing technical difficulties. Please try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Try Again
            </button>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
};