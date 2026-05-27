---
title: "여행"
layout: archive
permalink: /travel/
author_profile: true
---

여행을 다니며 남긴 사진과 생각을 모아두는 공간입니다.

<div class="entries-list">
  {% for post in site.posts %}
    {% if post.categories contains 'Trip' %}
      {% include archive-single.html type="grid" %}
    {% endif %}
  {% endfor %}
</div>
