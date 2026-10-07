```{=html}
<div class="archive-count"><span><%= items.length %> READING NOTES</span><span>최근 기록부터</span></div>
<% if (!items.length) { %>
<div class="archive-empty-state"><img src="assets/research/paper-cover.svg" width="150" height="95" alt="논문과 데이터 흐름의 개념 그림"><h3>첫 번째 리뷰를 준비하고 있습니다.</h3><p>논문의 핵심 아이디어와 내부 로직을 정리한 기록이 이곳에 쌓입니다.</p></div>
<% } %>
<div class="paper-grid list">
<% for (let index = 0; index < items.length; index++) { const item = items[index]; const categories = Array.isArray(item.categories) ? item.categories : item.categories ? [item.categories] : []; let cover = String(item.image || 'assets/research/paper-cover.svg').replace(/^\//, '').replace(/^(\.\.\/)+assets\//, 'assets/'); %>
<article class="paper-card" <%= metadataAttrs(item) %> data-search="<%- [item.title, item.description, ...categories, item['paper-title'] || ''].join(' ').toLowerCase() %>">
<a class="paper-card-cover" href="<%- item.path %>" tabindex="-1" aria-hidden="true"><img src="<%- cover %>" alt="" loading="lazy" width="640" height="390"><span class="card-index">NOTE <%= String(index + 1).padStart(2, '0') %></span></a>
<div class="paper-card-body"><div class="card-topline"><span class="listing-categories"><%- categories[0] || '논문 리뷰' %></span><% if (item.draft) { %><span class="draft-chip">DRAFT</span><% } %></div><h3><a class="listing-title" href="<%- item.path %>"><%- item.title %></a></h3>
<% if (item['paper-title']) { %><p class="original-paper"><%- item['paper-title'] %><% if (item['paper-venue']) { %><span> · <%- item['paper-venue'] %></span><% } %></p><% } %>
<p class="listing-description"><%- item.description || '논문의 문제 정의, 내부 로직과 구현상의 선택을 정리합니다.' %></p><div class="card-bottom"><span class="listing-date"><%- item.date || '' %></span><a href="<%- item.path %>" aria-label="<%- item.title %> 읽기">리뷰 읽기 ↗</a></div></div></article>
<% } %>
</div>
```
