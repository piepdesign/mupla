/**
 * Accessibility smoke test: axe-core (WCAG 2.1 AA rules) on key pages in light and dark,
 * plus the first tab stops. Needs a running server: npm run build && npm start, then npm run a11y.
 * Uses the locally installed Chrome/Chromium (set CHROME_PATH if it is not found).
 */
import { chromium } from "playwright-core";
import AxeBuilder from "@axe-core/playwright";
import { existsSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PAGES = (process.env.A11Y_PAGES ?? "/,/ansicht/festivals,/quellen").split(",");
const candidates = [
  process.env.CHROME_PATH,
  "/opt/pw-browsers/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean) as string[];

async function main() {
  const executablePath = candidates.find((p) => existsSync(p));
  const browser = await chromium.launch({ executablePath });
  const shots = process.env.SCREENSHOTS;
  if (shots) mkdirSync(shots, { recursive: true });
  let violations = 0;

  for (const scheme of ["dark", "light"] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto(BASE + path, { waitUntil: "networkidle" });
      const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      for (const v of res.violations) {
        violations++;
        console.log(`FAIL [${scheme}] ${path}: ${v.id} (${v.impact}) ${v.help}`);
        for (const n of v.nodes.slice(0, 3)) console.log(`     ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1] ?? ""}`);
      }
      if (!res.violations.length) console.log(`ok   [${scheme}] ${path}: no axe violations (${res.passes.length} rules passed)`);
      if (shots) await page.screenshot({ path: `${shots}/${scheme}${path.replaceAll("/", "_") || "_"}.png`, fullPage: true });
    }

    if (scheme === "dark") {
      await page.goto(BASE + "/", { waitUntil: "networkidle" });
      const stops: string[] = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press("Tab");
        stops.push(
          await page.evaluate(() => {
            const el = document.activeElement as HTMLElement | null;
            if (!el) return "(none)";
            const outline = getComputedStyle(el).outlineStyle;
            return `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 30)}" outline=${outline}`;
          }),
        );
      }
      console.log("\nTab order (first 6 stops):\n  " + stops.join("\n  "));
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${violations} axe violation(s).`);
  if (violations) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
