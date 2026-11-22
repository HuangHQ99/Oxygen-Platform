import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'

import HomeView from './HomeView.vue'

describe('HomeView', () => {
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

    const wrapper = mount(HomeView)
    await flushPromises()

    expect(wrapper.text()).toContain('数据中心设备维保平台')
    expect(wrapper.text()).toContain('Connected')
    expect(wrapper.text()).toContain('8d6500c3-a6d0-4b96-bcad-726ef9df25d0')
  })

  it('offers recovery when the API is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network unavailable')))

    const wrapper = mount(HomeView)
    await flushPromises()

    expect(wrapper.text()).toContain('暂不可用')
    expect(wrapper.text()).toContain('重新检查')
  })
})
