#!/usr/bin/env node
/**
 * 微信读书笔记提取脚本
 * 自动从微信读书网页版提取个人划线和评论，输出为 Markdown
 *
 * 用法:
 *   node scripts/extract-weread.js
 *
 * 首次运行会打开浏览器让你扫码登录，登录态会自动保存。
 * 笔记输出到 ../weread/ 目录下。
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// ==================== 配置 ====================
const CONFIG = {
  // 微信读书网页版地址
  baseUrl: 'https://weread.qq.com',
  // 登录态保存路径
  authFile: path.join(__dirname, '.weread-auth.json'),
  // 输出目录
  outputDir: path.join(__dirname, '..', 'weread'),
  // 请求间隔（毫秒），避免被微信读书限流
  delay: 4000,
  // 是否无头模式（首次登录建议 false）
  headless: false,
};

// ==================== 工具函数 ====================

/**
 * 安全等待
 */
async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * 清理文件名中的非法字符
 */
function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*\n\r]/g, '_').trim();
}

/**
 * 将笔记数组转为 Markdown
 * 按章节分组输出
 */
function notesToMarkdown(bookTitle, bookAuthor, notes) {
  const date = new Date().toISOString().split('T')[0];
  let md = `---\n`;
  md += `title: "${bookTitle.replace(/"/g, '\\"')}"\n`;
  md += `author: "${bookAuthor.replace(/"/g, '\\"')}"\n`;
  md += `date: ${date}\n`;
  md += `source: 微信读书\n`;
  md += `---\n\n`;
  md += `# ${bookTitle}\n\n`;
  md += `> 作者：${bookAuthor}\n`;
  md += `> 笔记数：${notes.length} 条\n\n`;

  if (notes.length === 0) {
    md += `*暂无笔记*\n`;
    return md;
  }

  // 按章节分组
  const byChapter = {};
  for (const note of notes) {
    const chapter = note.chapter || '未分类';
    if (!byChapter[chapter]) byChapter[chapter] = [];
    byChapter[chapter].push(note);
  }

  for (const [chapter, chapterNotes] of Object.entries(byChapter)) {
    md += `## ${chapter}\n\n`;
    for (const note of chapterNotes) {
      md += `> ${note.content}\n\n`;
    }
  }

  return md;
}

/**
 * 保存笔记到文件
 */
function saveNotes(bookTitle, bookAuthor, notes) {
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  const safeTitle = sanitizeFileName(bookTitle);
  const fileName = `${safeTitle}.md`;
  const filePath = path.join(CONFIG.outputDir, fileName);

  const md = notesToMarkdown(bookTitle, bookAuthor, notes);
  fs.writeFileSync(filePath, md, 'utf-8');
  console.log(`  ✅ 已保存: ${fileName} (${notes.length} 条笔记)`);
}

// ==================== 核心逻辑 ====================

/**
 * 检查是否已登录
 * 策略：检查页面上是否有"登录"按钮，如果存在说明未登录
 * 同时检查是否有书架内容或用户信息
 */
async function isLoggedIn(page) {
  try {
    // 等待页面稳定
    await sleep(1500);

    // 方式1：检查右上角是否有"登录"链接/按钮（未登录状态会显示）
    // Playwright getByText 更可靠
    const loginText = await page.getByText('登录', { exact: true }).first().isVisible({ timeout: 2000 }).catch(() => false);
    const loginLink = await page.locator('a[href*="login"], a[href*="auth"]').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (loginText || loginLink) {
      console.log('  检测到登录按钮，当前未登录');
      return false;
    }

    // 方式2：检查是否有书架内容
    const shelfSelectors = [
      '.shelf_list',
      '.bookList',
      '.wr_shelf_list',
      '.wr_bookList_item',
      '[class*="shelf_list"]',
      '[class*="bookList"]',
    ];
    for (const sel of shelfSelectors) {
      const visible = await page.locator(sel).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        console.log(`  检测到书架内容 (${sel})`);
        return true;
      }
    }

    // 方式3：检查页面标题或URL是否表明已登录
    const url = page.url();
    if (url.includes('/web/shelf') && !url.includes('login')) {
      // 如果在书架页但没有登录按钮，可能已登录但书架为空
      // 检查页面是否有"书架为空"之类的提示
      const emptyHint = await page.getByText(/书架为空|还没有|去书城/).first().isVisible({ timeout: 1000 }).catch(() => false);
      if (emptyHint) {
        console.log('  检测到书架为空提示');
        return true; // 已登录但书架为空
      }
    }

    // 方式4：检查是否有用户头像
    const hasAvatar = await page.locator('img[class*="avatar"], [class*="userAvatar"], [class*="profileAvatar"]').first().isVisible({ timeout: 1000 }).catch(() => false);
    if (hasAvatar) {
      console.log('  检测到用户头像');
      return true;
    }

    console.log('  无法确认登录状态，假设未登录');
    return false;
  } catch {
    return false;
  }
}

/**
 * 获取书架上的书籍列表（支持滚动加载）
 */
async function getShelfBooks(page) {
  console.log('📚 正在获取书架列表...');
  await page.goto(`${CONFIG.baseUrl}/web/shelf`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(CONFIG.delay);

  // 滚动加载所有书籍
  let lastCount = 0;
  let sameCount = 0;
  const maxScrolls = 20;
  for (let i = 0; i < maxScrolls; i++) {
    const currentCount = await page.locator('.shelfBook').count();
    if (currentCount > lastCount) {
      lastCount = currentCount;
      sameCount = 0;
      // 滚动到页面底部触发懒加载
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
    } else {
      sameCount++;
      if (sameCount >= 3) {
        console.log(`  滚动加载完成，共 ${currentCount} 本书`);
        break;
      }
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1500);
    }
  }

  // 微信读书网页版书架的实际 DOM 结构
  const books = await page.locator('.shelf_list .shelfBook').all();
  if (books.length === 0) {
    const screenshotPath = path.join(CONFIG.outputDir, '.debug-shelf.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  ⚠️ 未找到书籍，已截图保存到 ${screenshotPath}`);
    return [];
  }
  console.log(`  找到 ${books.length} 本书`);

  const result = [];
  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    try {
      // 提取书名 — 微信读书网页版中书名在 .title 元素内
      const title = await book.locator('.title').first().textContent({ timeout: 1000 }).catch(() => '未知书名');

      // 提取链接 — .shelfBook 本身就是 <a> 标签
      const href = await book.getAttribute('href', { timeout: 1000 }).catch(() => null);

      // 提取 bookId — 链接格式: /web/reader/{bookId}
      let bookId = null;
      if (href) {
        const match = href.match(/reader\/([a-zA-Z0-9]+)/);
        if (match) bookId = match[1];
      }

      // 网页版不显示作者，跳过
      const author = '未知作者';

      result.push({
        title: title.trim(),
        author,
        bookId,
        href,
        index: i,
      });
    } catch (e) {
      console.log(`  跳过第 ${i + 1} 本书: ${e.message}`);
    }
  }

  return result;
}

/**
 * 提取单本书的笔记
 * 微信读书网页版笔记面板结构（从实际 DOM 分析得出）：
 *   section.ps-container.readerNotePanel_scroll_container
 *     .readerNoteList
 *       .wr_reader_note_panel_chapter_wrapper
 *         .wr_reader_note_panel_chapter_title — 章节标题
 *         .wr_reader_note_panel_item_cell_wrapper.clickable
 *           .wr_reader_note_panel_item_cell_icon — 图标（区分类型）
 *           .wr_reader_note_panel_item_cell_content_text — 笔记内容
 */
async function extractBookNotes(page, book) {
  console.log(`\n📖 [${book.index + 1}] ${book.title}`);

  const notes = [];

  if (!book.bookId) {
    console.log('  ⚠️ 无法获取 bookId，跳过');
    return notes;
  }

  try {
    // 1. 访问阅读器页面
    const readerUrl = `${CONFIG.baseUrl}/web/reader/${book.bookId}`;
    await page.goto(readerUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    // 2. 点击笔记按钮打开笔记面板
    const noteBtn = page.locator('.wr_note').first();
    const noteBtnVisible = await noteBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!noteBtnVisible) {
      console.log('  ⚠️ 未找到笔记按钮，可能此书无笔记');
      return notes;
    }

    await noteBtn.click();
    await sleep(2000);

    // 3. 等待笔记面板加载
    const panel = page.locator('.readerNotePanel_scroll_container').first();
    const panelVisible = await panel.isVisible({ timeout: 5000 }).catch(() => false);
    if (!panelVisible) {
      console.log('  ⚠️ 笔记面板未打开');
      return notes;
    }

    // 4. 获取所有章节分组
    const chapters = await page.locator('.wr_reader_note_panel_chapter_wrapper').all();
    console.log(`  找到 ${chapters.length} 个章节`);

    for (const chapter of chapters) {
      // 提取章节标题
      const chapterTitle = await chapter.locator('.wr_reader_note_panel_chapter_title').first()
        .textContent({ timeout: 1000 }).catch(() => '未命名章节');

      // 提取该章节下的所有笔记
      const noteCells = await chapter.locator('.wr_reader_note_panel_item_cell_wrapper').all();

      for (const cell of noteCells) {
        try {
          const text = await cell.locator('.wr_reader_note_panel_item_cell_content_text').first()
            .textContent({ timeout: 500 }).catch(() => '');

          if (text.trim()) {
            notes.push({
              type: 'highlight',
              content: text.trim(),
              chapter: chapterTitle.trim(),
            });
          }
        } catch {
          // 跳过失败的条目
        }
      }
    }

    console.log(`  提取到 ${notes.length} 条笔记`);

  } catch (e) {
    console.log(`  提取失败: ${e.message}`);
  }

  // 保存
  if (notes.length > 0) {
    saveNotes(book.title, book.author, notes);
  } else {
    console.log(`  ⚠️ 未提取到笔记`);
  }

  return notes;
}

// ==================== 主流程 ====================

async function main() {
  console.log('🚀 微信读书笔记提取工具\n');

  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
  }

  let context;
  let browser;

  try {
    browser = await chromium.launch({ headless: CONFIG.headless });

    // 尝试加载已有登录态
    if (fs.existsSync(CONFIG.authFile)) {
      console.log('🔑 发现已有登录态，尝试加载...');
      context = await browser.newContext({
        storageState: CONFIG.authFile,
      });
    } else {
      console.log('🔑 未找到登录态，将打开浏览器进行扫码登录');
      context = await browser.newContext();
    }

    const page = await context.newPage();

    // 访问书架页面
    await page.goto(`${CONFIG.baseUrl}/web/shelf`, { waitUntil: 'networkidle' });
    await sleep(2000);

    // 检查是否需要登录
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.log('\n⏳ 未登录，正在点击登录按钮...');

      // 尝试点击登录按钮
      const loginBtnSelectors = [
        'a:has-text("登录")',
        'button:has-text("登录")',
        '[class*="login"]',
        'text=登录',
      ];
      let clicked = false;
      for (const sel of loginBtnSelectors) {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          clicked = true;
          console.log('  已点击登录按钮，请扫码登录');
          break;
        }
      }
      if (!clicked) {
        console.log('  ⚠️ 未找到登录按钮，请手动点击登录');
      }

      // 截图确认扫码界面
      const loginScreenshot = path.join(CONFIG.outputDir, '.debug-login.png');
      await page.screenshot({ path: loginScreenshot, fullPage: false });
      console.log(`  📸 已截图保存到: ${loginScreenshot}`);
      console.log('\n   请在弹出的浏览器窗口中扫码登录');
      console.log('   登录成功后，脚本会自动继续\n');

      // 等待用户登录（通过检查页面内容变化）
      let attempts = 0;
      const maxAttempts = 120; // 最多等待约 4 分钟
      while (attempts < maxAttempts) {
        await sleep(2000);
        const nowLoggedIn = await isLoggedIn(page);
        if (nowLoggedIn) {
          console.log('\n✅ 登录成功！保存登录态...');
          await context.storageState({ path: CONFIG.authFile });
          break;
        }
        attempts++;
        process.stdout.write('.');
      }

      if (attempts >= maxAttempts) {
        console.log('\n❌ 登录超时，请重新运行脚本');
        await browser.close();
        process.exit(1);
      }
    } else {
      console.log('✅ 已登录');
    }

    // 获取书籍列表
    const books = await getShelfBooks(page);

    if (books.length === 0) {
      console.log('\n❌ 书架为空或未获取到书籍');
      await browser.close();
      process.exit(1);
    }

    console.log(`\n📚 共发现 ${books.length} 本书`);
    console.log('='.repeat(40));

    // 支持通过命令行参数限制提取数量: node extract-weread.js --limit=5
    const limitArg = process.argv.find(a => a.startsWith('--limit='));
    const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : books.length;
    const booksToExtract = books.slice(0, limit);

    console.log(`  本次提取: ${booksToExtract.length} 本${limit < books.length ? ` (共 ${books.length} 本)` : ''}`);
    console.log('='.repeat(40));

    // 逐本提取笔记
    let totalNotes = 0;
    for (const book of booksToExtract) {
      const notes = await extractBookNotes(page, book);
      totalNotes += notes.length;
      await sleep(CONFIG.delay);
    }

    console.log('\n' + '='.repeat(40));
    console.log(`✅ 完成！共提取 ${totalNotes} 条笔记`);
    console.log(`📁 输出目录: ${CONFIG.outputDir}`);

  } catch (error) {
    console.error('\n❌ 发生错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

// 运行
main();
