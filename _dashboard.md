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

- [ ] 标题是否符合 `YYYY-MM-DD-title.md` 格式
- [ ] 图片是否放入 `assets/img/posts/YYYYMMDD/` 目录
- [ ] 数学公式是否启用 `math: true`
- [ ] 描述(description)是否填写
- [ ] 本地预览是否正常 `bash tools/run.sh`

---

## 常用链接

- [CLAUDE.md](CLAUDE.md) - 项目配置指南
- [关于页面](_tabs/about.md)

