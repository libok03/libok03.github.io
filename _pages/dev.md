---
title: "개발일지"
layout: archive
permalink: /dev/
author_profile: true
sidebar:
  nav: "docs"
---

개발 관련 공부한 내용과 프로젝트 기록을 남기는 공간입니다.

<div class="entries-list">
  {% for post in site.posts %}
    {% if post.categories contains 'Dev Log' %}
      {% include archive-single.html type="list" %}
    {% endif %}
  {% endfor %}
</div>
