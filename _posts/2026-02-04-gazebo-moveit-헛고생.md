---
title: "Gazebo와 MoveIt2 연결 헛고생 기록"
date: 2026-02-04 21:00:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - ROS2
  - Gazebo
  - MoveIt2
  - UR5e
  - Robotiq
---

UR5e와 Robotiq를 Gazebo, RViz, MoveIt2에서 동시에 다루면서 겪은 연결 문제를 정리합니다. 화면에는 무언가 보이지만 실제 planning과 controller가 제대로 이어지지 않는 상태가 가장 헷갈렸습니다.

## 확인한 것

- ROS2 package build 순서
- launch file에서 불러오는 description과 controller 설정
- SRDF의 collision matrix
- RViz MotionPlanning plugin에서 인식되는 planning group

## 다음에 다시 보면 좋을 것

문제가 생기면 "모델이 뜨는가"보다 "MoveIt2가 어떤 planning group과 controller를 보고 있는가"를 먼저 확인하는 것이 좋겠습니다.
