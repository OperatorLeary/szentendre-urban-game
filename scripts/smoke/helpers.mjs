import { chromium } from "playwright";

const DEFAULT_BASE_URL = "http://127.0.0.1:4173";
const GPS_VALIDATE_SELECTORS = [
  "[data-testid='validate-gps-button-desktop']",
  "[data-testid='validate-gps-button-mobile']"
];

export function resolveBaseUrl() {
  return (process.env.SMOKE_BASE_URL ?? DEFAULT_BASE_URL).trim();
}

export async function createBrowserPage() {
  const browser = await chromium.launch({
    headless: true
  });
  const context = await browser.newContext({
    viewport: {
      width: 1280,
      height: 900
    }
  });
  const page = await context.newPage();

  return {
    browser,
    context,
    page
  };
}

export function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export async function waitForQuestReady(page) {
  await page.waitForSelector("[data-testid='quest-answer-input']", {
    timeout: 20_000
  });
}

export async function dismissBlockingOverlays(page) {
  const desktopNoticeClose = page.locator("[data-testid='desktop-notice-close']").first();
  if (await desktopNoticeClose.isVisible().catch(() => false)) {
    await desktopNoticeClose.click();
    await page.waitForTimeout(120);
  }

  const preflightContinue = page.locator("[data-testid='preflight-continue']").first();
  if (await preflightContinue.isVisible().catch(() => false)) {
    await preflightContinue.click();
    await page.waitForTimeout(120);
  }
}

export async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) {
      await locator.click();
      return selector;
    }
  }

  throw new Error(`No visible selector matched. Tried: ${selectors.join(", ")}`);
}

export async function readProgress(page) {
  const rawText = await page.locator("[data-testid='quest-progress-ratio']").first().innerText();
  const match = rawText.match(/(\d+)\s*\/\s*(\d+)/);
  if (match === null) {
    throw new Error(`Unable to parse progress ratio from: ${rawText}`);
  }

  return {
    completed: Number(match[1]),
    total: Number(match[2])
  };
}

export function extractLocationSlug(url) {
  const normalizedUrl = new URL(url);
  const match = normalizedUrl.pathname.match(/\/r\/[^/]+\/l\/([^/?#]+)/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export async function performBypassStep(page) {
  await page.locator("[data-testid='quest-answer-input']").fill("teacher-bypass");
  await clickFirstVisible(page, GPS_VALIDATE_SELECTORS);
}
