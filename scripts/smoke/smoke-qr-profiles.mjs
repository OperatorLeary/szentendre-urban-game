import {
  assertCondition,
  createBrowserPage,
  dismissBlockingOverlays,
  extractLocationSlug,
  performBypassStep,
  readProgress,
  resolveBaseUrl,
  waitForStepAdvance,
  waitForQuestReady
} from "./helpers.mjs";

const QR_ROUTE_SLUG = (process.env.SMOKE_QR_ROUTE_SLUG ?? "long").trim().toLowerCase();
const QR_START_LOCATION_SLUG = (process.env.SMOKE_QR_START_SLUG ?? "petzelt-jozsef-tabla")
  .trim()
  .toLowerCase();

async function runProfileSmoke(profile, expectedTotal, options = { fullCompletion: false }) {
  const baseUrl = resolveBaseUrl();
  const { browser, page } = await createBrowserPage();

  try {
    const targetUrl = `${baseUrl}/r/${QR_ROUTE_SLUG}/l/${QR_START_LOCATION_SLUG}?entry=qr&profile=${profile}`;
    await page.goto(targetUrl, {
      waitUntil: "networkidle"
    });
    await dismissBlockingOverlays(page);
    await waitForQuestReady(page);

    const initialProgress = await readProgress(page);
    assertCondition(
      initialProgress.total === expectedTotal,
      `[${profile}] expected total=${expectedTotal}, received=${initialProgress.total}`
    );

    const visitedSlugs = new Set();
    const firstSlug = extractLocationSlug(page.url());
    if (firstSlug !== null) {
      visitedSlugs.add(firstSlug);
    }

    const steps = options.fullCompletion ? expectedTotal : 2;
    for (let step = 0; step < steps; step += 1) {
      const beforeState = {
        url: page.url(),
        progress: await readProgress(page)
      };
      await performBypassStep(page);
      const outcome = await waitForStepAdvance(page, beforeState, 22_000);
      if (outcome.completed) {
        if (!options.fullCompletion) {
          throw new Error(`[${profile}] completed unexpectedly during partial smoke.`);
        }
        break;
      }

      const currentSlug = extractLocationSlug(page.url());
      assertCondition(currentSlug !== null, `[${profile}] unable to parse location slug from URL.`);
      visitedSlugs.add(currentSlug);
    }

    const finalProgress = await readProgress(page);
    assertCondition(
      finalProgress.total === expectedTotal,
      `[${profile}] progress denominator changed unexpectedly: ${finalProgress.total}`
    );

    if (options.fullCompletion) {
      const isCompleted = await page.locator("[data-testid='quest-completed-state']").isVisible();
      assertCondition(isCompleted, `[${profile}] expected completion state was not reached.`);
      assertCondition(
        visitedSlugs.size >= Math.min(expectedTotal, 2),
        `[${profile}] expected varied station progression; visited=${visitedSlugs.size}`
      );
    } else {
      assertCondition(
        visitedSlugs.size >= 2,
        `[${profile}] expected URL progression to at least two distinct stations.`
      );
    }

    console.log(`[smoke-qr-profiles] PASS profile=${profile} total=${expectedTotal}`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await runProfileSmoke("short", 3, {
    fullCompletion: true
  });
  await runProfileSmoke("medium", 12, {
    fullCompletion: false
  });
  await runProfileSmoke("long", 24, {
    fullCompletion: false
  });
}

run().catch((error) => {
  console.error("[smoke-qr-profiles] FAIL", error);
  process.exit(1);
});
