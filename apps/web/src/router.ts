import { createRouter, createWebHistory } from 'vue-router'

import HomeView from './views/HomeView.vue'
import ModulePlaceholderView from './views/ModulePlaceholderView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/assets',
      name: 'assets',
      component: ModulePlaceholderView,
      props: { eyebrow: 'ASSET LIFECYCLE', title: '设备资产', milestone: 'W03' },
    },
    {
      path: '/plans',
      name: 'plans',
      component: ModulePlaceholderView,
      props: { eyebrow: 'MAINTENANCE PLANNING', title: '维保计划', milestone: 'W05' },
    },
    {
      path: '/work-orders',
      name: 'work-orders',
      component: ModulePlaceholderView,
      props: { eyebrow: 'FIELD EXECUTION', title: '维保工单', milestone: 'W06–W08' },
    },
    {
      path: '/reports',
      name: 'reports',
      component: ModulePlaceholderView,
      props: { eyebrow: 'REPORTING', title: '维保报告', milestone: 'W09' },
    },
  ],
})
