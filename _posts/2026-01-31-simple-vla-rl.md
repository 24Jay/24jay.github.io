---
title: Simple VLA-RL
date: 2026-01-31 10:00:00
categories:
  - AI
tags:
  - VLA
math: true
description:
pin: false
---

- [SimpleVLA-RL](https://readpaper.com/pdf-annotate/note?pdfId=3017335060778541824&tab=copilot&noteId=3196855852258653952)


## 1. 研究背景

> Simple VLA-RL: scaling VLA Training via Reinforcement Learning: https://github.com/PRIME-RL/SimpleVLA-RL

**问题**：针对机器人领域VLA模型主要采用大规模预训练和有监督微调（supervised fine-tune）的方案，存在两个问题
- 样本效率：数据稀缺、高质量机器人轨迹采集成本高
- 泛化性问题：针对分布偏移（distribution shift）场景适应性差

**思路**：RL在推理大模型领域的成功能否复制应用到VLA模型？

**Simple VLA-RL**：
- 基于veRL（Volcano Engine Reinforcement Learning）
- VLA-specific trajectory sampling
- scalable parallelization
- multi-environment rendering
- 稀疏奖励：0/1奖励
- GRPO算法


## 2. 交互式VLA轨迹采样（Interactive VLA Rollout）
VLA和LLM在轨迹生成上存在根本不同：
- LLM生成：开环自回归，基于历史文本token预测下一个token，无真实环境反馈
	- 一次性生成完整的序列或逐token生成，无需等待外部响应
- VLA生成：闭环交互式生成
	- 保持LLM自回归生成能力的基础上，解决物理可行性、闭环、稀疏奖励、安全探索等一系列问题


## 3. VLA模型action decoding的三种方案
> VLA模型的三种动作解码策略，本质上是在**离散可控性**、**连续精度**、**计算效率**与**RL 兼容性**四个维度的权衡。
> 
> 当前主流趋势是：**离散 token 自回归 + 动作块优化**成为通用选择，而**扩散并行解码**则是未来提升推理速度与动作质量的重要方向，两种策略的融合（如 Discrete Diffusion VLA）可能成为下一代 VLA 模型的核心设计。
> 
$$
 a_t = Decoder(h_{\theta}(s_t))
$$
>
- 离散token
>- 连续值回归
>- 扩散模型
{: .prompt-tip}
#### 1. 基于离散token的自回归解码（Autoregressive Token-based Decoding）
- **原理**:
	- **动作token化**：连续动作空间离散化为固定大小的token词汇表，通过动作量化器（例如VQ-VAE、k-means）实现连续→离散映射
	- **自回归生成**：模型逐 token 预测下一个动作 token，基于历史 token 序列和当前环境状态，与 LLM 文本生成范式一致
	- **动作块（Action Chunk）优化**：一次生成 k 个动作 token（如 5-8 步），而非单步生成，平衡延迟与执行效率，是 VLA 规模化训练的关键设计
- **典型**：
	- OpenVLA-OFT、RT-2、π0 等主流 VLA 模型均采用此策略
	- 输出动作 token 概率分布，支持随机采样（探索）与贪心 / 束搜索（利用）两种模式
- **优势**：
	- RL兼容：适配PPO、GRPO等算法
	- 离散可控：token 化使动作生成可被精确控制，便于实现安全约束与探索增强策略
	- **VLM 原生兼容**：复用 LLM 自回归生成能力，最大化利用预训练视觉 - 语言先验知识
- **局限**：
	- **解码延迟**：逐 token 生成导致推理速度受限，需动作块优化提升效率
	- **量化误差**：离散化引入信息损失，可能影响动作精度
		  

#### 2. 连续值回归解码（Continuous Regression Decoding、 Deterministic Regression via MLPs）
- **原理**：
	- **直接回归**：模型输出连续动作值（如末端执行器的 Δx, Δy, Δz 位移），无需离散 token 化，通过回归头预测具体数值。
	-  **两种实现方式**：
		1. 纯回归：直接输出连续动作向量，使用 MSE 损失训练
		2. 加权期望：保留离散 token 分布，通过 softmax 加权平均计算连续动作值，兼顾分布特性与连续性
- **典型**：
	- ContinuousVLA、部分早期 VLA 模型采用此策略；适用于需要高精度控制的场景（如精密装配、微小物体操作）
- **优势**：
	1. **无量化误差**：直接输出连续动作，避免离散化导致的精度损失
	2. **推理高效**：无需 token 解码步骤，端到端延迟更低
	3. **动力学适配**：更贴合机器人连续控制本质，减少离散→连续转换开销
- **局限性**:
	1. **RL 适配复杂**：连续动作分布表示（如高斯）需额外设计，策略梯度计算更复杂
	2. **探索控制难**：连续空间探索需精心设计噪声注入机制，安全性保障更具挑战
	3. **与 VLM 预训练脱节**：无法直接复用 LLM 离散生成能力，需额外适配


#### 3. 基于扩散模型（diffusion-based denoising on latent states）
- **原理**：借鉴扩散模型思想，从随机噪声动作序列开始，通过多轮迭代逐步细化为可行动作轨迹
	- **离散扩散**：在 token 空间进行迭代细化，保持 VLM 离散接口，如 Discrete Diffusion VLA
	- **连续扩散**：直接在连续动作空间优化，如 CogACT、Diffusion Policy 等模型
	- **双向注意力**：采用 BERT-style 双向编码，支持并行生成所有动作 token，突破自回归瓶颈
- **关键优势**:
	1. **动作质量**：迭代细化过程显著提升动作轨迹的物理可行性与平滑性
	2. **并行效率**：双向注意力支持一次性生成完整动作序列，推理速度大幅提升（可达自回归的 4 倍）
	3. **容错能力**：多轮细化允许模型修正错误预测，鲁棒性更强
- **局限性**:
	1. **计算成本**：多轮迭代导致训练 / 推理计算量增加，对硬件要求更高
	2. **RL 集成难**：扩散过程的随机性与 RL 的确定性优化目标存在冲突
	3. **延迟权衡**：并行生成虽降低延迟，但多轮细化可能抵消部分收益






