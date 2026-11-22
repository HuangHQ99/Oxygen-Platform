<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { fetchSystemInfo, type SystemInfo } from '@/api/system'

type ConnectionState = 'checking' | 'connected' | 'unavailable'

const state = ref<ConnectionState>('checking')
const systemInfo = ref<SystemInfo | null>(null)
const controller = new AbortController()

const statusLabel = computed(() => {
  if (state.value === 'connected') return '正常'
  if (state.value === 'unavailable') return '暂不可用'
  return '检查中'
})

async function loadSystemInfo() {
  state.value = 'checking'
  try {
    systemInfo.value = await fetchSystemInfo(controller.signal)
    state.value = 'connected'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
    systemInfo.value = null
    state.value = 'unavailable'
  }
}

onMounted(loadSystemInfo)
onBeforeUnmount(() => controller.abort())
</script>

<template>
  <main class="shell">
    <section class="hero" aria-labelledby="page-title">
      <div class="brand-mark" aria-hidden="true">O₂</div>
      <div>
        <p class="eyebrow">DATA CENTRE MAINTENANCE</p>
        <h1 id="page-title">Oxygen</h1>
        <p class="subtitle">数据中心设备维保平台</p>
      </div>
    </section>

    <section class="status-panel" aria-live="polite">
      <header>
        <div>
          <p class="section-label">SYSTEM CHECK</p>
          <h2>本地开发环境</h2>
        </div>
        <span class="status-pill" :class="`status-${state}`">{{ statusLabel }}</span>
      </header>

      <dl>
        <div>
          <dt>系统状态</dt>
          <dd>{{ systemInfo?.status ?? statusLabel }}</dd>
        </div>
        <div>
          <dt>当前环境</dt>
          <dd>{{ systemInfo?.environment ?? 'Local' }}</dd>
        </div>
        <div>
          <dt>API 状态</dt>
          <dd>{{ state === 'connected' ? 'Connected' : 'Unavailable' }}</dd>
        </div>
      </dl>

      <p v-if="state === 'unavailable'" class="error-message">
        无法连接 Oxygen API。请确认 Spring Boot 和 PostgreSQL 已启动后重试。
      </p>

      <button v-if="state === 'unavailable'" type="button" @click="loadSystemInfo">重新检查</button>

      <footer v-if="systemInfo">
        <span>Trace ID</span>
        <code>{{ systemInfo.traceId }}</code>
      </footer>
    </section>
  </main>
</template>
