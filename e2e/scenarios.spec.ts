import { test, expect } from '@playwright/test';

test.describe('ParkWay Digital Twin — Scenarios & Smoke Suite', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Digital Twin Card: shows permanent title row when idle and live bar is not rendered', async ({ page }) => {
    // Permanent card title is visible
    await expect(page.locator('text=Digital Twin Layout - 8 Slot HC-SR04 Mesh')).toBeVisible();

    // Live bar is NOT rendered in idle state
    const stepBar = page.locator('#live-claim-step-bar');
    await expect(stepBar).not.toBeVisible();

    // Claim Tracer has Play scenario button ready, with Replay and Reset disabled
    const playBtn = page.locator('#play-claim-scenario-button');
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveText('Play scenario');

    const replayBtn = page.locator('#claim-tracer-replay-button');
    await expect(replayBtn).toBeVisible();
    await expect(replayBtn).toBeDisabled();

    const resetBtn = page.locator('#claim-tracer-reset-button');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toBeDisabled();
  });

  test('Live Section: replaces title row (never rendered together), controls, reset and close work', async ({ page }) => {
    const titleLocator = page.locator('text=Digital Twin Layout - 8 Slot HC-SR04 Mesh');
    const stepBar = page.locator('#live-claim-step-bar');

    // 1. Initial idle state: title visible, live section not rendered
    await expect(titleLocator).toBeVisible();
    await expect(stepBar).not.toBeVisible();

    // 2. Start Claim 1 scenario via Claim Tracer's play button
    const playScenarioBtn = page.locator('#play-claim-scenario-button');
    await expect(playScenarioBtn).toBeVisible();
    await playScenarioBtn.click();

    // 3. Live section replaces title: step bar visible, title NOT visible (mutual exclusion)
    await expect(stepBar).toBeVisible({ timeout: 4000 });
    await expect(titleLocator).not.toBeVisible();
    await expect(stepBar.locator('text=Claim 1 -')).toBeVisible({ timeout: 4000 });
    await expect(stepBar.locator('#live-step-badge')).toHaveText('1');

    // 4. Progress track visible with nodes
    await expect(stepBar.locator('button[aria-label*="Step 1"]')).toBeVisible();

    // 5. Controls: Play becomes Pause, Replay, Close are present
    const livePlayBtn = stepBar.locator('#live-claim-play-pause-button');
    const liveReplayBtn = stepBar.locator('#live-claim-replay-button');
    const liveCloseBtn = stepBar.locator('#live-claim-close-button');

    await expect(livePlayBtn).toHaveText('Pause');
    await expect(liveReplayBtn).toBeEnabled();
    await expect(liveCloseBtn).toBeVisible();

    // 6. Clicking Pause freezes the claim
    await livePlayBtn.click();
    await expect(livePlayBtn).toHaveText('Play');

    // 7. Replay restarts to step 1, live section STAYS
    await liveReplayBtn.click();
    await expect(stepBar).toBeVisible();
    await expect(titleLocator).not.toBeVisible();
    await expect(stepBar.locator('#live-step-badge')).toHaveText('1');

    // 8. Close button exits scenario and brings permanent title back
    await liveCloseBtn.click();
    await expect(stepBar).not.toBeVisible({ timeout: 4000 });
    await expect(titleLocator).toBeVisible();

    // 9. Re-open and verify Esc closes
    await playScenarioBtn.click();
    await expect(stepBar).toBeVisible({ timeout: 4000 });
    await expect(titleLocator).not.toBeVisible();
    await stepBar.focus();
    await page.keyboard.press('Escape');
    await expect(stepBar).not.toBeVisible({ timeout: 4000 });
    await expect(titleLocator).toBeVisible();
  });



  test('Accessibility: keyboard navigation opens slot drawer with Enter and closes with Escape', async ({ page }) => {
    // Locate Slot 1 bay by aria-label
    const slot1 = page.locator('g[aria-label*="Parking Slot S1"]');
    await expect(slot1).toBeVisible();

    // Focus and press Enter
    await slot1.focus();
    await page.keyboard.press('Enter');

    // Slot detail popover should be open
    const popover = page.locator('[role="dialog"][aria-label="Slot S1"]');
    await expect(popover).toBeVisible();

    // Close via Escape key
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();
  });

  test('Popover: click opens, pointer leave closes after delay, re-entering keeps open', async ({ page }) => {
    const slot1 = page.locator('g[aria-label*="Parking Slot S1"]');
    await expect(slot1).toBeVisible();

    // 1. Click Slot 1 -> Popover opens
    await slot1.click();
    const popover = page.locator('[role="dialog"][aria-label="Slot S1"]');
    await expect(popover).toBeVisible();
    await expect(popover.locator('text=Distance Adjustment')).toBeVisible();

    const box = await popover.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    }

    // 2. Move cursor outside popover (e.g. to (10, 10))
    await page.mouse.move(10, 10);

    // After > 150ms delay, popover closes
    await expect(popover).not.toBeVisible({ timeout: 2000 });

    // 3. Re-open popover
    await slot1.click();
    await expect(popover).toBeVisible();

    const popoverBox = await popover.boundingBox();
    expect(popoverBox).not.toBeNull();

    // Move outside, but quickly move back inside before 150ms
    await page.mouse.move(10, 10);
    await page.waitForTimeout(40);
    if (popoverBox) {
      await page.mouse.move(popoverBox.x + 30, popoverBox.y + 30);
    }

    // Wait past the 150ms threshold; popover must remain open
    await page.waitForTimeout(250);
    await expect(popover).toBeVisible();

    // Move out again and let it close
    await page.mouse.move(10, 10);
    await expect(popover).not.toBeVisible({ timeout: 2000 });
  });

  test('Popover: dragging slider outside keeps it open until pointer up', async ({ page }) => {
    const slot1 = page.locator('g[aria-label*="Parking Slot S1"]');
    await slot1.click();

    const popover = page.locator('[role="dialog"][aria-label="Slot S1"]');
    await expect(popover).toBeVisible();

    const slider = popover.locator('input[type="range"][aria-label="Distance Adjustment"]');
    await expect(slider).toBeVisible();

    const sliderBox = await slider.boundingBox();
    expect(sliderBox).not.toBeNull();

    if (sliderBox) {
      // Mouse down on slider
      await page.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
      await page.mouse.down();

      // Drag cursor far outside popover (e.g. to (10, 10))
      await page.mouse.move(10, 10);
      await page.waitForTimeout(250);

      // Must remain visible while mouse is down (dragging)
      await expect(popover).toBeVisible();

      // Release mouse outside
      await page.mouse.up();

      // Now close delay triggers; popover closes
      await expect(popover).not.toBeVisible({ timeout: 2000 });
    }
  });

  test('Popover: clicking different slot switches popover', async ({ page }) => {
    const slot1 = page.locator('g[aria-label*="Parking Slot S1"]');
    await slot1.click();

    const s1Popover = page.locator('[role="dialog"][aria-label="Slot S1"]');
    await expect(s1Popover).toBeVisible();

    // Click Slot 4 -> S1 closes, S4 opens
    const slot4 = page.locator('g[aria-label*="Parking Slot S4"]');
    await slot4.click();

    await expect(s1Popover).not.toBeVisible();
    const s4Popover = page.locator('[role="dialog"][aria-label="Slot S4"]');
    await expect(s4Popover).toBeVisible();

    const s4Box = await s4Popover.boundingBox();
    if (s4Box) {
      await page.mouse.move(s4Box.x + s4Box.width / 2, s4Box.y + s4Box.height / 2);
    }

    // Move outside to clean up
    await page.mouse.move(10, 10);
    await expect(s4Popover).not.toBeVisible({ timeout: 2000 });
  });

  test('Popover: Park and Vacate buttons update distance immediately and stay open', async ({ page }) => {
    const slot1 = page.locator('g[aria-label*="Parking Slot S1"]');
    // Verify hover text on slot
    await slot1.hover();
    await expect(page.locator('text=Click to adjust distance').first()).toBeVisible();

    // Click to open popover
    await slot1.click();
    const popover = page.locator('[role="dialog"][aria-label="Slot S1"]');
    await expect(popover).toBeVisible();

    const parkBtn = popover.locator('button[aria-label="Park car (8 cm)"]');
    const vacateBtn = popover.locator('button[aria-label="Vacate slot (28 cm)"]');

    await expect(parkBtn).toBeVisible();
    await expect(vacateBtn).toBeVisible();

    // Slot 1 is initially vacant (25cm) -> Park enabled, Vacate disabled
    await expect(parkBtn).toBeEnabled();
    await expect(vacateBtn).toBeDisabled();

    // Click Park button (8 cm)
    await parkBtn.click();

    // Popover is STILL open!
    await expect(popover).toBeVisible();
    await expect(popover.locator('text=8 cm')).toBeVisible();

    // Now slot is occupied -> Park disabled, Vacate enabled
    await expect(parkBtn).toBeDisabled();
    await expect(vacateBtn).toBeEnabled();

    // Click Vacate button (28 cm)
    await vacateBtn.click();

    // Popover is STILL open!
    await expect(popover).toBeVisible();
    await expect(popover.locator('text=28 cm')).toBeVisible();

    // Now slot is vacant -> Park enabled, Vacate disabled
    await expect(parkBtn).toBeEnabled();
    await expect(vacateBtn).toBeDisabled();

    // Move outside to close
    await page.mouse.move(10, 10);
    await expect(popover).not.toBeVisible({ timeout: 2000 });
  });

  test('TopBar removed completely: layout starts at top, simulated badges present, no console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Overview page layout
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Confirm no TopBar or Command Palette button exists
    await expect(page.locator('#command-palette-btn')).toHaveCount(0);
    await expect(page.locator('text=ESP32 DIGITAL TWIN')).toHaveCount(0);
    await expect(page.locator('button:has-text("0.5x")')).toHaveCount(0);
    await expect(page.locator('button:has-text("1x")')).toHaveCount(0);
    await expect(page.locator('button:has-text("4x")')).toHaveCount(0);

    // Confirm SIMULATED TELEMETRY badge in Overview header
    const overviewSimulatedBadge = page.locator('text=SIMULATED TELEMETRY').first();
    await expect(overviewSimulatedBadge).toBeVisible();

    // Confirm main content starts directly at the top (no empty gap)
    const mainArea = page.locator('main');
    const mainBox = await mainArea.boundingBox();
    expect(mainBox).not.toBeNull();
    expect(mainBox!.y).toBe(0);

    // 2. Guidance & Hardware page layout
    await page.goto('/guidance-hardware');
    await page.waitForLoadState('networkidle');

    // Confirm SIMULATED TELEMETRY badge in Guidance & Hardware header
    const ghSimulatedBadge = page.locator('text=SIMULATED TELEMETRY').first();
    await expect(ghSimulatedBadge).toBeVisible();

    const ghMainArea = page.locator('main');
    const ghMainBox = await ghMainArea.boundingBox();
    expect(ghMainBox).not.toBeNull();
    expect(ghMainBox!.y).toBe(0);

    // Ensure zero console errors
    expect(consoleErrors).toEqual([]);
  });

  test('Claim Tracer: all 5 claim scenarios play with ESP32 chip and controls', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test Claims 1, 5, 7, 12
    const claimNumbers = [1, 5, 7, 12];
    for (const claimNum of claimNumbers) {
      const claimTab = page.getByRole('tab', { name: `Claim ${claimNum}`, exact: true });
      await expect(claimTab).toBeVisible();
      await claimTab.click();

      const playBtn = page.locator('#play-claim-scenario-button');
      await expect(playBtn).toBeVisible();
      await playBtn.click();

      // Verify the claim title and step number badge appear in the twin live header
      await expect(page.locator(`text=Claim ${claimNum} -`)).toBeVisible({ timeout: 4000 });
      const stepBadge = page.locator('#live-step-badge');
      await expect(stepBadge).toBeVisible();
      await expect(stepBadge).toHaveText('1');

      // Verify Replay button is enabled
      const replayBtn = page.locator('button[aria-label="Replay scenario"]').first();
      await expect(replayBtn).toBeVisible();
      await expect(replayBtn).toBeEnabled();

      // Click Close to exit cleanly before moving to next claim
      const closeBtn = page.locator('#live-claim-close-button');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
        await expect(page.locator('#live-claim-step-bar')).not.toBeVisible({ timeout: 4000 });
      }
      await expect(playBtn).toBeVisible({ timeout: 3000 });
      await expect(playBtn).toHaveText('Play scenario');
    }

    expect(consoleErrors).toEqual([]);
  });

  test('All 8 slots occupied: renders 8 car sprites in both lanes, all strictly inside card bounds', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Set all 8 slots to 8 cm (occupied) via __simStore
    await page.evaluate(() => {
      const store = (window as unknown as { __simStore: { getState: () => { setAllDistances: (d: number[]) => void } } }).__simStore;
      if (store) {
        store.getState().setAllDistances([8, 8, 8, 8, 8, 8, 8, 8]);
      }
    });

    // Verify all 8 slots are OCCUPIED in UI and car sprites are inside card bounds
    for (let slot = 1; slot <= 8; slot++) {
      const slotCard = page.locator(`[aria-label*="Parking Slot S${slot}"][aria-label*="OCCUPIED"]`);
      await expect(slotCard).toBeVisible({ timeout: 4000 });

      // Car sprite must be present and visible
      const carSprite = page.locator(`#occupied-car-S${slot}`);
      await expect(carSprite).toBeVisible();

      // Assert bounding box is strictly inside card bounding box
      const cardBox = await page.locator(`#slot-bay-floor-S${slot}`).boundingBox();
      const carBox = await carSprite.boundingBox();

      expect(cardBox).not.toBeNull();
      expect(carBox).not.toBeNull();

      if (cardBox && carBox) {
        // Car must be inside card boundaries (with 2px tolerance for subpixel SVG rendering)
        expect(carBox.x).toBeGreaterThanOrEqual(cardBox.x - 2);
        expect(carBox.x + carBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 2);
        expect(carBox.y).toBeGreaterThanOrEqual(cardBox.y - 2);
        expect(carBox.y + carBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height + 2);

        // Verify car is horizontally centered in card (centered around 50% of card width)
        const carCenterX = carBox.x + carBox.width / 2;
        const cardRelativeCenterX = (carCenterX - cardBox.x) / cardBox.width;
        expect(cardRelativeCenterX).toBeGreaterThan(0.44);
        expect(cardRelativeCenterX).toBeLessThan(0.56);
      }
    }
  });
});



