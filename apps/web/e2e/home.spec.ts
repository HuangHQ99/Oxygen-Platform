import { expect, test } from '@playwright/test'

test('renders the Oxygen shell without horizontal overflow', async ({ page }) => {
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

  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Oxygen' })).toBeVisible()
  await expect(page.getByText('数据中心设备维保平台')).toBeVisible()
  await expect(page.getByText('Connected')).toBeVisible()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
