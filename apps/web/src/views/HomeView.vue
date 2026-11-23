<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { fetchSystemInfo, type SystemInfo } from '@/api/system'
import { visibleNavigation } from '@/navigation'
import { useWorkspaceStore } from '@/stores/workspace'

type ConnectionState = 'checking' | 'connected' | 'unavailable'

const state = ref<ConnectionState>('checking')
const systemInfo = ref<SystemInfo | null>(null)
const controller = new AbortController()
const workspace = useWorkspaceStore()
const quickLinks = computed(() =>
  visibleNavigation(workspace.currentRoles).filter((item) => item.name !== 'home'),
)

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
  <div class="dashboard-page">
    <section class="page-heading">
      <div>
        <p class="eyebrow">OPERATIONS WORKSPACE</p>
        <h1 id="page-title">下午好，{{ workspace.bootstrap?.actor.name }}</h1>
        <p>你正在查看 {{ workspace.currentGrant?.clientName }} · {{ workspace.scopeLabel }}</p>
      </div>
      <span class="status-pill" :class="`status-${state}`">
        <span class="status-light" aria-hidden="true" />{{ statusLabel }}
      </span>
    </section>

    <section class="overview-grid" aria-label="当前工作区概览">
      <article class="metric-card accent-card">
        <span class="metric-icon" aria-hidden="true">◎</span>
        <div>
          <small>已授权数据中心</small>
          <strong>{{ workspace.dataCentres.length }}</strong>
          <span>{{ workspace.scopeLabel }}</span>
        </div>
      </article>
      <article class="metric-card">
        <span class="metric-icon" aria-hidden="true">◇</span>
        <div>
          <small>当前客户角色</small>
          <strong>{{ workspace.currentRoles.length }}</strong>
          <span>切换客户后按独立授权刷新</span>
        </div>
      </article>
      <article class="metric-card">
        <span class="metric-icon" aria-hidden="true">↗</span>
        <div>
          <small>API 状态</small>
          <strong>{{ state === 'connected' ? 'UP' : '—' }}</strong>
          <span>{{ systemInfo?.environment ?? 'local' }} environment</span>
        </div>
      </article>
    </section>

    <section class="dashboard-grid">
      <article class="content-card quick-card">
        <header>
          <div>
            <p class="section-label">QUICK ACCESS</p>
            <h2>开始工作</h2>
          </div>
          <span>按当前角色显示</span>
        </header>
        <div class="quick-links">
          <RouterLink v-for="item in quickLinks" :key="item.name" :to="{ name: item.name }">
            <span class="quick-icon" aria-hidden="true">{{ item.icon }}</span>
            <span>
              <strong>{{ item.label }}</strong>
              <small>进入 {{ workspace.currentGrant?.clientCode }} 范围</small>
            </span>
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>
      </article>

      <article class="content-card boundary-card">
        <header>
          <div>
            <p class="section-label">CURRENT BOUNDARY</p>
            <h2>访问边界</h2>
          </div>
        </header>
        <div class="boundary-client">
          <span class="client-monogram">{{ workspace.currentGrant?.clientCode.slice(-1) }}</span>
          <span>
            <strong>{{ workspace.currentGrant?.clientName }}</strong>
            <small>{{ workspace.currentGrant?.clientCode }} · 合成数据</small>
          </span>
        </div>
        <ul class="role-list">
          <li v-for="role in workspace.currentRoles" :key="role">
            <span aria-hidden="true">✓</span>
            {{
              role === 'PROVIDER_MAINTENANCE_LEAD'
                ? '服务商维保负责人'
                : role === 'PROVIDER_FIELD_ENGINEER'
                  ? '服务商现场工程师'
                  : '服务商管理员'
            }}
          </li>
        </ul>
        <p class="boundary-note">
          一个请求只属于一个当前客户。客户切换会重建页面上下文；真实服务端授权将在 W02-03 接入。
        </p>
      </article>
    </section>

    <p v-if="state === 'unavailable'" class="error-message">
      无法连接 Oxygen API。请确认 Spring Boot 和 PostgreSQL 已启动后
      <button type="button" class="text-button" @click="loadSystemInfo">重新检查</button>。
    </p>
  </div>
</template>
