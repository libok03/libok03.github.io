---
title: "프로젝트"
layout: single
permalink: /projects/
author_profile: true
classes: wide
---

GitHub에 흩어져 있던 공개 프로젝트를 주제별로 정리했습니다. 각 프로젝트는 문제 상황, 구현 과정, 막혔던 지점, 배운 점을 블로그 글로 이어서 정리합니다.

<div class="project-grid project-grid--archive">
  {% assign public_projects = site.data.projects | where: "status", "Public" %}
  {% for project in public_projects %}
    <article class="project-card">
      <p class="project-card__type">{{ project.type }} · {{ project.status }}</p>
      <h2><a href="{{ project.repo }}">{{ project.name }}</a></h2>
      <p>{{ project.summary }}</p>
      <ul class="project-tags">
        {% for tag in project.tags %}
          <li>{{ tag }}</li>
        {% endfor %}
      </ul>
    </article>
  {% endfor %}
</div>
