import { chromium } from 'playwright'
const OUT = '/tmp/claude-0/-home-claude/5a59aaca-fb8d-544c-adac-990efc3e4db9/scratchpad'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 1600, height: 950 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173/requests/new', { waitUntil: 'networkidle' })
await page.getByText('Builder', { exact: true }).click()
await page.waitForTimeout(300)
await page.getByText('GENERATE FROM SITEMAP').click()
await page.waitForTimeout(200)
await page.locator('textarea').fill(`-Home
-About
      -Our Team
       -Our Board
-School info
      -Enrolment
       -Stationery
-News & Events
-Contact Us`)
await page.waitForTimeout(300)
await page.screenshot({ path: `${OUT}/s1-sitemap-modal.png` })
await page.getByText(/CREATE 9 PAGES/).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${OUT}/s2-sitemap-result.png` })
console.log('DONE')
await browser.close()
