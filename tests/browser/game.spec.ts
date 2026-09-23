import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { localSupport } from '../../src/game/decisionSupport';

async function language(page: Page, name: string) {
  const choice = page.getByRole('button', { name, exact: true });
  if (!(await choice.isVisible())) await page.locator('.mayor-desk-button').click();
  await choice.click();
  if (await page.locator('.panel-desk').isVisible()) await page.keyboard.press('Escape');
}
async function english(page: Page) {
  await language(page, 'EN');
  const skip = page.getByRole('button', { name: 'Go straight to the city', exact: true });
  if (await skip.isVisible()) await skip.click();
  const guide = page.getByRole('button', { name: 'Skip guide', exact: true });
  if (await guide.isVisible()) await guide.click();
  await expect(page.getByTestId('city-loading')).not.toBeVisible();
}
async function desk(page: Page) {
  const menu = page.getByRole('button', { name: 'Mayor’s desk', exact: true });
  if (await menu.isVisible()) await menu.click();
}
async function panel(page: Page, name: string) {
  await desk(page);
  await page
    .locator('.panel-desk')
    .getByRole('button', { name: new RegExp('^' + name) })
    .click();
}
async function preview(page: Page, id: string, district = 'nura') {
  await page.getByRole('button', { name: 'All 14 policies', exact: true }).click();
  await page.locator('.term-panel').getByTestId(`policy-${id}`).click();
  const target = page.getByRole('combobox', { name: 'Policy district', exact: true });
  if (await target.isVisible()) await target.selectOption(district);
}
async function adopt(page: Page, id: string, district = 'nura') {
  await preview(page, id, district);
  await expect(page.getByTestId('commit-policy')).toBeEnabled();
  await page.getByTestId('commit-policy').click();
  await expect(page.getByTestId('applied-summary')).toBeVisible();
  await expect(page.getByTestId('city-policy-callout')).toContainText('Funded');
  if (id === 'M12')
    await expect(page.getByTestId('city-policy-callout')).toContainText('All five districts');
  const next = page.getByRole('button', { name: 'Next decision', exact: true });
  if (await next.isVisible()) await next.click();
}
const example: [string, string?][] = [['M7'], ['M8'], ['M10'], ['M12'], ['M5', 'saryarka']];

test('full five-decision game, preview isolation, official score, persistence, archive, export and reset', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await english(page);
  await expect(page.getByTestId('score')).toContainText('52.56');
  await expect(page.getByTestId('city-canvas')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/city-en.png' });
  await language(page, 'ҚАЗ');
  await page.screenshot({ path: 'docs/screenshots/city-kk.png' });
  await language(page, 'RU');
  await page.screenshot({ path: 'docs/screenshots/city-ru.png' });
  await english(page);
  await preview(page, 'M7');
  await expect(page.getByTestId('budget')).toContainText('100');
  await expect(page.locator('.term-review')).toContainText('54.01');
  await expect(page.getByTestId('city-policy-callout')).toContainText('not funded yet');
  await page.screenshot({ path: 'docs/screenshots/policy-preview.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('score')).toContainText('52.56');
  await adopt(page, 'M7');
  await expect(page.getByTestId('budget')).toContainText('76');
  await page.reload();
  await expect(page.getByTestId('budget')).toContainText('76');
  for (const [id, district] of example.slice(1)) await adopt(page, id, district);
  await page
    .getByTestId('applied-summary')
    .getByRole('button', { name: 'Review your term', exact: true })
    .click();
  await expect(page.locator('.finale-score')).toContainText('56.54');
  await expect(page.locator('.finale-facts')).toContainText('95 / 100');
  await expect(page.locator('.finale-milestones .earned')).toHaveCount(3);
  await page.screenshot({ path: 'docs/screenshots/finale-en.png' });
  await page.getByRole('button', { name: 'Open the full report', exact: true }).click();
  await expect(page.locator('.big-score')).toContainText('56.54');
  await expect(page.getByText('Connected safety · B1 +2')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/report-en.png', fullPage: true });
  await page.getByRole('button', { name: 'Save scenario', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('qala-scenario.json');
  await page.getByRole('button', { name: 'Scenarios', exact: true }).click();
  await expect(page.locator('.run-grid')).toContainText('56.54');
  await page.getByRole('button', { name: 'Start again', exact: true }).click();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await expect(page.getByTestId('budget')).toContainText('100');
  await expect(page.getByTestId('score')).toContainText('52.56');
  expect(errors).toEqual([]);
});

test('conflicts explain the problem, district retargeting resolves land conflict, undo restores state', async ({
  page,
}) => {
  await page.goto('/');
  await english(page);
  await adopt(page, 'M1');
  await preview(page, 'M3');
  await expect(page.getByRole('alert')).toContainText('Bus lanes and light rail');
  await expect(page.getByTestId('commit-policy')).toBeDisabled();
  await page.keyboard.press('Escape');
  await panel(page, 'Decision journal');
  await page.getByRole('button', { name: 'Undo last decision', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('budget')).toContainText('100');
  await adopt(page, 'M4');
  await preview(page, 'M7');
  await expect(page.getByRole('alert')).toContainText('same site');
  await page.getByRole('combobox', { name: 'Policy district', exact: true }).selectOption('esil');
  await expect(page.getByTestId('commit-policy')).toBeEnabled();
});

test('plans that cannot finish within the budget remain uncommittable', async ({ page }) => {
  await page.goto('/');
  await english(page);
  await adopt(page, 'M3');
  await adopt(page, 'M13', 'esil');
  await preview(page, 'M5', 'saryarka');
  await expect(page.getByRole('alert')).toContainText('no legal way');
  await expect(page.getByTestId('commit-policy')).toBeDisabled();
});

test('offline file launch includes artwork, complete gameplay and local advice with zero HTTP requests', async ({
  browser,
}) => {
  const context = await browser.newContext({
    offline: true,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const requests: string[] = [];
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) requests.push(r.url());
  });
  await page.goto(pathToFileURL(resolve('dist/index.html')).href);
  await english(page);
  expect(await page.locator('#isocity-license').textContent()).toContain(
    'Copyright (c) 2025 amilich',
  );
  await expect(page.locator('.isocity-fallback')).toHaveCount(0);
  await panel(page, 'AI advisor');
  await page.getByRole('button', { name: 'Get advice', exact: true }).click();
  await expect(page.locator('.advice-origin')).toContainText('Local analysis');
  const offlineConnection = page.locator('.panel-advisor').getByTestId('advisor-connection');
  await offlineConnection.locator(':scope > summary').click();
  await expect(offlineConnection).toContainText('npm run demo');
  await expect(offlineConnection.getByTestId('advisor-openai-key')).toHaveCount(0);
  await page.keyboard.press('Escape');
  for (const [id, district] of example) await adopt(page, id, district);
  await page
    .getByTestId('applied-summary')
    .getByRole('button', { name: 'Review your term', exact: true })
    .click();
  await expect(page.locator('.finale-score')).toContainText('56.54');
  expect(requests).toEqual([]);
  await context.close();
});

test('phone layout, Kazakh UI, preview controls and accessible dialog dismissal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await language(page, 'ҚАЗ');
  await expect(page.locator('.arrival-copy h1')).toContainText('Тұтас қала.');
  await page.getByRole('button', { name: 'Бірден қалаға өту', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/mobile-kk.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await english(page);
  await preview(page, 'M7');
  await expect(page.getByTestId('commit-policy')).toBeInViewport();
  await page.getByTestId('commit-policy').click();
  await expect(page.getByTestId('applied-summary')).toBeVisible();
  await page.getByRole('button', { name: 'Next decision', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('corrupt storage and unavailable WebGL recover to a playable Canvas city', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('qala-session-v1', '[null]');
    localStorage.setItem('qala-runs-v1', '{"bad":true}');
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: any[]) {
      if (String(args[0]).startsWith('webgl')) return null;
      return original.apply(this, args as any);
    } as any;
  });
  await page.goto('/');
  await english(page);
  await expect(page.getByTestId('score')).toContainText('52.56');
  await expect(page.getByTestId('city-canvas')).toBeVisible();
  await adopt(page, 'M7');
  await expect(page.getByTestId('budget')).toContainText('76');
});

test('validated Jev advice remains a proposal; malformed and stale replies cannot change a plan', async ({
  page,
}) => {
  await page.goto('/');
  await english(page);
  const input = { decisions: [], lang: 'en' as const, goal: 'balanced' as const, question: '' };
  const reply = {
    ...localSupport(input),
    mode: 'jev',
    confidence: 0.4,
    needsClarification: true,
    models: { selection: 'jev-1.13.0', explanation: null },
  };
  await page.route('**/api/decision-support', (route) => route.fulfill({ json: reply }));
  await panel(page, 'AI advisor');
  await page.getByRole('button', { name: 'Get advice', exact: true }).click();
  await expect(page.locator('.advice-confidence')).toContainText('40%');
  await expect(page.locator('.advice-response')).toContainText('request is ambiguous');
  await expect(page.getByTestId('budget')).toContainText('100');
  await page.locator('.advisor-choice').click();
  await expect(page.getByTestId('commit-policy')).toBeEnabled();
  await expect(page.getByTestId('score')).toContainText('52.56');
  await page.keyboard.press('Escape');
  await page.unroute('**/api/decision-support');
  await page.route('**/api/decision-support', (route) =>
    route.fulfill({
      json: {
        ...reply,
        alternatives: [{ ...reply.recommendation, decision: { measureId: 'M999' } }],
      },
    }),
  );
  await panel(page, 'AI advisor');
  await page.getByRole('button', { name: 'Get advice', exact: true }).click();
  await expect(page.locator('.advice-origin')).toContainText('Local analysis');
  await expect(page.getByTestId('score')).toContainText('52.56');
  await page.unroute('**/api/decision-support');
  await page.route('**/api/decision-support', async (route) => {
    await new Promise((r) => setTimeout(r, 600));
    await route.fulfill({ json: reply });
  });
  await page.getByRole('button', { name: 'Get advice', exact: true }).click();
  await page.getByRole('textbox').fill('Help transport first');
  await expect(page.locator('.advice-origin')).toContainText('Local analysis');
  await expect(page.locator('.advice-confidence')).toHaveCount(0);
});

test('arrival, briefing, handbook and city preferences form an accessible complete experience', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.screenshot({ path: 'docs/screenshots/onboarding-en.png' });
  await page.getByRole('button', { name: 'Take office', exact: true }).click();
  await expect(page.getByTestId('onboarding-briefing')).toContainText('exactly five');
  await page.screenshot({ path: 'docs/screenshots/briefing-en.png' });
  await page.getByRole('button', { name: 'Meet your city', exact: true }).click();
  await expect(page.getByTestId('guided-tip')).toHaveAttribute('data-guide-stage', 'choose');
  await page.locator('.term-policy-hand').getByTestId('policy-M7').click();
  await expect(page.getByTestId('guided-tip')).toHaveAttribute('data-guide-stage', 'preview');
  await expect(page.getByTestId('budget')).toContainText('100');
  await page.getByTestId('commit-policy').click();
  await expect(page.getByTestId('guided-tip')).toHaveAttribute('data-guide-stage', 'result');
  await page.getByRole('button', { name: 'Next decision', exact: true }).click();
  await expect(page.getByTestId('guided-tip')).toHaveCount(0);
  await panel(page, 'Mayor’s handbook');
  await page.screenshot({ path: 'docs/screenshots/handbook-en.png' });
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.book-chapter')).toContainText('02');
  await page.keyboard.press('Escape');
  await desk(page);
  await page.getByRole('button', { name: 'Evening city', exact: true }).click();
  await expect(page.locator('.mayor-experience')).toHaveClass(/term-night/);
  await page.getByRole('button', { name: 'Pause city life', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause city life', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Decision sounds', exact: true }).click();
  await page.getByRole('button', { name: 'Decision sounds', exact: true }).click();
});

test('map gestures keep the selected district and visible advice opens a free preview', async ({
  page,
}) => {
  await page.goto('/');
  await english(page);
  const district = page.getByRole('combobox', { name: 'Select district', exact: true });
  await expect(district).toHaveValue('nura');
  const world = page.getByTestId('city-world');
  const bounds = await world.boundingBox();
  expect(bounds).not.toBeNull();
  const x = bounds!.width * 0.65,
    y = bounds!.height * 0.42;
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, 360);
  await page.mouse.click(x, y);
  await expect(district).toHaveValue('nura');
  await page.mouse.down();
  await page.mouse.move(x + 130, y + 75, { steps: 8 });
  await page.mouse.up();
  await expect(district).toHaveValue('nura');
  await district.focus();
  await district.hover();
  await page.mouse.wheel(0, 240);
  await expect(district).toHaveValue('nura');
  await expect(page.getByTestId('budget')).toContainText('100');
  await expect(page.getByTestId('city-advice')).toContainText('Local');
  await page.getByTestId('preview-suggestion').click();
  await expect(page.getByTestId('commit-policy')).toBeEnabled();
  await expect(page.getByTestId('budget')).toContainText('100');
  await expect(page.getByTestId('score')).toContainText('52.56');
  await page.keyboard.press('Escape');
  await district.selectOption('almaty');
  await expect(district).toHaveValue('almaty');
  await page.getByRole('button', { name: 'Reset map', exact: true }).click();
  const marker = page.locator('.isocity-marker').filter({ hasText: 'Nura' });
  // A trackpad scroll can be followed by a click on the same moving label.
  await marker.dispatchEvent('wheel', { deltaY: 1, bubbles: true, cancelable: true });
  await marker.dispatchEvent('click', { detail: 1, bubbles: true, cancelable: true });
  await expect(district).toHaveValue('almaty');
  // Keyboard activation remains available during the pointer-only gesture guard.
  await marker.press('Enter');
  await expect(district).toHaveValue('nura');
});

test('optional onboarding key connection clears input and never persists or calls a provider', async ({
  page,
}) => {
  let connected = false;
  let adviceRequests = 0;
  const submitted: Record<string, unknown>[] = [];
  const token = 'browser-test-session-token-with-sufficient-length';
  const status = () => ({
    openai: { configured: connected, source: connected ? 'session' : 'none' },
    jev: { configured: false, source: 'none' },
  });
  await page.route('**/api/session-credentials', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { csrfToken: token, ...status() } });
      return;
    }
    expect(route.request().headers()['x-qala-session-token']).toBe(token);
    const body = route.request().postDataJSON();
    submitted.push(body);
    connected = body.action === 'connect';
    await route.fulfill({ json: status() });
  });
  await page.route('**/api/decision-support', async (route) => {
    adviceRequests++;
    await route.abort();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'EN', exact: true }).click();
  await page.getByRole('button', { name: 'Take office', exact: true }).click();
  const connection = page.getByTestId('onboarding-briefing').getByTestId('advisor-connection');
  await connection.locator(':scope > summary').click();
  await expect(connection.getByTestId('advisor-openai-key')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/ai-connection.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const fakeKey = 'demo-placeholder-key-not-a-real-credential';
  await connection.getByTestId('advisor-openai-key').fill(fakeKey);
  await connection.getByRole('button', { name: 'Connect for this session', exact: true }).click();
  await expect(connection.getByTestId('advisor-openai-key')).toHaveValue('');
  await expect(connection.getByTestId('advisor-key-status')).toContainText('this server session');
  expect(submitted).toEqual([{ action: 'connect', openaiKey: fakeKey }]);
  expect(adviceRequests).toBe(0);
  const browserStorage = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
  );
  expect(browserStorage).not.toContain(fakeKey);
  await connection.getByRole('button', { name: 'Disconnect', exact: true }).click();
  await expect(connection.getByTestId('advisor-key-status')).toHaveCount(0);
  await expect(connection).toContainText('Session keys cleared');
  expect(adviceRequests).toBe(0);
  await connection.locator(':scope > summary').click();
  await page.getByRole('button', { name: 'Meet your city', exact: true }).click();
  await expect(page.getByTestId('budget')).toContainText('100');
});
