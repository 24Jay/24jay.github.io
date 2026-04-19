#!/usr/bin/env node
/**
 * 调试微信读书笔记按钮
 * 尝试点击阅读器页面右侧工具栏中的各个按钮
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, '.weread-auth.json');
const bookId = process.argv[2] || '0b232fb0813ab8983g016e1d';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = fs.existsSync(authFile)
    ? await browser.newContext({ storageState: authFile })
    : await browser.newContext();

  const page = await context.newPage();

  await page.goto(`https://weread.qq.com/web/reader/${bookId}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 获取页面右侧按钮的 HTML
  const buttons = await page.locator('button, [role="button"], .reader_toolbar_item, [class*="toolbar"]').all();
  console.log(`找到 ${buttons.length} 个按钮/工具元素`);

  for (let i = 0; i < Math.min(buttons.length, 20); i++) {
    const btn = buttons[i];
    const text = await btn.textContent().catch(() => '');
    const title = await btn.getAttribute('title').catch(() => '');
    const html = await btn.evaluate(el => el.outerHTML.substring(0, 200));
    console.log(`\n[${i}] text="${text.trim()}" title="${title}"`);
    console.log(`    html: ${html}`);
  }

  // 截图保存
  await page.screenshot({ path: path.join(__dirname, '..', 'weread', '.debug-buttons.png'), fullPage: false });

  // 尝试点击可能的笔记按钮
  const noteBtnTexts = ['笔记', '想法', '标注', '批注', '划线'];
  for (const text of noteBtnTexts) {
    const btn = page.getByText(text, { exact: false }).first();
    const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
    if (visible) {
      console.log(`\n尝试点击 "${text}" 按钮...`);
      try {
        await btn.click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(__dirname, '..', 'weread', `.debug-after-${text}.png`), fullPage: false });
        console.log(`  已截图保存到 .debug-after-${text}.png`);
      } catch (e) {
        console.log(`  点击失败: ${e.message}`);
      }
      break; // 只尝试第一个找到的
    }
  }

  await browser.close();
})();
