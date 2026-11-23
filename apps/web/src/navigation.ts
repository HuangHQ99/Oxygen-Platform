import type { WorkspaceRole } from '@/api/navigation'

export interface NavigationItem {
  name: string
  label: string
  shortLabel: string
  icon: string
  requiredRoles?: WorkspaceRole[]
}

export const navigationItems: NavigationItem[] = [
  { name: 'home', label: '工作台', shortLabel: '工作台', icon: '⌂' },
  {
    name: 'assets',
    label: '设备资产',
    shortLabel: '设备',
    icon: '▦',
    requiredRoles: ['PROVIDER_ADMIN', 'PROVIDER_MAINTENANCE_LEAD'],
  },
  {
    name: 'plans',
    label: '维保计划',
    shortLabel: '计划',
    icon: '◷',
    requiredRoles: ['PROVIDER_MAINTENANCE_LEAD'],
  },
  { name: 'work-orders', label: '维保工单', shortLabel: '工单', icon: '✓' },
  { name: 'reports', label: '维保报告', shortLabel: '报告', icon: '▤' },
]

export function visibleNavigation(roles: WorkspaceRole[]): NavigationItem[] {
  return navigationItems.filter(
    (item) => !item.requiredRoles || item.requiredRoles.some((role) => roles.includes(role)),
  )
}
