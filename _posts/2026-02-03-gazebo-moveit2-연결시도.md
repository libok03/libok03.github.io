---
title:  "UR5e + Robotiq MoveIt2 연동 삽질... 4시간 날리고 깨달은 점"
categories: 
  - Dev Log
tags:
  - ROS2
  - MoveIt2
  - Gazebo
  - UR5e
  - 트러블슈팅
---

오늘은 진짜 역대급 삽질을 했다. Gazebo랑 MoveIt2 연결해서 Rviz2에 띄우려고 시작했는데, 4시간 동안 화면만 쳐다보다 끝날 줄이야... 

## 1. 시작은 창대했으나... (URDF, SRDF 준비)

Gazebo에 로봇 띄우려면 **URDF**가 필요하고, MoveIt에 연결하려면 **SRDF**가 필수라고 해서 작업을 시작했다. 로봇은 국룰 조합인 **UR5e**에 **Robotiq** 앤드 이펙터. 

원래는 `MoveIt Setup Assistant` 켜서 클릭 몇 번 하면 SRDF가 뚝딱 나와야 하는데, 내 컴퓨터 사양이 진짜... 똥컴이라 그런지 실행조차 안 된다. 여기서부터 1차 빡침. 결국 포기하고 그냥 되는대로 잼민이(AI)한테 SRDF 만들어달라고 던져줬다.

## 2. [ERROR] Unexpected type for parameter value None

그렇게 만든 URDF랑 SRDF를 한 패키지에 넣고 예제 코드 살짝 변형해서 띄우려는데 바로 에러가 터졌다.

> `[ERROR] [launch]: Caught exception in launch: Unexpected type for parameter value None`

진짜 어이가 없어서... 찾아보니까 해결 방법도 딱히 없단다. 

### 데이터 흐름 분석 (왜 None이 떴을까?)
1. **Input**: Launch 파일이 `xacro` 명령어를 실행해서 로봇 모델을 불러옴.
2. **Logic**: `robot_description` 변수에 파일 내용을 담아야 하는데, 경로가 꼬였거나 파일이 비어있어서 **None** 값이 전달됨.
3. **Output**: 파라미터에 `None`이 들어가니까 로드 노드가 뻗어버리는 구조.

결국 런치 파일이랑 경로들 다 하나하나 디벼보면서 겨우 고쳤다. SRDF가 MoveIt에 드디어 연결되길래 이제 끝났다 싶었는데...

## 3. Gazebo는 왜 안 켜지는데?

SRDF 연결 성공하자마자 이번엔 Gazebo가 안 켜진다. 한 4시간 만졌나? 진짜 화나서 모니터 부술 뻔했다. 

현업 용어로 따지면 이건 **Controller Manager랑 하드웨어 인터페이스 간의 핸드셰이킹 실패**다. 
- **데이터 흐름**: `MoveIt (Command)` -> `Controller Manager` -> `Gazebo Plugin`.
- Gazebo가 로드될 때 `ros2_control` 플러그인이 로봇 관절 데이터를 제대로 못 긁어오니까 전체 프로세스가 데드락(Deadlock)에 걸린 상태인 것 같다.

## 4. 결론 및 저장

오늘의 교훈: 툴이 안 되면 노가다라도 해야 하는데, 그 노가다도 데이터 흐름을 모르면 답이 없다. 4시간 삽질하고 아직 Gazebo는 못 띄웠지만, 일단 런치 파일이랑 SRDF 구조는 마스터했으니 내일은 무조건 띄운다.
