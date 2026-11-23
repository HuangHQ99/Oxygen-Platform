import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { WorkspaceBootstrap } from '@/api/navigation'
import { useWorkspaceStore } from '@/stores/workspace'
import HomeView from './HomeView.vue'

const workspaceFixture: WorkspaceBootstrap = {
  demoMode: true,
  provider: { id: 'provider-demo', name: 'Oxygen Demo Services' },
  actor: { id: 'actor-demo', name: 'Aiman Rahman', position: 'Maintenance Lead' },
  initialClientId: 'client-a-demo',
  grants: [
    {
      clientId: 'client-a-demo',
      clientCode: 'CLIENT-A',
      clientName: '客户 A（合成）',
      roles: ['PROVIDER_MAINTENANCE_LEAD', 'PROVIDER_FIELD_ENGINEER'],
      dataCentres: [
        { id: 'site-a1-demo', code: 'A1', name: 'A1 数据中心', timeZone: 'Asia/Kuala_Lumpur' },
      ],
    },
  ],
}

describe('HomeView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    setActivePinia(createPinia())
    useWorkspaceStore().hydrate(workspaceFixture)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a connected local environment', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            application: 'Oxygen',
            environment: 'local',
            status: 'UP',
            serverTime: '2026-11-23T00:00:00Z',
            traceId: '8d6500c3-a6d0-4b96-bcad-726ef9df25d0',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(wrapper.text()).toContain('下午好，Aiman Rahman')
    expect(wrapper.text()).toContain('客户 A（合成）')
    expect(wrapper.text()).toContain('API 状态')
    expect(wrapper.text()).toContain('UP')
  })

  it('offers recovery when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network unavailable')))

    const wrapper = mount(HomeView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()

    expect(wrapper.text()).toContain('暂不可用')
    expect(wrapper.text()).toContain('重新检查')
  })
})
