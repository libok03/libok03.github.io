---
title:  "블로그 사용법 (글쓰기, 사진 넣기)"
categories: 
  - Dev Log
tags:
  - Guide
  - Help
toc: true
---

# 블로그 글 작성 가이드

이 블로그는 **마크다운(Markdown)** 문법을 사용하여 글을 작성합니다.
간단한 규칙만 알면 누구나 쉽게 멋진 글을 쓸 수 있습니다.

## 1. 글 작성 준비
`_posts` 폴더 안에 새로운 파일을 만드세요.
파일 이름은 반드시 **`연도-월-일-제목.md`** 형식이어야 합니다.
예시: `2026-02-03-my-first-trip.md`

## 2. 머리말 (Front Matter) 작성하기
파일의 맨 윗부분에 아래 내용을 복사해서 붙여넣고 수정하세요.

```yaml
---
title:  "글 제목을 여기에 적으세요"
categories: 
  - Trip  # 카테고리: Dev Log, Trip, Cafe-Food 중 선택
tags:
  - 태그1
  - 태그2
---
```

## 3. 사진 넣기
사진을 넣으려면 외부 이미지 주소를 사용하거나, 이미지를 `assets/images/` 폴더에 넣고 아래처럼 작성하세요.

**외부 이미지 사용 시:**
```markdown
![이미지 설명](https://example.com/image.jpg)
```

**내부 이미지 사용 시:**
```markdown
![내 여행 사진](/assets/images/my-photo.jpg)
```

## 4. 글 꾸미기 (마크다운 기초)

### 제목
```markdown
# 큰 제목
## 중간 제목
### 작은 제목
```

### 강조
```markdown
**굵은 글씨**
*기울인 글씨*
```

### 목록
```markdown
- 목록 1
- 목록 2
  1. 순서 있는 목록
  2. 순서 있는 목록
```

### 링크
```markdown
[구글 바로가기](https://google.com)
```

## 5. 저장 및 업로드
글을 다 썼으면 저장하고, 터미널에서 아래 명령어로 업로드합니다.

```bash
git add .
git commit -m "새로운 글 작성"
git push
```

이제 블로그에 접속하셔서 확인해보세요!
