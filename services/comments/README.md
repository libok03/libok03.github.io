# Anonymous comments server

블로그는 GitHub Pages에 유지하고, 이 디렉터리만 Vercel 프로젝트로 배포합니다.
Waline의 공식 서버 템플릿을 기반으로 패키지 버전을 고정했습니다.

기본 설정은 로그인 없는 익명 댓글, 닉네임 선택, 60초 간격 제한, 관리자 승인 후 공개입니다.
댓글 입력창은 이메일·홈페이지 주소를 요구하지 않고 위치·브라우저 정보를 공개하지 않습니다.
IP 등 서버에서 처리하는 운영 정보가 전혀 수집되지 않는다는 뜻은 아닙니다.

## 연결 순서

1. Vercel에서 이 저장소를 연결하고 Root Directory를 `services/comments`로 설정합니다.
2. PostgreSQL 저장소를 연결하고 공식 Waline SQL로 테이블을 초기화합니다.
3. DB 연결 정보와 임의의 `JWT_TOKEN`은 Vercel 환경 변수에만 등록합니다.
4. 운영 서버 주소를 `SERVER_URL`에, 블로그와 댓글 서버의 호스트를 `SECURE_DOMAINS`에 등록합니다.
5. 서버를 재배포하고 `/ui/register`에서 소유자의 관리자 계정을 먼저 생성합니다.
6. 서버와 관리자 계정이 준비되면 `assets/comments-config.json`에 `serverURL`을 넣고 `enabled`를 `true`로 바꿉니다.
7. main에 커밋하면 블로그에 반영됩니다.

서버 연결 전에는 사이트에 동작하지 않는 댓글 입력창을 표시하지 않습니다.
초안은 발행하지 않고, 댓글 생성 확인은 실제 게시글에서 진행합니다.
서버 관리자 등록과 DB 서비스 연결에는 소유자 계정의 로그인이 필요합니다.
환경 변수와 DB 비밀번호는 Git에 넣지 않습니다.

- [공식 Vercel 배포 안내](https://waline.js.org/en/guide/deploy/vercel.html)
- [환경 변수 안내](https://waline.js.org/en/reference/server/env.html)
- [공식 PostgreSQL 초기화 SQL](https://github.com/walinejs/waline/blob/main/assets/waline.pgsql)

