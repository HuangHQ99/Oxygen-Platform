export type WorkspaceRole =
  'PROVIDER_ADMIN' | 'PROVIDER_MAINTENANCE_LEAD' | 'PROVIDER_FIELD_ENGINEER'

export interface DataCentreGrant {
  id: string
  code: string
  name: string
  timeZone: string
}

export interface ClientGrant {
  clientId: string
  clientCode: string
  clientName: string
  roles: WorkspaceRole[]
  dataCentres: DataCentreGrant[]
}

export interface WorkspaceBootstrap {
  demoMode: boolean
  provider: {
    id: string
    name: string
  }
  actor: {
    id: string
    name: string
    position: string
  }
  initialClientId: string
  grants: ClientGrant[]
}

export async function fetchWorkspaceBootstrap(signal?: AbortSignal): Promise<WorkspaceBootstrap> {
  const response = await fetch('/api/v1/navigation/bootstrap', {
    headers: { Accept: 'application/json' },
    ...(signal ? { signal } : {}),
  })

  if (!response.ok) {
    throw new Error(`Navigation API returned ${response.status}`)
  }

  return (await response.json()) as WorkspaceBootstrap
}
