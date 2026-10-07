---
title: "블로그 사용법: 글쓰기와 이미지 넣기"
categories:
  - Dev Log
tags:
  - Guide
  - Markdown
toc: true
---

# 블로그 글 작성 가이드

이 블로그는 Markdown 문법으로 글을 작성합니다. 기본 규칙만 맞추면 Jekyll이 자동으로 페이지를 만들어줍니다.

## 1. 글 파일 만들기

새 글은 `_posts` 폴더에 만듭니다. 파일명은 아래 형식을 사용합니다.

```text
YYYY-MM-DD-post-title.md
```

예시는 다음과 같습니다.

```text
2026-05-27-my-project-log.md
```

## 2. Front Matter 작성

파일 맨 위에는 글 정보를 적습니다.

```yaml
---
title: "글 제목"
date: 2026-05-27 12:00:00 +0900
layout: single
categories:
  - Dev Log
tags:
  - ROS2
  - Project
---
```

카테고리는 주로 `Dev Log`, `Trip`, `Cafe-Food`를 사용합니다.

## 3. 이미지 넣기

이미지는 `assets/images/` 폴더에 넣고 아래처럼 연결합니다.

```markdown
![이미지 설명](/assets/images/my-photo.jpg)
```

외부 이미지 주소도 사용할 수 있습니다.

```markdown
![이미지 설명](https://example.com/image.jpg)
```

## 4. 자주 쓰는 Markdown

```markdown
# 큰 제목
## 중간 제목

**굵게**
*기울임*

- 목록 1
- 목록 2

[링크 텍스트](https://example.com)
```

## 5. 업로드

글을 작성한 뒤에는 변경사항을 커밋하고 push합니다.

```bash
git add .
git commit -m "새 블로그 글 작성"
git push
```
