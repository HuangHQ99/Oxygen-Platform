<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'

defineProps<{
  eyebrow: string
  title: string
  milestone: string
}>()

const workspace = useWorkspaceStore()
</script>

<template>
  <div class="module-page">
    <section class="page-heading">
      <div>
        <p class="eyebrow">{{ eyebrow }}</p>
        <h1>{{ title }}</h1>
        <p>{{ workspace.currentGrant?.clientName }} · {{ workspace.scopeLabel }}</p>
      </div>
      <span class="module-milestone">计划于 {{ milestone }} 实现</span>
    </section>

    <section class="empty-module content-card">
      <span class="empty-illustration" aria-hidden="true">O₂</span>
      <p class="section-label">NAVIGATION READY</p>
      <h2>{{ title }}入口已建立</h2>
      <p>
        W02-02
        只建立导航和客户上下文，不提前生成业务记录。后续功能会自动限定在当前客户及已授权数据中心范围内。
      </p>
      <dl class="scope-summary">
        <div>
          <dt>当前客户</dt>
          <dd>{{ workspace.currentGrant?.clientName }}</dd>
        </div>
        <div>
          <dt>数据中心范围</dt>
          <dd>{{ workspace.scopeLabel }}</dd>
        </div>
      </dl>
    </section>
  </div>
</template>
