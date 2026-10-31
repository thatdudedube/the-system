// Screenshots of every tab at phone width, attached to each build. Run: node tests/screens.js index.html
const path = require('path'); const fs = require('fs');
const { chromium } = require('playwright');
(async () => {
  const file = 'file://' + path.resolve(process.argv[2] || 'index.html'); fs.mkdirSync('screens', { recursive: true });
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2 });
  await pg.goto(file); await pg.waitForTimeout(800);
  await pg.evaluate("document.getElementById('brief')&&document.getElementById('brief').remove(); document.querySelectorAll('.toast').forEach(t=>t.style.display='none')");
  for (const v of ['player', 'quests', 'train', 'food', 'goals', 'progress', 'learn']) {
    await pg.evaluate(`document.querySelector('.nav button[data-v="${v}"]').click()`); await pg.waitForTimeout(300);
    await pg.screenshot({ path: `screens/${v}.png`, fullPage: true });
  }
  await b.close();
})();
