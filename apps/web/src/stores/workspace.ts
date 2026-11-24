import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  fetchWorkspaceBootstrap,
  type WorkspaceBootstrap,
  type WorkspaceRole,
} from '@/api/navigation'

const STORAGE_KEY = 'oxygen.workspace.v1'
const ALL_DATA_CENTRES = 'all'

interface StoredContext {
  clientId: string
  dataCentreId: string
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const bootstrap = ref<WorkspaceBootstrap | null>(null)
  const currentClientId = ref('')
  const currentDataCentreId = ref(ALL_DATA_CENTRES)
  const contextRevision = ref(0)
  const loading = ref(false)
  const error = ref('')
  const notice = ref('')

  const currentGrant = computed(
    () => bootstrap.value?.grants.find((grant) => grant.clientId === currentClientId.value) ?? null,
  )
  const currentRoles = computed<WorkspaceRole[]>(() => currentGrant.value?.roles ?? [])
  const dataCentres = computed(() => currentGrant.value?.dataCentres ?? [])
  const currentDataCentre = computed(
    () =>
      dataCentres.value.find((dataCentre) => dataCentre.id === currentDataCentreId.value) ?? null,
  )
  const scopeLabel = computed(() => currentDataCentre.value?.name ?? '全部已授权数据中心')

  async function load(signal?: AbortSignal) {
    loading.value = true
    error.value = ''
    try {
      hydrate(await fetchWorkspaceBootstrap(signal))
    } catch (loadError) {
      if (loadError instanceof DOMException && loadError.name === 'AbortError') return
      error.value = '无法载入工作区，请确认 Oxygen API 已启动。'
    } finally {
      loading.value = false
    }
  }

  function hydrate(payload: WorkspaceBootstrap) {
    bootstrap.value = payload
    const stored = readStoredContext()
    const requestedClientId = stored?.clientId ?? payload.initialClientId
    const grant =
      payload.grants.find((item) => item.clientId === requestedClientId) ?? payload.grants[0]
    currentClientId.value = grant?.clientId ?? ''
    const storedDataCentreIsValid = grant?.dataCentres.some(
      (dataCentre) => dataCentre.id === stored?.dataCentreId,
    )
    currentDataCentreId.value = storedDataCentreIsValid
      ? (stored?.dataCentreId ?? ALL_DATA_CENTRES)
      : ALL_DATA_CENTRES
    persist()
  }

  function switchClient(clientId: string) {
    if (clientId === currentClientId.value) return false
    const grant = bootstrap.value?.grants.find((item) => item.clientId === clientId)
    if (!grant) return false

    currentClientId.value = grant.clientId
    currentDataCentreId.value = ALL_DATA_CENTRES
    contextRevision.value += 1
    notice.value = `已切换到${grant.clientName}，上一客户的页面条件与临时上下文已清除。`
    persist()
    return true
  }

  function switchDataCentre(dataCentreId: string) {
    if (
      dataCentreId !== ALL_DATA_CENTRES &&
      !dataCentres.value.some((dataCentre) => dataCentre.id === dataCentreId)
    ) {
      return false
    }
    if (dataCentreId === currentDataCentreId.value) return true

    currentDataCentreId.value = dataCentreId
    contextRevision.value += 1
    persist()
    return true
  }

  function clearNotice() {
    notice.value = ''
  }

  function persist() {
    if (typeof sessionStorage === 'undefined' || !currentClientId.value) return
    const context: StoredContext = {
      clientId: currentClientId.value,
      dataCentreId: currentDataCentreId.value,
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context))
    } catch {
      // Session persistence is best-effort; the in-memory authorization context remains valid.
    }
  }

  function readStoredContext(): StoredContext | null {
    if (typeof sessionStorage === 'undefined') return null
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY)
      if (!stored) return null
      return JSON.parse(stored) as StoredContext
    } catch {
      try {
        sessionStorage.removeItem(STORAGE_KEY)
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
      return null
    }
  }

  return {
    bootstrap,
    currentClientId,
    currentDataCentreId,
    contextRevision,
    loading,
    error,
    notice,
    currentGrant,
    currentRoles,
    dataCentres,
    currentDataCentre,
    scopeLabel,
    load,
    hydrate,
    switchClient,
    switchDataCentre,
    clearNotice,
  }
})
