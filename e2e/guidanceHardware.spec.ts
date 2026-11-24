import { test, expect } from '@playwright/test';

test.describe('Guidance & Hardware Architecture Page', () => {
  test('header text, removed sections absence, and strip cards', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/guidance-hardware');

    // 1. Verify Header and Subtitle
    await expect(page.getByRole('heading', { name: 'Guidance & Hardware Architecture' })).toBeVisible();
    await expect(
      page.getByText('Interactive redraw of patent Fig 3. Click a reference numeral (101-108) to see its live data.')
    ).toBeVisible();

    // 2. Verify removed sections are completely absent
    await expect(page.getByText('Guidance Mode Architecture Switch')).not.toBeVisible();
    await expect(page.getByText('Firmware v1 (As Built)')).not.toBeVisible();
    await expect(page.getByText('Full-Scale WS2812 Strip Physical Twin')).not.toBeVisible();
    await expect(page.getByText('200 Addressable RGB Nodes')).not.toBeVisible();
    await expect(page.getByText('ESP32 Physical GPIO Pin Assignment Table')).not.toBeVisible();
    await expect(page.getByText('Visual Sweep & State Invariant Rules')).not.toBeVisible();

    // 3. Verify the two small strip cards are present
    await expect(page.getByText('Strip 1 (Lane 0 / Upper)')).toBeVisible();
    await expect(page.getByText('GPIO 23', { exact: true })).toBeVisible();
    await expect(page.getByText('Strip 2 (Lane 1 / Lower)')).toBeVisible();
    await expect(page.getByText('GPIO 15', { exact: true })).toBeVisible();

    // 4. Click every numeral 101-108 and verify side panel inspector updates
    const hotspots = ['101', '102', '103', '104', '105', '106', '107', '108'];
    for (const num of hotspots) {
      // Test clicking quick chip button
      const chip = page.locator('button', { hasText: num });
      await chip.click();
      await expect(page.getByText(`REF ${num}`)).toBeVisible();

      // Test dispatching click on SVG numeral element
      const svgNumeral = page.locator('svg g[role="button"]').filter({ hasText: num });
      await svgNumeral.dispatchEvent('click');
      await expect(page.getByText(`REF ${num}`)).toBeVisible();
    }

    expect(consoleErrors).toHaveLength(0);
  });

  test('Fig 3 block groups retain their fixed translate positions across all selection states', async ({ page }) => {
    await page.goto('/guidance-hardware');

    const expectedTransforms: Record<string, string> = {
      'hotspot-101': 'translate(35, 75)',
      'hotspot-102': 'translate(50, 107)',
      'hotspot-103': 'translate(365, 115)',
      'hotspot-104': 'translate(150, 360)',
      'hotspot-105': 'translate(460, 360)',
      'hotspot-106': 'translate(540, 105)',
      'hotspot-107': 'translate(660, 110)',
      'hotspot-108': 'translate(350, 445)',
    };

    const verifyTransforms = async () => {
      for (const [id, expectedTransform] of Object.entries(expectedTransforms)) {
        const group = page.locator(`#${id}`);
        await expect(group).toHaveAttribute('transform', expectedTransform);
      }
    };

    // Verify initial layout
    await verifyTransforms();

    // Verify across clicking each numeral
    const hotspots = ['101', '102', '103', '104', '105', '106', '107', '108'];
    for (const num of hotspots) {
      const chip = page.locator('button', { hasText: num });
      await chip.click();
      await verifyTransforms();
    }

    // Verify keyboard navigation with arrow keys
    const firstNumeral = page.locator('svg g[role="button"]').filter({ hasText: '101' });
    await firstNumeral.click();
    await expect(page.getByText('REF 101')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByText('REF 102')).toBeVisible();
    await verifyTransforms();

    await page.keyboard.press('ArrowLeft');
    await expect(page.getByText('REF 101')).toBeVisible();
    await verifyTransforms();
  });

  test('visual screenshots and responsive layout across viewports', async ({ page }) => {
    const outDir = '/Users/pavan/.gemini/antigravity-ide/brain/a5d0f539-63ce-4f83-a5d5-2d23cc7f6342';
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/guidance-hardware');

    // 1. State 103
    await page.locator('button', { hasText: '103' }).click();
    await expect(page.getByText('REF 103')).toBeVisible();
    await page.screenshot({ path: `${outDir}/fig3_state_103.png`, fullPage: false });

    // 2. State 105
    await page.locator('button', { hasText: '105' }).click();
    await expect(page.getByText('REF 105')).toBeVisible();
    await page.screenshot({ path: `${outDir}/fig3_state_105.png`, fullPage: false });

    // 3. State 108
    await page.locator('button', { hasText: '108' }).click();
    await expect(page.getByText('REF 108')).toBeVisible();
    await page.screenshot({ path: `${outDir}/fig3_state_108.png`, fullPage: false });

    // 4. Test Viewports: 1920, 1440, 1366, 1024, 768, 390
    for (const width of [1920, 1440, 1366, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 800 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // No horizontal scroll
    }

    // 5. Measure total header height on desktop (top of main content to first card)
    await page.setViewportSize({ width: 1440, height: 900 });
    const mainBox = await page.locator('main').boundingBox();
    const firstCardBox = await page.locator('.grid').first().boundingBox();
    expect(mainBox).not.toBeNull();
    expect(firstCardBox).not.toBeNull();
    const headerTotalHeight = firstCardBox!.y - mainBox!.y;
    console.log(`Measured total header height: ${headerTotalHeight}px`);
    expect(headerTotalHeight).toBeGreaterThanOrEqual(100);
    expect(headerTotalHeight).toBeLessThanOrEqual(155);

    // 7. Overview Page Header Verification & Screenshot
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /ParkWay|Parking guidance/i })).toBeVisible();
    await page.screenshot({ path: `${outDir}/overview_page_header.png`, fullPage: false });

    const overviewMainBox = await page.locator('main').boundingBox();
    const overviewFirstCardBox = await page.locator('.grid').first().boundingBox();
    expect(overviewMainBox).not.toBeNull();
    expect(overviewFirstCardBox).not.toBeNull();
    const overviewHeaderHeight = overviewFirstCardBox!.y - overviewMainBox!.y;
    console.log(`Measured Overview total header height: ${overviewHeaderHeight}px`);
    expect(overviewHeaderHeight).toBeGreaterThanOrEqual(110);
    expect(overviewHeaderHeight).toBeLessThanOrEqual(210);
  });

  test('overview page LED strip, Replay Sweep, mode toggle, and claim tracer work without errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');

    // 1. Verify LED strip canvas on Overview
    const canvas = page.locator('canvas');
    await expect(canvas.first()).toBeVisible();

    // 2. Replay Sweep button
    const replaySweepBtn = page.getByRole('button', { name: /Replay Sweep/i });
    await expect(replaySweepBtn).toBeVisible();
    await replaySweepBtn.click();

    // 3. Mode button toggle on Overview LED strip
    const firmwareBtn = page.getByRole('button', { name: /Firmware \(Blocking\)/i });
    const improvedBtn = page.getByRole('button', { name: /Improved \(Non-Blocking\)/i });
    if (await improvedBtn.isVisible()) {
      await improvedBtn.click();
      await expect(page.getByText('ASYNC NON-BLOCKING')).toBeVisible();
      await firmwareBtn.click();
      await expect(page.getByText('BLOCKING DELAY(15)')).toBeVisible();
    }

    // 4. Claim tracer tab selection
    const claim5Tab = page.getByRole('tab', { name: 'Claim 5' });
    await expect(claim5Tab).toBeVisible();
    await claim5Tab.click();
    await expect(page.getByText('Pick the nearest free slot')).toBeVisible();

    // 5. Digital Twin permanent title visible, live bar hidden when idle
    await expect(page.locator('text=Digital Twin Layout - 8 Slot HC-SR04 Mesh')).toBeVisible();
    const stepBar = page.locator('#live-claim-step-bar');
    await expect(stepBar).not.toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });
});
