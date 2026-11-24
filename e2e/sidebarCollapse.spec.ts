import { test, expect } from '@playwright/test';

test.describe('Sidebar Open/Close Rail & Collapse Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with default expanded state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('toggle button switches between expanded (280px) and collapsed rail (72px)', async ({ page }) => {
    // Set desktop viewport (>= 1024px)
    await page.setViewportSize({ width: 1440, height: 900 });

    const toggleBtn = page.locator('#sidebar-collapse-toggle');
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Collapse sidebar');

    // Sidebar initially expanded (~280px)
    const sidebar = page.locator('aside');
    const initialBox = await sidebar.boundingBox();
    expect(initialBox).not.toBeNull();
    expect(Math.round(initialBox!.width)).toBe(280);

    // Click toggle to collapse
    await toggleBtn.click();
    await page.waitForTimeout(300); // Wait for 250ms transition

    // Toggle button aria attributes update
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Expand sidebar');

    // Rail width is ~72px
    await expect(async () => {
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.width)).toBe(72);
    }).toPass({ timeout: 2000 });

    // Labels, hardware specs, and Sensor Lab panel are hidden in rail
    await expect(sidebar.locator('text=Follow the light to the nearest free slot')).not.toBeVisible();
    await expect(sidebar.locator('text=Hardware Specs')).not.toBeVisible();
    await expect(page.locator('#sidebar-sensor-lab-panel')).not.toBeVisible();

    // Rail icons are visible
    await expect(page.locator('#sidebar-sensor-lab-rail-toggle')).toBeVisible();

    // Click toggle to expand back
    await toggleBtn.click();

    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Collapse sidebar');
    await expect(async () => {
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.width)).toBe(280);
    }).toPass({ timeout: 2000 });
    await expect(sidebar.locator('text=Follow the light to the nearest free slot')).toBeVisible();
    await expect(sidebar.locator('text=Hardware Specs')).toBeVisible();
  });

  test('state persists in localStorage across page reload', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const toggleBtn = page.locator('#sidebar-collapse-toggle');
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Verify localStorage has smart_parking_sidebar_collapsed === 'true'
    const stored = await page.evaluate(() => localStorage.getItem('smart_parking_sidebar_collapsed'));
    expect(stored).toBe('true');

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Should still be collapsed
    const toggleAfterReload = page.locator('#sidebar-collapse-toggle');
    await expect(toggleAfterReload).toHaveAttribute('aria-expanded', 'false');

    const sidebar = page.locator('aside');
    const box = await sidebar.boundingBox();
    expect(box).not.toBeNull();
    expect(Math.round(box!.width)).toBe(72);
  });

  test('clicking Sensor Lab icon in collapsed rail expands sidebar and opens input panel', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Collapse sidebar
    const toggleBtn = page.locator('#sidebar-collapse-toggle');
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Rail Sensor Lab button
    const railSensorBtn = page.locator('#sidebar-sensor-lab-rail-toggle');
    await expect(railSensorBtn).toBeVisible();

    // Click rail Sensor Lab icon
    await railSensorBtn.click();
    await page.waitForTimeout(300);

    // Sidebar must now be expanded to ~280px
    const sidebar = page.locator('aside');
    await expect(async () => {
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.width)).toBe(280);
    }).toPass({ timeout: 2000 });

    // Sensor Lab input panel must be open and distance inputs visible
    const panel = page.locator('#sidebar-sensor-lab-panel');
    await expect(panel).toBeVisible();
    await expect(panel.locator('#sidebar-slot-distance-s1')).toBeVisible();
    await expect(panel.locator('#sidebar-slot-distance-s8')).toBeVisible();
  });

  test('Cmd/Ctrl + B keyboard shortcut toggles sidebar but ignores typing in input', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    const sidebar = page.locator('aside');
    const toggleBtn = page.locator('#sidebar-collapse-toggle');

    // Ensure page has focus
    await page.locator('body').click();

    // Press ControlOrMeta+B to collapse
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(350);

    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(async () => {
      const box = await sidebar.boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.width)).toBe(72);
    }).toPass({ timeout: 2000 });

    // Press ControlOrMeta+B again to expand
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(300);

    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(async () => {
      const b = await sidebar.boundingBox();
      expect(b).not.toBeNull();
      expect(Math.round(b!.width)).toBe(280);
    }).toPass({ timeout: 2000 });

    // Open Sensor Lab panel and focus an input
    await page.locator('#sidebar-sensor-lab-toggle').click();
    const s1Input = page.locator('#sidebar-slot-distance-s1');
    await s1Input.focus();
    await expect(s1Input).toBeFocused();

    // While focused in input, pressing ControlOrMeta+b should NOT collapse the sidebar
    await page.keyboard.press('ControlOrMeta+b');
    await page.waitForTimeout(100);

    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    const box = await sidebar.boundingBox();
    expect(Math.round(box!.width)).toBe(280);
  });

  test('under 1024px: mobile drawer replaces sidebar, no rail shown, traps focus and restores to menu trigger', async ({ page }) => {
    // Mobile viewport: 390x844
    await page.setViewportSize({ width: 390, height: 844 });

    // Desktop sidebar is hidden, no 72px rail
    const desktopToggle = page.locator('#sidebar-collapse-toggle');
    await expect(desktopToggle).not.toBeVisible();

    // Mobile menu trigger button is visible
    const menuBtn = page.locator('button[aria-label="Open navigation menu"]');
    await expect(menuBtn).toBeVisible();

    // Drawer is closed initially
    const drawer = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(drawer).not.toBeVisible();

    // Click menu button to open drawer
    await menuBtn.click();
    await expect(drawer).toBeVisible();

    // Focus is inside the drawer
    await page.waitForTimeout(100);
    const focusedInside = await page.evaluate(() => {
      const active = document.activeElement;
      const dlg = document.querySelector('[role="dialog"][aria-modal="true"]');
      return dlg ? dlg.contains(active) : false;
    });
    expect(focusedInside).toBe(true);

    // Press Escape to close drawer
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();

    // Focus returned to menu button
    await expect(menuBtn).toBeFocused();
  });

  test('no horizontal scroll or clipping across viewports (1920, 1440, 1366, 1024, 390)', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080 },
      { width: 1440, height: 900 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize(vp);
      await page.waitForTimeout(100);

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll, `Horizontal scroll found at ${vp.width}x${vp.height}`).toBe(false);

      // Verify digital twin is rendered
      const slot1 = page.locator('g[aria-label*="Parking Slot S1"]');
      await expect(slot1).toBeVisible();
    }
  });

  test('toggling sidebar while claim is running does not break or reset state', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Play Claim 1 scenario
    const playBtn = page.locator('button:has-text("Play scenario")').first();
    await playBtn.click();

    // Step bar is active
    const stepBar = page.locator('#live-claim-step-bar');
    await expect(stepBar).toBeVisible();
    await expect(stepBar.locator('#live-step-badge')).toBeVisible();

    // Toggle sidebar several times while scenario plays
    const toggleBtn = page.locator('#sidebar-collapse-toggle');
    await toggleBtn.click();
    await page.waitForTimeout(150);
    await toggleBtn.click();
    await page.waitForTimeout(150);
    await toggleBtn.click();
    await page.waitForTimeout(150);
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // Scenario is still intact and step bar is still visible
    await expect(stepBar).toBeVisible();
  });

  test('toggling sidebar on Guidance & Hardware page while Fig 3 numeral is selected preserves layout and selection', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    // Navigate to Guidance & Hardware
    await page.goto('/guidance-hardware');
    await page.waitForLoadState('domcontentloaded');

    // Click Fig 3 numeral 103 chip button
    const chip103 = page.locator('button', { hasText: '103' }).first();
    await chip103.click();
    await expect(page.getByText('REF 103')).toBeVisible();

    // Toggle sidebar
    const toggleBtn = page.locator('#sidebar-collapse-toggle');
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // 103 inspector is still selected
    await expect(page.getByText('REF 103')).toBeVisible();

    // Toggle back
    await toggleBtn.click();
    await page.waitForTimeout(300);
    await expect(page.getByText('REF 103')).toBeVisible();
  });
});
