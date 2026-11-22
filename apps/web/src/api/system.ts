export interface SystemInfo {
  application: string
  environment: string
  status: string
  serverTime: string
  traceId: string
}

export async function fetchSystemInfo(signal?: AbortSignal): Promise<SystemInfo> {
  const response = await fetch('/api/v1/system/info', {
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  })

  if (!response.ok) {
    throw new Error(`API returned ${response.status}`)
  }

  return (await response.json()) as SystemInfo
}
