(() => {
  if(window.paperLiveAdapterLoaded)return;
  window.paperLiveAdapterLoaded=true;
  const escape = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const parser = new marked.Marked({gfm:true});
  parser.use({extensions:[
    {name:'displayMath',level:'block',start:src=>src.indexOf('$$'),tokenizer(src){const m=/^\$\$\s*\n?([\s\S]*?)\$\$(?:\s*\{[^\n}]*\})?\s*(?:\n|$)/.exec(src);if(m)return {type:'displayMath',raw:m[0],text:m[1]};},renderer(token){return `<div class="math display">\\[${escape(token.text)}\\]</div>`;}},
    {name:'inlineMath',level:'inline',start:src=>src.indexOf('$'),tokenizer(src){const m=/^\$([^$\n]+)\$/.exec(src);if(m)return {type:'inlineMath',raw:m[0],text:m[1]};},renderer(token){return `<span class="math inline">\\(${escape(token.text)}\\)</span>`;}},
    {name:'diagram',level:'block',start:src=>src.indexOf('```{mermaid}'),tokenizer(src){const m=/^```\{mermaid\}\s*\n([\s\S]*?)\n```\s*(?:\n|$)/.exec(src);if(m)return {type:'diagram',raw:m[0],text:m[1]};},renderer(token){return `<pre class="mermaid">${escape(token.text)}</pre>`;}},
    {name:'callout',level:'block',start:src=>src.indexOf('::: {'),tokenizer(src){const m=/^::: \{\.callout-([\w-]+)(?:\s+title="([^"]*)")?\}\s*\n([\s\S]*?)\n:::\s*(?:\n|$)/.exec(src);if(m)return {type:'callout',raw:m[0],title:m[2]||'',tokens:this.lexer.blockTokens(m[3])};},renderer(token){return `<aside class="callout"><strong>${escape(token.title)}</strong>${this.parser.parse(token.tokens)}</aside>`;}}
  ]});
  let last = 0, mathLoading, diagramLoading;
  const load = src => new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=reject;document.head.append(script);});
  async function enrich(container, sequence) {
    try {
      if(container.querySelector('.math')) {
        if(!window.MathJax?.typesetPromise) {
          mathLoading ||= load('https://cdn.jsdelivr.net/npm/mathjax@4/tex-chtml.js');
          await mathLoading;
          await window.MathJax?.startup?.promise;
        }
        if(sequence===last) await window.MathJax?.typesetPromise?.([container]);
      }
      if(container.querySelector('.mermaid')) {
        if(!window.mermaid) diagramLoading ||= load('/preview/site_libs/quarto-diagram/mermaid.min.js');
        if(diagramLoading) await diagramLoading;
        if(sequence===last && window.mermaid) {
          window.mermaid.initialize({startOnLoad:false,securityLevel:'strict'});
          await window.mermaid.run({nodes:container.querySelectorAll('.mermaid')});
        }
      }
    } catch { /* Keep readable source while a library loads or a formula is incomplete. */ }
  }
  window.addEventListener('message', event => {
    if(event.source!==window.parent || event.data?.type!=='paper-live-update')return;
    const message=event.data;
    if(message.sequence<last)return;
    last=message.sequence;
    const main=document.getElementById('quarto-document-content');
    if(!main)return;
    let body=String(message.text||'');
    const front=/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(body);
    if(front){body=body.slice(front[0].length);const title=front[1].match(/^title:\s*(.*)$/m);if(title){let text=title[1];try{text=JSON.parse(text);}catch{text=text.replace(/^['"]|['"]$/g,'');}const heading=document.querySelector('h1.title');if(heading)heading.textContent=text;}}
    body=body.replace(/^```\{(\w+)[^}]*\}/gm,'```$1');
    let container=document.getElementById('paper-live-content');
    if(!container){
      container=document.createElement('div');container.id='paper-live-content';
      const header=document.getElementById('title-block-header');
      for(const child of [...main.children])if(child!==header)child.remove();
      main.append(container);
    }
    const position=window.scrollY;
    window.MathJax?.typesetClear?.([container]);
    container.innerHTML=DOMPurify.sanitize(parser.parse(body));
    const seen = new Map();
    container.querySelectorAll('h1,h2,h3,h4').forEach(heading => {
      const base = heading.textContent.trim().toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s+/g,'-') || 'section';
      const count = seen.get(base) || 0; seen.set(base,count+1); heading.id = base + (count ? '-' + count : '');
    });
    container.querySelectorAll('pre:not(.mermaid)').forEach(pre => { pre.classList.add('sourceCode'); });
    container.querySelectorAll('img').forEach(image => {
      image.style.maxWidth = '100%'; image.style.height = 'auto';
      const original = image.getAttribute('src');
      let attempts = 0;
      image.addEventListener('error', () => {
        if(!original || attempts++ >= 12)return;
        const url = new URL(original, document.baseURI);
        if(url.origin !== new URL(document.baseURI).origin)return;
        setTimeout(() => {
          if(!image.isConnected)return;
          url.searchParams.set('asset-refresh', String(Date.now())); image.src = url.href;
        },250);
      });
    });
    const toc = document.querySelector('#TOC ul');
    if(toc){toc.replaceChildren();container.querySelectorAll('h2,h3').forEach(heading=>{
      const item=document.createElement('li');const link=document.createElement('a');
      link.href='#'+heading.id;link.textContent=heading.textContent;link.className='nav-link';
      if(heading.tagName==='H3')item.style.paddingLeft='12px';item.append(link);toc.append(item);
    });}
    window.scrollTo(0,position);
    window.parent.postMessage({type:'paper-live-painted',sequence:last,sanitized:!container.querySelector('script,[onerror],[onclick]')},'*');
    enrich(container,last);
  });
  window.parent.postMessage({type:'paper-live-ready'},'*');
})();
