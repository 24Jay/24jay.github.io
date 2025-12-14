---
title: "Decision Transformer: Reinforcement Learning via Sequence Modeling"
date: 2025-12-13 12:00:00
categories:
  - AI
  - Robotics
tags:
  - VLA
  - RL
math: true
description: " A framework that abstracts RL as a sequence modeling problem."
pin: false
---
## 参考文档

> 论文地址：https://arxiv.org/abs/2106.01345


## 1. Abstract
Decision Transformer:
: A framework that abstracts RL as a sequence modeling problem.
: casts the problem of RL as conditional sequence modeling.
: simply outputs the optimal actions by leveraging a causally masked Transformer.

![Decision Transformer架构](assets/img/posts/20251213/decisionTransformer.png)
## 2. Introduction
- 替换传统的RL算法：modeling the joint distribution of the sequence of states, actions, and rewards



## 3. Method

### Trajectory representation:

自回归学习以下序列：
$$
\tau = (\hat{R_1},s_1,a_1,\hat{R_2},s_2,a_2,...,\hat{R_T},s_T,a_T,)
$$
但是并不直接使用reward，而是使用**returns-to-go**

$$
\hat{R_t} = \sum_{t'=t}^Tr_{t'}
$$


### Architecture: 

总共K个时间步的序列自回归预测，每个时间步包含3类token，因此总共是3K个token：

$$
	<\text{return-to-go}, state, action>
$$
- embedding layer：
	- 其他模态（linear layer for each modality）：将原始输入转换为embedding
	- 视觉输入：visual inputs is fed into a convolutional encoder instead of a linear layer.
- normalization layer:
- 时间步的embedding相加（与常规的positional embedding有所不同）
- attention layer

### Training：

···python


```python
# R , s , a , t : returns - to - go , states , actions , or timesteps # transformer : transformer with causal masking ( GPT ) # embed_s , embed_a , embed_R : linear embedding layers # embed_t : learned episode positional embedding # pred_a : linear action prediction layer 


# main model 
def DecisionTransformer (R , s , a , t ): 
	# compute embeddings for tokens 
	pos_embedding = embed_t ( t ) # per - timestep ( note : not per - token ) 
	s_embedding = embed_s ( s ) + pos_embedding  # state emb
	
	a_embedding = embed_a ( a ) + pos_embedding  # action emb
	
	R_embedding = embed_R ( R ) + pos_embedding  # reward-to-go emb
	# interleave tokens as ( R_1 , s_1 , a_1 , ... , R_K , s_K ) 
	input_embeds = stack ( R_embedding , s_embedding , a_embedding ) 
	
	# use transformer to get hidden states 
	hidden_states = transformer ( input_embeds = input_embeds ) 
	
	# select hidden states for action prediction tokens 
	a_hidden = unstack ( hidden_states ). actions 
	
	# predict action 
	return pred_a ( a_hidden )
	
	

# traning loop
for (R,s,a,t) in dataloader: # dims: (batch_size, K, dim)
	a_preds = DecisionTransformer (R , s , a , t ) 
	loss = mean (( a_preds - a )**2) # L2 loss for continuous actions 
	
	optimizer.zero_grad()
	loss.backward()
	optimizer.step() 
	

# evaluation loop 
target_return = 1 # for instance , expert - level return
R , s , a , t , done = [ target_return ] , [ env . reset ()] , [] , [1] , False while not done : # autoregressive generation / sampling 
	# sample next action 
	action = DecisionTransformer (R , s , a , t )[ -1] # for cts actions 
	new_s , r , done , _ = env.step(action) 
	
	# append new tokens to sequence 
	R = R + [ R [ -1] - r ] # decrement returns - to - go with reward 
	s , a , t = s + [ new_s ] , a + [ action ] , t + [ len ( R )] 
	R , s , a , t = R [ - K :] , ... # only keep context length of K# evaluation loop
```



## 4. Evaluations on Offline RL Benchmarks

