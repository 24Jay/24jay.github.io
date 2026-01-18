---
title: 扩散模型
date: 2026-01-17 22:00:00
categories:
  - AI
tags:
  - diffusion
math: true
description:
pin: false
---
## guide line
- 热力学扩散模型
- DDPM
- DDIM
- Flow Matching


[B站：扩散模型基础](https://www.bilibili.com/video/BV1fmHpzNE9s/?spm_id_from=333.1007.top_right_bar_window_custom_collection.content.click&vd_source=b3753b4eab4ba41ba53ff4b91f1e8156)


## 1. 扩散模型基础

**扩散模型**：模拟热力学扩散过程来构建的图片生成式神经网络模型。

#### 高维空间中图片的表示
高纬向量空间中图片的表示：每一张图片对应的就是高维向量空间中的一个点。


#### 郎之万动力学方程Langevin Equation
郎之万动力学方程（Langevin Equation）是 1908 年由保罗・朗之万提出的随机微分方程，核心是在牛顿第二定律中引入阻尼力与随机涨落力，用于描述布朗运动等含随机因素的系统动力学，是连接微观随机过程与宏观统计规律的关键工具。


## 2.使用非平衡热力学的深度无监督学习 
>Deep Unsupervised Learning using Nonequilibrium Thermodynamics： https://readpaper.com/pdf-annotate/note?pdfId=4518058921456984065&noteId=3203395231270102272



## 3. DDPM：去噪扩散概率模型
> Denoising Diffusion Probabilistic Models: https://readpaper.com/pdf-annotate/note?pdfId=635840581123977216&noteId=3154073192021292800



## 4. DDIM：去噪扩散隐式模型


## 5. Flow Matching：流匹配
> 
