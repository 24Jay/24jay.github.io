---
title: DeepMind强化学习综述
date: 2025-11-20 21:00:00
categories:
  - AI
tags:
  - RL
math: true
---
## 1. Introduction

#### 折扣因子
「强化学习交互过程存在终止风险」:

> 
 **折扣因子$\gamma$的理解：**\
 它本质是对 “交互能否持续” 的信念量化——交互持续到下一步的概率为$\gamma$，而非单纯的 “未来收益打折”（这是其表象）\
 In general, the discount factor reflects the assumption that there is a probability of 1 − γ that the interaction will end at the next step。
 {: .prompt-info}


#### 状态和状态价值


p