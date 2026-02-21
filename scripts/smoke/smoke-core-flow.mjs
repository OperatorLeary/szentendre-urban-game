import {
  assertCondition,
  createBrowserPage,
  dismissBlockingOverlays,
  performBypassStep,
  readProgress,
  resolveBaseUrl,
  waitForQuestReady
} from "./helpers.mjs";

const CORE_FALLBACK_PATH = (
  process.env.SMOKE_CORE_FALLBACK_PATH ?? "/r/long/l/petzelt-jozsef-tabla?entry=qr&profile=short"
).trim();

async function run() {
  const baseUrl = resolveBaseUrl();
  const { browser, page } = await createBrowserPage();

  try {
    await page.goto(baseUrl, {
      waitUntil: "networkidle"
    });
    await dismissBlockingOverlays(page);

    const shortRouteButton = page.locator("[data-testid='route-start-short']").first();
    const homeRouteAvailable = await shortRouteButton
      .waitFor({
        state: "visible",
        timeout: 12_000
      })
      .then(() => true)
      .catch(() => false);

    if (homeRouteAvailable) {
      await shortRouteButton.click();
    } else {
      console.warn(
        "[smoke-core-flow] route-start-short not found; falling back to direct short-profile URL."
      );
      await page.goto(`${baseUrl}${CORE_FALLBACK_PATH}`, {
        waitUntil: "networkidle"
      });
      await dismissBlockingOverlays(page);
    }

    await waitForQuestReady(page);

    const expectedTotal = 3;
    for (let step = 0; step < expectedTotal; step += 1) {
      const previousUrl = page.url();
      await performBypassStep(page);
      await page.waitForTimeout(350);

      const isCompleted = await page.locator("[data-testid='quest-completed-state']").isVisible();
      if (isCompleted) {
        break;
      }

      await page.waitForFunction(
        (oldUrl) => window.location.href !== oldUrl,
        previousUrl,
        {
          timeout: 10_000
        }
      );
    }

    const progress = await readProgress(page);
    assertCondition(
      progress.total === expectedTotal,
      `Expected short route total=${expectedTotal}, received=${progress.total}`
    );

    const isCompleted = await page.locator("[data-testid='quest-completed-state']").isVisible();
    assertCondition(isCompleted, "Short route did not reach completion in smoke flow.");

    console.log("[smoke-core-flow] PASS");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error("[smoke-core-flow] FAIL", error);
  process.exit(1);
});
