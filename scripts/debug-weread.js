#!/usr/bin/env node
/**
 * 微信读书页面结构调试脚本
 * 获取书架页面的 HTML 结构，用于调整提取选择器
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, '.weread-auth.json');

(async () => {
  const browser = await chromium.launch({ headless: true });
  let context;

  if (fs.existsSync(authFile)) {
    console.log('Loading saved auth...');
    context = await browser.newContext({ storageState: authFile });
  } else {
    console.log('No auth file found');
    context = await browser.newContext();
  }

  const page = await context.newPage();

  // 访问书架
  await page.goto('https://weread.qq.com/web/shelf', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 获取页面 HTML
  const html = await page.content();

  // 保存 HTML 用于分析
  const htmlPath = path.join(__dirname, '..', 'weread', '.debug-page.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`HTML saved to: ${htmlPath}`);

  // 尝试获取页面上的文本内容
  const bodyText = await page.locator('body').textContent();
  console.log('\n--- Page text (first 1000 chars) ---');
  console.log(bodyText.substring(0, 1000));

  // 查找可能的书籍相关元素
  console.log('\n--- Searching for book-related elements ---');

  const possibleSelectors = [
    'a[href*="book"]',
    '[class*="book"]',
    '[class*="shelf"]',
    '[class*="title"]',
    'img',
    'h3', 'h4', 'h5',
  ];

  for (const sel of possibleSelectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      console.log(`  ${sel}: ${count} elements`);
      // 打印第一个元素的 HTML
      const firstHtml = await page.locator(sel).first().evaluate(el => el.outerHTML.substring(0, 200));
      console.log(`    first: ${firstHtml}...`);
    }
  }

  await browser.close();
  console.log('\nDone.');
})();
