---
layout: single
author_profile: true
title: ""
permalink: /
---

<section class="home-hero">
  <h1>기록하고, 만들고, 탐험하는 공간</h1>
  <p>
    개발 삽질 노트부터 여행 기록, 맛집 아카이브까지
    <strong>libok03</strong>의 실제 경험을 한곳에 모았습니다.
  </p>
  <div class="home-quick-links">
    <a class="home-chip" href="/dev/">💻 개발일지</a>
    <a class="home-chip" href="/travel/">✈️ 여행</a>
    <a class="home-chip" href="/food/">☕️ 맛집/카페</a>
    <a class="home-chip" href="/about/">👋 소개</a>
  </div>
</section>

<section class="home-grid">
  <article class="home-card">
    <h2>최근 개발 글</h2>
    <ul>
      {% assign dev_posts = site.posts | where_exp: "post", "post.categories contains 'Dev Log'" | slice: 0, 4 %}
      {% for post in dev_posts %}
      <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
      {% endfor %}
    </ul>
    <a class="home-more" href="/dev/">개발일지 전체 보기 →</a>
  </article>

  <article class="home-card">
    <h2>최근 여행 글</h2>
    <ul>
      {% assign trip_posts = site.posts | where_exp: "post", "post.categories contains 'Trip'" | slice: 0, 4 %}
      {% for post in trip_posts %}
      <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
      {% endfor %}
    </ul>
    <a class="home-more" href="/travel/">여행 글 전체 보기 →</a>
  </article>

  <article class="home-card">
    <h2>최근 맛집/카페 글</h2>
    <ul>
      {% assign food_posts = site.posts | where_exp: "post", "post.categories contains 'Cafe-Food'" | slice: 0, 4 %}
      {% for post in food_posts %}
      <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a></li>
      {% else %}
      <li>아직 글이 없어요. 곧 채워집니다 🙂</li>
      {% endfor %}
    </ul>
    <a class="home-more" href="/food/">맛집/카페 전체 보기 →</a>
  </article>
</section>

<section class="home-timeline">
  <h2>최신 글 5개</h2>
  <ol>
    {% for post in site.posts limit:5 %}
    <li>
      <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      <span>{{ post.date | date: "%Y.%m.%d" }}</span>
    </li>
    {% endfor %}
  </ol>
</section>
