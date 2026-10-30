const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), init)

  if (!response.ok) {
    throw new Error(`API request to ${path} failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}
