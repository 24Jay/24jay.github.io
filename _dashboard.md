# 博客管理仪表盘

> 使用 Dataview 插件（如已安装）可自动统计文章

## 快速操作

- [新建文章](_templates/post.md)
- [新建草稿](_templates/draft.md)

---

## 文章统计

### 已发布文章

```dataview
TABLE date, categories, description
FROM "_posts"
SORT date DESC
```

### 草稿箱

```dataview
TABLE date, file.mtime as "最后修改"
FROM "_drafts"
SORT file.mtime DESC
```

### 按分类统计

```dataview
TABLE length(rows) as "文章数"
FROM "_posts"
GROUP BY categories
```

### 按标签统计

```dataview
TABLE length(rows) as "文章数"
FROM "_posts"
FLATTEN tags
GROUP BY tags
```

---

## 写作检查清单

### 文件命名规范
```
_posts/YYYY-MM-DD-article-title.md
```
- ✅ 日期前缀: `2026-04-12-`
- ✅ 小写英文: `claude-code-guide`
- ✅ 连字符连接: `-`
- ❌ 避免空格、大写、中文字符

### 发布前检查
- [ ] 文件名格式: `YYYY-MM-DD-article-title.md`
- [ ] 图片放入: `assets/img/posts/YYYYMMDD/`
- [ ] 数学公式启用: `math: true`
- [ ] 描述(description)已填写
- [ ] 本地预览正常: `bash tools/run.sh`

---

## 常用链接

- [CLAUDE.md](CLAUDE.md) - 项目配置指南
- [关于页面](_tabs/about.md)

