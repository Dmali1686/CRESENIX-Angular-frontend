declare global {
  interface Window {
    __env?: {
      apiUrl?: string;
    };
  }
}

export const environment = {
  production: true,
  apiUrl: (typeof window !== 'undefined' && window.__env?.apiUrl) || '/api/v1',
  useBackendApi: true,
};

