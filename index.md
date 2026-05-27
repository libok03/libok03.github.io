---
layout: single
classes: wide home-page
author_profile: false
permalink: /
---

<section class="home-hero">
  <div class="home-hero__copy">
    <p class="home-kicker">Robotics Field Notes</p>
    <h1>로봇, 자율주행, 강화학습을 직접 부딪히며 정리하는 기술 노트</h1>
    <p>
      공개 GitHub 프로젝트와 개발 과정에서 만난 시행착오를 문제, 시도, 해결, 배운 점으로 나눠 기록합니다.
      저장소만으로는 보이지 않는 판단 과정과 실험의 맥락을 블로그에 남깁니다.
    </p>
    <div class="home-actions">
      <a class="btn btn--primary" href="/projects/">프로젝트 보기</a>
      <a class="btn btn--inverse" href="/dev/">개발일지 보기</a>
      <a class="btn" href="/write/">글쓰기 작업대</a>
    </div>
  </div>
  <div class="home-hero__panel" aria-label="current focus">
    <img src="/assets/images/bio-photo.jpg" alt="libok03 profile">
    <dl>
      <div><dt>Focus</dt><dd>Autonomous Driving</dd></div>
      <div><dt>Stack</dt><dd>ROS2, C++, Python</dd></div>
      <div><dt>Now</dt><dd>ERP42, UR5e, RL</dd></div>
    </dl>
  </div>
</section>

<section class="home-section home-signal">
  <article>
    <strong>10+</strong>
    <span>Public projects archived</span>
  </article>
  <article>
    <strong>ROS2</strong>
    <span>Robotics and autonomous driving notes</span>
  </article>
  <article>
    <strong>RL</strong>
    <span>PPO, DQN, control experiments</span>
  </article>
</section>

<section class="home-section">
  <div class="section-heading">
    <p class="home-kicker">Featured Projects</p>
    <h2>대표 프로젝트</h2>
    <p>자율주행, 로봇 제어, 강화학습, 최적화 실험을 공개 가능한 프로젝트 중심으로 정리했습니다.</p>
  </div>
  <div class="project-grid">
    {% assign public_projects = site.data.projects | where: "status", "Public" %}
    {% for project in public_projects limit: 6 %}
      <article class="project-card">
        <p class="project-card__type">{{ project.type }}</p>
        <h3><a href="{{ project.repo }}">{{ project.name }}</a></h3>
        <p>{{ project.summary }}</p>
        <ul class="project-tags">
          {% for tag in project.tags limit: 4 %}
            <li>{{ tag }}</li>
          {% endfor %}
        </ul>
      </article>
    {% endfor %}
  </div>
</section>

<section class="home-section process-band">
  <div class="section-heading">
    <p class="home-kicker">Writing System</p>
    <h2>글은 이렇게 쌓습니다</h2>
  </div>
  <div class="process-grid">
    <article>
      <span>01</span>
      <h3>문제 상황</h3>
      <p>무엇을 만들려 했고 어디서 막혔는지 먼저 남깁니다.</p>
    </article>
    <article>
      <span>02</span>
      <h3>시도와 판단</h3>
      <p>코드보다 중요한 선택의 이유와 실험 흐름을 정리합니다.</p>
    </article>
    <article>
      <span>03</span>
      <h3>해결과 다음 단계</h3>
      <p>동작 결과, 배운 점, 다음에 볼 문제를 이어서 기록합니다.</p>
    </article>
  </div>
</section>

<section class="home-section home-split">
  <div>
    <div class="section-heading">
      <p class="home-kicker">Latest Notes</p>
      <h2>최근 개발 글</h2>
    </div>
    <ol class="home-timeline">
      {% assign dev_posts = site.posts | where_exp: "post", "post.categories contains 'Dev Log'" %}
      {% for post in dev_posts limit: 5 %}
        <li>
          <time datetime="{{ post.date | date_to_xmlschema }}">{{ post.date | date: "%Y.%m.%d" }}</time>
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        </li>
      {% endfor %}
    </ol>
  </div>
  <aside class="home-panel">
    <p class="home-kicker">Archive Map</p>
    <h2>바로가기</h2>
    <div class="category-links">
      <a href="/projects/">프로젝트 아카이브</a>
      <a href="/dev/">개발일지</a>
      <a href="/travel/">여행</a>
      <a href="/food/">맛집/카페</a>
      <a href="/tools/blog-writer.html">글쓰기 도구</a>
    </div>
  </aside>
</section>
