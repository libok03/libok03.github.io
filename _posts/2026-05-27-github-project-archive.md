---
title: "GitHub 프로젝트 아카이브: 지금까지 진행한 것들"
date: 2026-05-27 09:00:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - GitHub
  - Portfolio
  - Project Archive
---

GitHub에 있는 저장소들을 블로그에서 볼 수 있도록 한 번 정리했다. 코드 저장소는 결과물과 파일 구조를 보여주기에는 좋지만, 왜 만들었고 어떤 시행착오가 있었는지는 잘 드러나지 않는다. 그래서 이 블로그에는 저장소별 README를 그대로 옮기는 대신, 프로젝트의 목적과 내가 얻은 경험을 중심으로 묶어두려고 한다.

## 큰 흐름

| 영역 | 저장소 | 핵심 주제 |
| --- | --- | --- |
| 자율주행 | [ACCA2026](https://github.com/libok03/ACCA2026), [ACCA_2025](https://github.com/libok03/ACCA_2025) | ERP42 기반 ROS2 자율주행 스택 |
| 로봇 매니퓰레이션 | [ros2_SimRealRobotControl](https://github.com/libok03/ros2_SimRealRobotControl) | UR5e, Robotiq, Gazebo, MoveIt2 pick-and-place |
| 강화학습 | [CartPole_RL](https://github.com/libok03/CartPole_RL), [PPO_SwingUp](https://github.com/libok03/PPO_SwingUp), [Atari_DQN_Agent](https://github.com/libok03/Atari_DQN_Agent) | Q-Learning, PPO, DQN 실험 |
| 연구 실험 | [HW-NAS-YOLO](https://github.com/libok03/HW-NAS-YOLO) | hardware-aware NAS와 YOLO 탐색 |
| 웹/기타 | [irol-lab-website](https://github.com/libok03/irol-lab-website), [dinner_project](https://github.com/libok03/dinner_project), [waterpray](https://github.com/libok03/waterpray) | 웹사이트, 작은 앱, 프로토타입 |

## 공개 저장소 중심으로 정리하기

블로그에는 공개 저장소를 중심으로 정리한다. 각 글은 저장소 링크만 나열하는 대신, 프로젝트를 시작한 이유와 구현 과정에서 배운 점을 남기는 방식으로 보강한다.

## 앞으로의 정리 방식

각 프로젝트 글은 다음 형식으로 계속 보강할 예정이다.

1. 프로젝트를 시작한 이유
2. 사용한 기술 스택
3. 구현하면서 막혔던 지점
4. 해결한 방법과 남은 문제
5. 다음에 다시 한다면 바꿀 설계

이렇게 쌓이면 블로그가 단순한 글 목록이 아니라, GitHub 활동 전체를 설명하는 기술 기록장이 된다.
