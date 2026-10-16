const isBrowser = typeof window !== 'undefined';
const isLocalhost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const environment = {
  production: false,
  apiUrl: (isBrowser && (window as any).__env?.apiUrl) || (isLocalhost ? 'http://localhost:8080/api/v1' : 'https://cresenix-backend.onrender.com/api/v1'),
  useBackendApi: true,
};
