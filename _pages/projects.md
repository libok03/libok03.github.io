---
title: "프로젝트"
layout: single
permalink: /projects/
author_profile: true
classes: wide
---

GitHub에 흩어져 있던 프로젝트를 주제별로 정리했습니다. 공개 저장소는 저장소 링크와 함께 자세히 다루고, 비공개 저장소는 공개 가능한 범위에서 활동 기록으로만 남깁니다.

<div class="project-grid project-grid--archive">
  {% for project in site.data.projects %}
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
