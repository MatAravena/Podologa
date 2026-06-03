// ⚠️ FIXED PORTS — DO NOT CHANGE.
// Backend always runs on 8000, frontend on 4200.
// apiUrl MUST stay http://localhost:8000 in development.
// If the API ever appears "not reading the DB", the cause is almost always a
// stale backend running on a different port — fix the backend, not this file.
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
};
