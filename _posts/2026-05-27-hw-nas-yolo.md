---
title: "HW-NAS-YOLO: 자율주행 edge 환경을 위한 모델 탐색"
date: 2026-05-27 09:40:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - YOLO
  - NAS
  - Autonomous Driving
  - Edge AI
  - TensorRT
---

[HW-NAS-YOLO](https://github.com/libok03/HW-NAS-YOLO)는 자율주행 edge 환경에서 객체 탐지 모델의 정확도와 지연 시간 사이의 균형을 찾기 위한 hardware-aware NAS 프로젝트다. 목표는 단순히 mAP가 높은 모델을 찾는 것이 아니라, 실제 하드웨어에서 latency까지 고려한 Pareto optimal 구조를 찾는 것이다.

## 핵심 아이디어

- YOLO11n 기반 search space 구성
- `C2f`, `C3k2`, `GhostConv` 같은 block 선택을 genome으로 표현
- SE, CBAM attention module 삽입 여부 탐색
- Ray 기반 asynchronous multi-fidelity evaluation
- Random Forest 기반 latency predictor와 active learning
- NSGA-II를 이용한 multi-objective optimization

## 구조

저장소는 flat structure로 구성되어 있다. `main_loop.py`가 전체 NAS pipeline을 실행하고, `evolution_engine.py`가 NSGA-II와 hypervolume 계산을 맡는다. `multi_fidelity_evaluator.py`는 Ray 기반 병렬 평가를 담당하고, `latency_predictor.py`는 latency 예측과 replay buffer를 관리한다.

## 왜 블로그에 따로 남기는가

NAS 프로젝트는 코드만 보면 전체 설계 의도가 한눈에 들어오지 않는다. 탐색 공간을 왜 그렇게 잡았는지, multi-fidelity 평가를 왜 넣었는지, 실제 hardware latency를 어디까지 믿을 수 있는지 같은 질문이 더 중요하다. 이 글은 그 설계 맥락을 블로그에 남기기 위한 첫 정리다.
