---
title: "맛집/카페"
layout: archive
permalink: /food/
author_profile: true
---

직접 가본 맛집과 카페를 짧게 기록합니다.

<div class="entries-list">
  {% for post in site.posts %}
    {% if post.categories contains 'Cafe-Food' %}
      {% include archive-single.html type="grid" %}
    {% endif %}
  {% endfor %}
</div>
