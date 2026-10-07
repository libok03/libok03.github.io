const CLIENT = 'https://unpkg.com/@waline/client@3.16.0/dist/waline.js';
const CSS = 'https://unpkg.com/@waline/client@3.16.0/dist/waline.css';

export function commentPath(pathname) {
  return pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') || '/';
}

export function validConfig(config) {
  if (config.enabled !== true) return false;
  try {
    const server = new URL(config.serverURL);
    return server.protocol === 'https:' && !server.username && !server.password &&
      server.hostname !== 'localhost' && !server.search && !server.hash;
  } catch { return false; }
}

export async function mountComments() {
  if (!document.body.classList.contains('paper-article')) return;
  const configURL = new URL('../assets/comments-config.json', import.meta.url);
  let config;
  try {
    const response = await fetch(configURL, {cache: 'no-cache'});
    if (!response.ok) return;
    config = await response.json();
  } catch { return; }
  if (!validConfig(config)) return;
  const canonicalOrigin = new URL(config.siteOrigin).origin;
  if (location.origin !== canonicalOrigin) {
    const note = document.createElement('p');
    note.className = 'comments-preview-note';
    note.textContent = '댓글은 공개된 블로그 페이지에서 이용할 수 있습니다.';
    document.getElementById('quarto-document-content')?.append(note);
    return;
  }
  const section = document.createElement('section');
  section.className = 'paper-comments';
  section.setAttribute('aria-labelledby', 'comments-heading');
  const eyebrow = document.createElement('p');
  eyebrow.className = 'research-eyebrow'; eyebrow.textContent = 'DISCUSSION / READING TOGETHER';
  const heading = document.createElement('h2');
  heading.id = 'comments-heading'; heading.textContent = '함께 읽고 이야기하기';
  const description = document.createElement('p');
  description.className = 'comments-description';
  description.textContent = '로그인 없이 익명 또는 닉네임으로 참여할 수 있습니다. 이메일과 홈페이지 주소는 입력하지 않아도 됩니다.' +
    (config.moderated ? ' 댓글은 확인 후 공개됩니다.' : '');
  const container = document.createElement('div'); container.id = 'paper-comment-form';
  const status = document.createElement('p'); status.className = 'comments-status'; status.setAttribute('role', 'status');
  status.textContent = '댓글을 불러오는 중입니다.';
  section.append(eyebrow, heading, description, container, status);
  document.getElementById('quarto-document-content')?.append(section);
  const stylesheet = document.createElement('link'); stylesheet.rel = 'stylesheet'; stylesheet.href = CSS;
  document.head.append(stylesheet);
  try {
    const {init} = await import(CLIENT);
    init({
      el: container,
      serverURL: config.serverURL,
      path: commentPath(location.pathname),
      lang: 'en',
      locale: {
        nick: '닉네임 (선택)', anonymous: '익명',
        placeholder: '질문, 구현 경험 또는 다른 해석을 남겨 주세요. 댓글은 확인 후 공개됩니다.',
        submit: '댓글 등록', preview: '미리보기', cancel: '취소', reply: '답글',
        word: '글자', comment: '댓글', more: '더 보기', sofa: '첫 번째 의견을 남겨 주세요.',
        loading: '불러오는 중…', refresh: '새로고침', uploading: '등록 중…'
      },
      meta: ['nick'], requiredMeta: [], login: 'disable',
      dark: 'body.quarto-dark', wordLimit: [1, 3000],
      imageUploader: false, search: false, emoji: false, reaction: false
    });
    status.remove();
  } catch {
    status.textContent = '댓글을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';
  }
}
