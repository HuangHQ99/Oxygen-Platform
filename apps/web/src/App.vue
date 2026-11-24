<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'

import { visibleNavigation } from '@/navigation'
import { useWorkspaceStore } from '@/stores/workspace'

const workspace = useWorkspaceStore()
const route = useRoute()
const router = useRouter()
const controller = new AbortController()

const navigation = computed(() => visibleNavigation(workspace.currentRoles))
const actorInitials = computed(() =>
  (workspace.bootstrap?.actor.name ?? 'O')
    .split(' ')
    .map((part) => part.at(0))
    .join('')
    .slice(0, 2),
)

async function changeClient(event: Event) {
  const clientId = (event.target as HTMLSelectElement).value
  if (!workspace.switchClient(clientId)) return
  await redirectUnavailableRoute()
}

function changeDataCentre(event: Event) {
  workspace.switchDataCentre((event.target as HTMLSelectElement).value)
}

async function redirectUnavailableRoute() {
  if (!workspace.bootstrap) return
  if (!navigation.value.some((item) => item.name === route.name)) {
    await router.replace({ name: 'home' })
  }
}

watch([() => route.name, navigation], redirectUnavailableRoute, { flush: 'post' })
onMounted(async () => {
  await workspace.load(controller.signal)
  await redirectUnavailableRoute()
})
onBeforeUnmount(() => controller.abort())
</script>

<template>
  <div v-if="workspace.loading && !workspace.bootstrap" class="launch-state" aria-live="polite">
    <div class="brand-mark" aria-hidden="true">O₂</div>
    <strong>正在准备 Oxygen 工作区…</strong>
  </div>

  <div v-else-if="workspace.error && !workspace.bootstrap" class="launch-state error-state">
    <div class="brand-mark" aria-hidden="true">O₂</div>
    <strong>工作区暂不可用</strong>
    <p>{{ workspace.error }}</p>
    <button type="button" @click="workspace.load()">重新载入</button>
  </div>

  <div v-else-if="workspace.bootstrap" class="app-shell">
    <aside class="desktop-sidebar">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Oxygen 工作台">
        <span class="brand-mark" aria-hidden="true">O₂</span>
        <span>
          <strong>Oxygen</strong>
          <small>MAINTENANCE OS</small>
        </span>
      </RouterLink>

      <div class="demo-badge">合成演示数据</div>

      <nav class="desktop-navigation" aria-label="主要导航">
        <RouterLink v-for="item in navigation" :key="item.name" :to="{ name: item.name }">
          <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <section class="actor-card" aria-label="当前演示账号">
        <span class="avatar">{{ actorInitials }}</span>
        <span>
          <strong>{{ workspace.bootstrap.actor.name }}</strong>
          <small>{{ workspace.bootstrap.actor.position }}</small>
        </span>
      </section>
    </aside>

    <section class="workspace-shell">
      <header class="mobile-header">
        <RouterLink class="brand compact-brand" :to="{ name: 'home' }">
          <span class="brand-mark" aria-hidden="true">O₂</span>
          <strong>Oxygen</strong>
        </RouterLink>
        <span class="avatar">{{ actorInitials }}</span>
      </header>

      <header class="context-bar">
        <div class="context-title">
          <span class="scope-dot" aria-hidden="true" />
          <span>
            <small>当前业务范围</small>
            <strong>{{ workspace.currentGrant?.clientName }}</strong>
          </span>
        </div>

        <div class="context-controls">
          <label>
            <span>客户</span>
            <select aria-label="当前客户" :value="workspace.currentClientId" @change="changeClient">
              <option
                v-for="grant in workspace.bootstrap.grants"
                :key="grant.clientId"
                :value="grant.clientId"
              >
                {{ grant.clientName }}
              </option>
            </select>
          </label>

          <label>
            <span>数据中心</span>
            <select
              aria-label="当前数据中心"
              :value="workspace.currentDataCentreId"
              @change="changeDataCentre"
            >
              <option value="all">全部已授权数据中心</option>
              <option
                v-for="dataCentre in workspace.dataCentres"
                :key="dataCentre.id"
                :value="dataCentre.id"
              >
                {{ dataCentre.name }}
              </option>
            </select>
          </label>
        </div>
      </header>

      <div v-if="workspace.notice" class="context-notice" role="status">
        <span>{{ workspace.notice }}</span>
        <button type="button" aria-label="关闭切换提示" @click="workspace.clearNotice">×</button>
      </div>

      <main class="workspace-content">
        <RouterView v-slot="{ Component }">
          <component :is="Component" :key="`${route.fullPath}:${workspace.contextRevision}`" />
        </RouterView>
      </main>

      <nav class="mobile-navigation" aria-label="手机主要导航">
        <RouterLink v-for="item in navigation" :key="item.name" :to="{ name: item.name }">
          <span class="nav-icon" aria-hidden="true">{{ item.icon }}</span>
          <span>{{ item.shortLabel }}</span>
        </RouterLink>
      </nav>
    </section>
  </div>
</template>
