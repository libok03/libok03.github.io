---
title: "강화학습 프로젝트 묶음: CartPole, PPO Swing-Up, Atari DQN"
date: 2026-05-27 09:30:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - Reinforcement Learning
  - Q-Learning
  - PPO
  - DQN
  - PyTorch
---

강화학습 저장소는 난이도와 목적이 조금씩 다르다. [CartPole_RL](https://github.com/libok03/CartPole_RL)은 기본기를 확인하는 Q-Learning 실험이고, [PPO_SwingUp](https://github.com/libok03/PPO_SwingUp)은 연속 제어 문제를 다루며, [Atari_DQN_Agent](https://github.com/libok03/Atari_DQN_Agent)는 이미지 기반 deep RL 구조를 다룬다.

## CartPole_RL

CartPole은 상태와 행동이 비교적 단순해서 강화학습 루프를 직접 이해하기 좋다. `agent.py`에서 policy logic을 다루고, `train.py`에서 학습 loop와 hyperparameter scheduling을 맡는 구조다. episode별 영상과 learning curve를 남겨 학습이 어떻게 안정되는지 확인할 수 있게 했다.

## PPO_SwingUp

PPO Swing-Up은 더 복잡한 제어 문제다. policy entropy, value loss, episodic return 같은 로그를 보면서 학습이 안정적으로 진행되는지 추적한다. 단순히 reward가 올랐는지보다, continuous action space에서 제어가 어떻게 수렴하는지를 보는 것이 중요하다.

## Atari_DQN_Agent

Atari DQN은 raw frame을 다루기 때문에 preprocessing, replay buffer, target network, epsilon-greedy policy가 모두 중요하다. CartPole보다 환경이 훨씬 크고, neural network가 Q-function을 근사한다는 점에서 deep RL의 기본 구조를 확인하기 좋다.

## 연결되는 관심사

이 강화학습 실험들은 로봇 제어와도 이어진다. 실제 로봇이나 차량 제어에 RL을 바로 적용하기는 어렵지만, reward 설계, 안정성, sim-to-real gap을 이해하는 데 좋은 기반이 된다.
