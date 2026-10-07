# Paper Notes — design references

사용자가 지정한 CSS Design Awards를 참고한 자체 디자인입니다.

- [A24 / Ravi Klaassens](https://www.cssdesignawards.com/sites/a24/50165/): 타이포그래피와 움직임, 개별 작품을 컬렉션으로 탐색하는 발상. 논문을 개별 노트로 묶는 목록에 응용했습니다.
- [STUDIO seitaro](https://www.cssdesignawards.com/sites/studio-seitaro/50173/): 작품과 글을 함께 아카이브하는 발상. 큰 타이틀과 시각적 표지가 있는 개인 연구 아카이브로 해석했습니다.
- [Agrumea Farm](https://www.cssdesignawards.com/sites/agrumea-farm/50176/): 선정 페이지에 소개된 스크롤·패럴랙스 접근을 참고했습니다. 본 사이트의 포인터 반응과 구간 등장 효과는 작은 CSS/JavaScript로 구현했습니다.

이미지는 assets/research/의 자체 SVG 그래픽입니다. 과학적 결과 그래프가 아니라 표지·개념 아트워크이며,
원 논문의 실험 그림은 글 작성자가 별도로 첨부합니다.

전체 스타일은 styles/research.css, Quarto의 글꼴·색상 기본값은 styles/custom.scss에 있습니다.
목록은 styles/paper-listing.ejs.md, 검색·등장 효과·읽기 진행 표시는 styles/research-ui.html입니다.
동작 감소 설정을 존중하며 모바일에서는 입체 포인터 효과를 적용하지 않습니다.

