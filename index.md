---
layout: single
classes: wide
author_profile: false
permalink: /
---

<section class="home-hero">
  <div class="home-hero__copy">
    <p class="home-kicker">Robotics · ROS2 · Reinforcement Learning</p>
    <h1>기록을 모아 프로젝트가 보이게 만드는 공간</h1>
    <p>
      GitHub에서 진행한 자율주행, 로봇 제어, 강화학습 프로젝트와 시행착오를 블로그 글로 정리합니다.
      코드 저장소만으로는 놓치기 쉬운 맥락과 배운 점을 함께 남깁니다.
    </p>
    <div class="home-actions">
      <a class="btn btn--primary" href="/projects/">프로젝트 보기</a>
      <a class="btn btn--inverse" href="/dev/">개발일지 보기</a>
    </div>
  </div>
  <div class="home-hero__profile">
    <img src="/assets/images/bio-photo.jpg" alt="libok03 profile">
    <dl>
      <div><dt>Focus</dt><dd>Autonomous Driving</dd></div>
      <div><dt>Stack</dt><dd>ROS2, C++, Python</dd></div>
      <div><dt>Now</dt><dd>ERP42, UR5e, RL</dd></div>
    </dl>
  </div>
</section>

<section class="home-section">
  <div class="section-heading">
    <p class="home-kicker">Featured</p>
    <h2>GitHub에서 끌어온 대표 프로젝트</h2>
  </div>
  <div class="project-grid">
    {% for project in site.data.projects limit: 6 %}
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
    <h2>카테고리 바로가기</h2>
    <div class="category-links">
      <a href="/projects/">프로젝트 아카이브</a>
      <a href="/dev/">개발일지</a>
      <a href="/travel/">여행</a>
      <a href="/food/">맛집/카페</a>
    </div>
  </aside>
</section>
