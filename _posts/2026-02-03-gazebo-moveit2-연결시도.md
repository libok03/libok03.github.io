---
title: "UR5e + Robotiq MoveIt2 연결 시도: 4시간 삽질 기록"
date: 2026-02-03 17:00:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - ROS2
  - MoveIt2
  - Gazebo
  - UR5e
  - Robotiq
---

Gazebo에서 UR5e와 Robotiq 그리퍼를 띄우고 MoveIt2와 연결하려고 했던 첫 시행착오 기록입니다. URDF, SRDF, controller, RViz 설정이 서로 맞아야 해서 생각보다 오래 걸렸습니다.

## 막혔던 지점

- Gazebo에는 모델이 보이지만 MoveIt2 planning scene과 연결이 어색함
- URDF와 SRDF 설정이 서로 맞지 않아 충돌 설정을 계속 확인해야 함
- Robotiq gripper 모델과 controller 연결 흐름이 명확하지 않음

## 배운 점

로봇 시뮬레이션은 하나의 파일만 고쳐서 해결되는 경우가 거의 없었습니다. 모델, joint, controller, launch, planning scene을 한 번에 보는 습관이 필요했습니다.
