
declare global {
  interface Window {
    ENV: {
      APPWRITE_ENDPOINT: string;
      APPWRITE_PROJECT_ID: string;
    };
  }
}

export {};