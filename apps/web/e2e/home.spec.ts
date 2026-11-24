import { expect, test } from '@playwright/test'

test('renders the Oxygen shell without horizontal overflow', async ({ page }) => {
  const usesRealApi = process.env.OXYGEN_E2E_REAL_API === 'true'

  if (!usesRealApi) {
    await page.route('**/api/v1/system/info', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          application: 'Oxygen',
          environment: 'local',
          status: 'UP',
          serverTime: '2026-11-23T00:00:00Z',
          traceId: '88d44739-b95e-41d2-9544-bc1f5ea54517',
        },
      })
    })
    await page.route('**/api/v1/navigation/bootstrap', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        json: {
          demoMode: true,
          provider: { id: 'provider-demo', name: 'Oxygen Demo Services' },
          actor: {
            id: 'actor-demo',
            name: 'Aiman Rahman',
            position: 'Maintenance Lead / Field Engineer',
          },
          initialClientId: 'client-a-demo',
          grants: [
            {
              clientId: 'client-a-demo',
              clientCode: 'CLIENT-A',
              clientName: '客户 A（合成）',
              roles: ['PROVIDER_MAINTENANCE_LEAD', 'PROVIDER_FIELD_ENGINEER'],
              dataCentres: [
                {
                  id: 'site-a1-demo',
                  code: 'A1',
                  name: 'A1 数据中心',
                  timeZone: 'Asia/Kuala_Lumpur',
                },
                {
                  id: 'site-a2-demo',
                  code: 'A2',
                  name: 'A2 数据中心',
                  timeZone: 'Asia/Kuala_Lumpur',
                },
              ],
            },
            {
              clientId: 'client-b-demo',
              clientCode: 'CLIENT-B',
              clientName: '客户 B（合成）',
              roles: ['PROVIDER_FIELD_ENGINEER'],
              dataCentres: [
                {
                  id: 'site-b1-demo',
                  code: 'B1',
                  name: 'B1 数据中心',
                  timeZone: 'Asia/Kuala_Lumpur',
                },
              ],
            },
          ],
        },
      })
    })
  }

  await page.goto('/plans')

  await expect(page.getByRole('heading', { name: '维保计划', exact: true })).toBeVisible()
  await expect(page.getByLabel('当前客户')).toHaveValue('client-a-demo')
  await page.getByLabel('当前客户').selectOption('client-b-demo')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: '下午好，Aiman Rahman' })).toBeVisible()
  await expect(page.getByText('上一客户的页面条件与临时上下文已清除')).toBeVisible()
  expect(await page.getByText('设备资产').count()).toBe(0)
  expect(await page.getByText('维保计划').count()).toBe(0)

  await page.goto('/plans')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByLabel('当前客户')).toHaveValue('client-b-demo')
  expect(await page.getByRole('heading', { name: '维保计划', exact: true }).count()).toBe(0)

  if (usesRealApi) {
    const readiness = await page.request.get('/actuator/health/readiness')
    expect(readiness.status()).toBe(200)
    expect(await readiness.json()).toEqual({ status: 'UP' })
  }

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
