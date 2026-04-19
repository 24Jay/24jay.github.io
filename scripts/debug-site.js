const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 拦截所有请求
  page.on('request', req => console.log('>>', req.method(), req.url()));
  page.on('response', res => console.log('<<', res.status(), res.url()));

  // 访问文章页面
  console.log('\n=== 访问 https://24jay.github.io/posts/claude/ ===');
  await page.goto('https://24jay.github.io/posts/claude/', { waitUntil: 'networkidle' });

  // 检查页面标题
  const title = await page.title();
  console.log('页面标题:', title);

  // 检查 content 区域
  const content = await page.$eval('div.content', el => el.innerHTML.substring(0, 1000)).catch(() => 'CONTENT NOT FOUND');
  console.log('\n=== content 区域内容 (前1000字符) ===');
  console.log(content);

  // 检查是否有 Service Worker
  const swUrl = await page.evaluate(() => navigator.serviceWorker?.controller?.scriptURL || 'NO SW');
  console.log('\n=== Service Worker ===');
  console.log(swUrl);

  // 截图
  await page.screenshot({ path: '/Users/quantux/Desktop/24jay.github.io/scripts/debug-screenshot.png', fullPage: true });
  console.log('\n截图已保存到 scripts/debug-screenshot.png');

  await browser.close();
})();
