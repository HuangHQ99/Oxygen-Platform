import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import type { WorkspaceBootstrap } from '@/api/navigation'
import { useWorkspaceStore } from './workspace'

const fixture: WorkspaceBootstrap = {
  demoMode: true,
  provider: { id: 'provider-demo', name: 'Oxygen Demo Services' },
  actor: { id: 'actor-demo', name: 'Aiman Rahman', position: 'Maintenance Lead / Field Engineer' },
  initialClientId: 'client-a-demo',
  grants: [
    {
      clientId: 'client-a-demo',
      clientCode: 'CLIENT-A',
      clientName: '客户 A（合成）',
      roles: ['PROVIDER_MAINTENANCE_LEAD', 'PROVIDER_FIELD_ENGINEER'],
      dataCentres: [
        { id: 'site-a1-demo', code: 'A1', name: 'A1 数据中心', timeZone: 'Asia/Kuala_Lumpur' },
        { id: 'site-a2-demo', code: 'A2', name: 'A2 数据中心', timeZone: 'Asia/Kuala_Lumpur' },
      ],
    },
    {
      clientId: 'client-b-demo',
      clientCode: 'CLIENT-B',
      clientName: '客户 B（合成）',
      roles: ['PROVIDER_FIELD_ENGINEER'],
      dataCentres: [
        { id: 'site-b1-demo', code: 'B1', name: 'B1 数据中心', timeZone: 'Asia/Kuala_Lumpur' },
      ],
    },
  ],
}

describe('workspace store', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
  })

  it('clears site context and changes roles when switching client', () => {
    const store = useWorkspaceStore()
    store.hydrate(fixture)
    store.switchDataCentre('site-a2-demo')

    expect(store.scopeLabel).toBe('A2 数据中心')
    expect(store.switchClient('client-b-demo')).toBe(true)
    expect(store.currentDataCentreId).toBe('all')
    expect(store.currentRoles).toEqual(['PROVIDER_FIELD_ENGINEER'])
    expect(store.contextRevision).toBe(1)
    expect(store.notice).toContain('上一客户的页面条件与临时上下文已清除')
  })

  it('rejects a data centre outside the current client grant', () => {
    const store = useWorkspaceStore()
    store.hydrate(fixture)
    store.switchClient('client-b-demo')

    expect(store.switchDataCentre('site-a1-demo')).toBe(false)
    expect(store.currentDataCentreId).toBe('all')
  })
})
