---
title: "여행"
layout: archive
permalink: /travel/
author_profile: true
sidebar:
  nav: "docs"
---

여행을 다니며 찍은 사진과 추억을 공유합니다.

<div class="entries-list">
  {% for post in site.categories.Trip %}
    {% include archive-single.html type="grid" %}
  {% endfor %}
</div>
