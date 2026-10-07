---
title: "UR5e + Robotiq pick-and-place: Gazebo에서 MoveIt2까지"
date: 2026-05-27 09:20:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - ROS2
  - UR5e
  - Robotiq
  - MoveIt2
  - Gazebo
---

[ros2_SimRealRobotControl](https://github.com/libok03/ros2_SimRealRobotControl)는 UR5e 매니퓰레이터와 Robotiq 2F-85 그리퍼를 이용해 Gazebo 시뮬레이션부터 MoveIt2 motion planning, pick-and-place 실행까지 연결해보는 프로젝트다.

## 핵심 구성

- `Universal_Robots_ROS2_Driver`: UR 로봇 드라이버와 MoveIt 설정 기반
- `ros2_robotiq_gripper`: Robotiq 그리퍼 description, controller, driver 패키지
- `ros2srrc_ur5e`: Gazebo world와 UR5e MoveIt2 설정
- `ros2srrc_execution`: planning scene과 pick-and-place logic 실행 노드
- `simulation.sh`, `pick_and_place.sh`: 실행 흐름을 묶어주는 스크립트

## 왜 중요한가

이 프로젝트는 "로봇 모델이 보인다"에서 끝나지 않고, 충돌 객체와 경로 계획, 그리퍼 동작, 목표 물체 접근까지 하나의 파이프라인으로 묶는 데 초점이 있다. URDF, SRDF, controller, Gazebo plugin, MoveIt2 planning scene이 서로 맞아야 하므로 디버깅 포인트도 많다.

## 블로그에 남길 포인트

기존 개발일지에 남긴 UR5e + Robotiq 시행착오를 이 저장소와 연결하면 좋다. 특히 SRDF 충돌 설정, Gazebo와 RViz 상태 불일치, gripper controller 연결 문제는 같은 문제를 다시 만났을 때 바로 찾아볼 수 있는 기록이 된다.
