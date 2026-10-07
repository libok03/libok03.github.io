---
title: "개발일지"
layout: archive
permalink: /dev/
author_profile: true
---

ROS2, 자율주행, 강화학습, 웹 프로젝트를 진행하며 남긴 기록입니다.

<div class="entries-list">
  {% for post in site.posts %}
    {% if post.categories contains 'Dev Log' %}
      {% include archive-single.html type="list" %}
    {% endif %}
  {% endfor %}
</div>
