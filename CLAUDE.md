# CLAUDE.md

本文件为 Claude Code (claude.ai/code) 提供在此仓库中工作时的指导。

## 项目概述

这是一个基于 Jekyll 的个人博客，使用 [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy) 主题，部署在 GitHub Pages 上。博客内容主要聚焦于 AI、强化学习和机器人等技术领域。

## 开发命令

### 本地开发

```bash
# 运行 Jekyll 服务器并开启实时重载（开发模式）
bash tools/run.sh

# 以生产模式运行
bash tools/run.sh -p

# 绑定到指定主机
bash tools/run.sh -H 0.0.0.0
```

### 构建与测试

```bash
# 构建站点并运行 html-proofer 验证
bash tools/test.sh

# 使用指定配置构建
bash tools/test.sh -c "_config.yml,_config_local.yml"
```

### 手动命令

```bash
# 安装依赖
bundle install

# 本地启动服务
bundle exec jekyll serve -l

# 生产环境构建
JEKYLL_ENV=production bundle exec jekyll build
```

## 架构

### Jekyll 配置

- **_config.yml**: 使用 Chirpy 主题的 Jekyll 主配置文件
- **theme**: `jekyll-theme-chirpy`（以 gem 形式安装，版本 ~> 7.3）
- **url**: "https://24jay.github.io"
- **baseurl**: ""（空值，站点从根路径部署）

### 目录结构

- **_posts/**: Markdown 格式的博客文章。命名规范: `YYYY-MM-DD-title.md`
- **_tabs/**: 静态页面（关于、归档、分类、标签）
- **_data/**: YAML 数据文件（contact.yml、share.yml）
- **_plugins/**: 自定义 Jekyll 插件
- **assets/img/posts/**: 按日期组织的文章图片（YYYYMMDD 子目录）
- **_site/**: 生成的构建输出（已加入 gitignore）

### 关键文件

- **index.html**: 首页，使用 `layout: home`
- **_tabs/about.md**: 关于页面（修改此文件更新作者信息）
- **_plugins/posts-lastmod-hook.rb**: 从 git 历史自动设置 `last_modified_at`

### 文章 Front Matter

```yaml
---
title: "文章标题"
date: YYYY-MM-DD HH:MM:SS
categories: [分类1, 分类2]
tags: [标签1, 标签2]
math: true      # 启用数学公式渲染
description:    # SEO 描述
pin: false      # 置顶文章
image:
  path: /assets/img/posts/YYYYMMDD/image.png
  alt: 替代文本
---
```

### 图片组织方式

文章图片存储在 `assets/img/posts/YYYYMMDD/` 目录下，YYYYMMDD 与文章日期对应。示例：
- 文章: `_posts/2025-08-31-ppo.md`
- 图片: `assets/img/posts/20250831/ppo_1.png`

### 部署

- **平台**: GitHub Pages
- **工作流**: `.github/workflows/pages-deploy.yml`
- **触发条件**: 推送到 main/master 分支
- **构建**: Jekyll 生产环境
- **测试**: html-proofer 验证内部链接

## 自定义说明

- 头像: 在 _config.yml 中更新 `avatar` 路径（默认: `/assets/img/favicons/icon.jpg`）
- 社交链接: 在 _config.yml 的 `social.links` 下配置
- 评论: 在 _config.yml 中取消注释并配置（支持 disqus、utterances、giscus）
- 分析工具: 在 _config.yml 的 `analytics` 下配置
- PWA: 默认启用 (`pwa.enabled: true`)

## 故障排除

- 如果本地样式显示异常，检查 `baseurl` 是否配置正确
- 主题文件来自 gem；使用 `bundle info --path jekyll-theme-chirpy` 定位主题文件
- html-proofer 忽略外部链接；使用 `--disable-external` 参数
