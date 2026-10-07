---
title: "ACCA 자율주행 프로젝트 정리: ERP42와 ROS2"
date: 2026-05-27 09:10:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - ROS2
  - ERP42
  - Autonomous Driving
  - ACCA
---

[ACCA2026](https://github.com/libok03/ACCA2026)과 [ACCA_2025](https://github.com/libok03/ACCA_2025)는 ERP42 기반 자율주행 프로젝트를 진행하며 쌓은 코드베이스다. 팀 프로젝트 특성상 센서, 제어, 판단, 메시지 패키지가 서로 맞물려 있고, 단일 알고리즘보다 전체 시스템을 안정적으로 연결하는 일이 중요했다.

## 프로젝트 목적

핵심 목표는 ROS2 환경에서 ERP42 차량을 움직이기 위한 자율주행 파이프라인을 구성하는 것이다. README 기준으로 `adaptive_clustering_msgs` 같은 메시지 패키지를 먼저 빌드하고, 이후 전체 패키지를 `colcon build --symlink-install`로 올리는 흐름을 사용한다.

## 다룬 내용

- ROS2 워크스페이스 구조와 패키지 빌드 순서 정리
- 차량 제어와 주행 판단에 필요한 메시지 의존성 관리
- `mavros_msgs`, `nmea_msgs` 같은 외부 메시지 활용
- 팀 코드베이스에서 재현 가능한 실행 흐름 만들기

## 배운 점

자율주행 프로젝트는 알고리즘 하나가 잘 동작한다고 끝나지 않는다. 센서 입력, 좌표계, 메시지 타입, 실행 순서, launch 구성 중 하나만 틀어져도 전체가 멈춘다. 그래서 GitHub에는 코드만 남기고, 블로그에는 "어떤 순서로 문제를 좁혀갔는지"를 계속 남겨두는 편이 더 유용하다.

## 다음에 보강할 글

앞으로는 ACCA 프로젝트를 perception, planning, control, integration log로 나누어 더 자세히 정리할 계획이다.
