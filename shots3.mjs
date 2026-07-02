import { chromium } from 'playwright'
const OUT = '/tmp/claude-0/-home-claude/5a59aaca-fb8d-544c-adac-990efc3e4db9/scratchpad'
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:5173/requests/new', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/z1-wizard-zoom.png` })
await page.goto('http://localhost:5173/team', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/z2-team.png` })
console.log('DONE')
await browser.close()
