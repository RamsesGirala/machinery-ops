// Base URL del backend (sin /api, porque los paths ya vienen con /api/...)
// Podés sobrescribir con VITE_API_BASE_URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
