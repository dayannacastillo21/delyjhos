export type ApiStatus = {
  status: string
  service: string
}

export async function getApiStatus(
  signal?: AbortSignal,
): Promise<ApiStatus> {
  const response = await fetch('http://127.0.0.1:8000/', { signal })

  if (!response.ok) {
    throw new Error('No se pudo consultar el estado de la API')
  }

  const data: unknown = await response.json()

  if (
    typeof data !== 'object' ||
    data === null ||
    !('status' in data) ||
    !('service' in data) ||
    typeof data.status !== 'string' ||
    typeof data.service !== 'string'
  ) {
    throw new Error('La API devolvió una respuesta inesperada')
  }

  return { status: data.status, service: data.service }
}