import { test, expect } from '@playwright/test';

test.describe('Sidebar Sensor Lab Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to test default state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
  });

  test('toggle expands and collapses the panel without changing route', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Panel is initially not visible
    const panel = page.locator('#sidebar-sensor-lab-panel');
    await expect(panel).not.toBeVisible();

    // Click toggle
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();

    // Route did not change
    expect(page.url()).toMatch(/\/$/);

    // Shows tiny "Distance (cm)" label and S1-S8 inputs
    await expect(panel.locator('text=Distance (cm)')).toBeVisible();
    for (let i = 1; i <= 8; i++) {
      const input = panel.locator(`input[aria-label="S${i} distance in centimetres"]`);
      await expect(input).toBeVisible();
    }

    // Click toggle again to collapse
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).not.toBeVisible();
  });

  test('persists expanded state across page reloads', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Toggle and panel should still be expanded
    const toggleAfterReload = page.locator('#sidebar-sensor-lab-toggle');
    await expect(toggleAfterReload).toHaveAttribute('aria-expanded', 'true');
    const panel = page.locator('#sidebar-sensor-lab-panel');
    await expect(panel).toBeVisible();
  });

  test('typing and pressing Enter or blur clamps 2..400 and updates digital twin', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();

    const s1Input = page.locator('input[aria-label="S1 distance in centimetres"]');
    await expect(s1Input).toBeVisible();

    // S1 starts vacant (25 cm)
    await expect(s1Input).toHaveValue('25');

    // Type 8 and press Enter -> S1 occupied
    await s1Input.fill('8');
    await s1Input.press('Enter');
    await expect(s1Input).toHaveValue('8');

    // Check digital twin slot bay S1 is occupied (shows Occupied or 8 cm)
    const slot1Bay = page.locator('g[aria-label*="Parking Slot S1"]');
    await expect(slot1Bay).toHaveAttribute('aria-label', /OCCUPIED/);

    // Type out-of-range > 400 and blur -> clamps to 400
    await s1Input.fill('550');
    await s1Input.blur();
    await expect(s1Input).toHaveValue('400');

    // Type out-of-range < 2 and blur -> clamps to 2
    await s1Input.fill('0');
    await s1Input.blur();
    await expect(s1Input).toHaveValue('2');

    // Type invalid empty or text -> reverts to previous value
    await s1Input.fill('abc');
    await s1Input.blur();
    await expect(s1Input).toHaveValue('2');
  });

  test('Up/Down arrow keys increment/decrement by 1, Shift by 10', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();

    const s2Input = page.locator('input[aria-label="S2 distance in centimetres"]');
    await s2Input.focus();

    // S2 starts at 25
    await s2Input.press('ArrowUp');
    await expect(s2Input).toHaveValue('26');

    // ArrowDown
    await s2Input.press('ArrowDown');
    await expect(s2Input).toHaveValue('25');

    // Shift + ArrowUp
    await s2Input.press('Shift+ArrowUp');
    await expect(s2Input).toHaveValue('35');

    // Shift + ArrowDown
    await s2Input.press('Shift+ArrowDown');
    await expect(s2Input).toHaveValue('25');
  });

  test('live synchronization updates input when external change happens', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();

    const s3Input = page.locator('input[aria-label="S3 distance in centimetres"]');
    await expect(s3Input).toHaveValue('25');

    // Open Slot 3 popover and click Park (8 cm)
    const slot3Bay = page.locator('g[aria-label*="Parking Slot S3"]');
    await slot3Bay.click();

    const popover = page.locator('[role="dialog"][aria-label="Slot S3"]');
    await expect(popover).toBeVisible();

    const parkBtn = popover.locator('button[aria-label="Park car (8 cm)"]');
    await parkBtn.click();

    // S3 sidebar input must now show 8!
    await expect(s3Input).toHaveValue('8');

    // Close popover
    await page.mouse.move(10, 10);
    await expect(popover).not.toBeVisible();
  });

  test('clicking box label focuses input, selects value, and allows immediate replacement', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();

    // Click on the text label "S4" inside the box
    const s4Box = page.locator('label', { has: page.locator('#sidebar-slot-distance-s4') });
    await s4Box.getByText('S4', { exact: true }).click();

    const s4Input = page.locator('#sidebar-slot-distance-s4');
    await expect(s4Input).toBeFocused();

    // Type '12' directly without backspacing (since text is selected on focus)
    await page.keyboard.type('12');
    await expect(s4Input).toHaveValue('12');

    // Press Enter to apply
    await page.keyboard.press('Enter');
    await expect(s4Input).toHaveValue('12');

    // Slot 4 should now be occupied on the digital twin (< 15 cm)
    const slot4Bay = page.locator('g[aria-label*="Parking Slot S4"]');
    await expect(slot4Bay).toHaveAttribute('aria-label', /OCCUPIED/);
  });

  test('filters out non-digit characters as user types', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();

    const s5Input = page.locator('#sidebar-slot-distance-s5');
    await s5Input.click();

    // Type non-digits like letters or symbols
    await page.keyboard.type('abc!@#45xyz');
    // Only 45 should be entered
    await expect(s5Input).toHaveValue('45');

    await page.keyboard.press('Enter');
    await expect(s5Input).toHaveValue('45');
  });

  test('Esc key cancels edit and restores previous value', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();

    const s6Input = page.locator('#sidebar-slot-distance-s6');
    await s6Input.click();
    await expect(s6Input).toHaveValue('25');

    // Type '99'
    await page.keyboard.type('99');
    await expect(s6Input).toHaveValue('99');

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(s6Input).toHaveValue('25');
  });

  test('Tab key moves focus sequentially S1 -> S2 -> S3 -> S4 -> S5 -> S6 -> S7 -> S8', async ({ page }) => {
    const toggleBtn = page.locator('#sidebar-sensor-lab-toggle');
    await toggleBtn.click();

    const s1Input = page.locator('#sidebar-slot-distance-s1');
    await s1Input.focus();
    await expect(s1Input).toBeFocused();

    for (let i = 2; i <= 8; i++) {
      await page.keyboard.press('Tab');
      const nextInput = page.locator(`#sidebar-slot-distance-s${i}`);
      await expect(nextInput).toBeFocused();
    }
  });

  test('/system-monitor route redirects to Overview and sidebar excludes System Monitor', async ({ page }) => {
    // Navigate directly to /system-monitor
    await page.goto('/system-monitor');
    await page.waitForLoadState('domcontentloaded');

    // Route should redirect to /
    await expect(page).toHaveURL(/\/$/);

    // Sidebar nav items check
    const sidebar = page.locator('aside');
    await expect(sidebar.locator('text=Overview')).toBeVisible();
    await expect(sidebar.locator('text=Sensor Lab')).toBeVisible();
    await expect(sidebar.locator('text=Guidance & Hardware')).toBeVisible();
    await expect(sidebar.locator('text=System Monitor')).not.toBeVisible();
  });
});
