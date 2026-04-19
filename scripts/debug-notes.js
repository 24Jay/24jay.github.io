#!/usr/bin/env node
/**
 * 调试微信读书笔记页面结构
 * 访问一本书的阅读器页面，查看笔记相关的 DOM 结构
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, '.weread-auth.json');
const bookId = process.argv[2] || '0b232fb0813ab8983g016e1d'; // 默认第一本书

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = fs.existsSync(authFile)
    ? await browser.newContext({ storageState: authFile })
    : await browser.newContext();

  const page = await context.newPage();

  // 方式1：访问阅读器页面
  console.log('=== 方式1：访问阅读器页面 ===');
  await page.goto(`https://weread.qq.com/web/reader/${bookId}`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);

  // 截图
  await page.screenshot({ path: path.join(__dirname, '..', 'weread', '.debug-reader.png'), fullPage: false });

  // 查找笔记相关元素
  const noteKeywords = ['笔记', '想法', '划线', '标注', '批注'];
  for (const kw of noteKeywords) {
    const count = await page.getByText(kw, { exact: false }).count();
    if (count > 0) {
      console.log(`  找到 "${kw}" 相关元素: ${count} 个`);
    }
  }

  // 方式2：尝试带 note 参数
  console.log('\n=== 方式2：访问带 note 参数的阅读器 ===');
  await page.goto(`https://weread.qq.com/web/reader/${bookId}?note=t`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(__dirname, '..', 'weread', '.debug-reader-note.png'), fullPage: false });

  for (const kw of noteKeywords) {
    const count = await page.getByText(kw, { exact: false }).count();
    if (count > 0) {
      console.log(`  找到 "${kw}" 相关元素: ${count} 个`);
    }
  }

  // 获取当前 URL
  console.log(`\n当前 URL: ${page.url()}`);

  await browser.close();
  console.log('\n调试完成，截图保存在 weread/ 目录');
})();
