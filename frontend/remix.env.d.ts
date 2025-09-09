/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />

declare global {
  interface Window {
    ENV: {
      APPWRITE_ENDPOINT: string;
      APPWRITE_PROJECT_ID: string;
      GITHUB_CLIENT_ID: string;
    };
  }
}

export {};
