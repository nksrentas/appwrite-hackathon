declare global {
  interface Window {
    ENV?: {
      APPWRITE_ENDPOINT: string;
      APPWRITE_PROJECT_ID: string;
      GITHUB_CLIENT_ID: string;
    };
  }
}

export {};