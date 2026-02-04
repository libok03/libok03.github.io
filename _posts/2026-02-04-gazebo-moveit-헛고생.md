---
title:  "어제에 이어서 오늘도 개 헛고생을 했다"
categories: 
  - Dev Log
tags:
  - ROS2
  - Gazebo
  - MoveIt2
  - UR5e
  - Robotiq
---

ㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠㅠ 샤갈
어제에 이어서 오늘도 개 헛고생을 했다.
어느정도 srdf나 urdf에 대해 이해했다고 생각했는데 gazebo 이놈이 너무 문제다.... 오늘은 반드시 gazebo와 moveit을 연결하겠다는 의지로 컴퓨터를 켰다. 기존 UR5e 로봇과, Robotiq 2F-85 Xacro를 가지고 와서 잇고, srdf와 잇는 것까지는 매우 수월하게 진행되었고 이거 되는것 아니냐는 기대감에 부풀어 있었으나, 결과는 그렇지 않았다. 

## 1. 작업 내용 및 발생한 에러
먼저 robotiq가 ros2 galactic용으로 작성되어있어서 브랜치로 꺼내오고, 인터페이스도 rviz api랑 안맞아서 다시 만들었다. 이렇게 진행은 잘 됐는데, 드디어 빌드하고 런치를 했으나, gazebo가 안틀어진다... 샤갈... dll파일이 로드가 안되는거 같아서 launch 파일에서 명시적으로 다시 고치고, 빌드 했는데, 이제는 rviz도 안된다... 오늘도 한 3시간 만진거같은데 슬프다. 

## 2. URDF, SRDF와 Gazebo 연동 분석
일단 gazebo는 시각화를 해야하기 때문에 매쉬와 같은 파일이 필요하다. 기본적으로는 sdf파일을 지원한다고 하는데, moveit이랑 연동하려면 왠만해서 URDF파일이 좋다고 한다. 그리고 기하학적으로 매쉬간 충돌을 무시할수 있게 해주는 등의 관계를 명시해주는 곳이 SRDF, 여기가 moveit이 쓰는 파일이다. 



moveit은 이 두개 파일을 받아서 기획을 해주는데 이때 yaml파일을 생성해서 이를 설정해 줄 수 있다고 한다. 보통은 URDF나 Xacro파일을 따로 패키지로 만들어 놔두고 moveit패키지에서 참조하거나 gazebo 패키지에서 변경하는듯하다. (찾아보니까 대부분의 깃헙이 이런식으로 되어있다.) 

## 3. 남은 의문점 및 향후 계획
여기까지는 내가 아는 내용들 같은데 이제 도대체 URDF가 Gazebo랑 연결되지 않는건지, 이러면서 moveit이랑은 연결되는건지 어제는 왜 안됬는지 모르겠다. 저녁 먹으면서 머리식히고, 다시 시도해봐야겠다.

```bash
git add .
git commit -m "Fix: Gazebo and Rviz connection troubleshooting"
git push