import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../../styles/paper-comments.js', import.meta.url), 'utf8');
const client = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));

test('댓글 주소에서 index.html과 끝의 slash를 정규화한다', () => {
  assert.equal(client.commentPath('/posts/example/index.html'), '/posts/example');
  assert.equal(client.commentPath('/posts/example/'), '/posts/example');
});
test('미연결 상태와 잘못된 서버 주소를 활성화하지 않는다', () => {
  assert.equal(client.validConfig({enabled:false,serverURL:'https://comments.example'}),false);
  for (const url of ['', 'http://comments.example', 'https://user:pass@comments.example', 'https://localhost'])
    assert.equal(client.validConfig({enabled:true,serverURL:url}),false);
  assert.equal(client.validConfig({enabled:true,serverURL:'https://comments.example'}),true);
});
test('서버 기본값은 익명 참여와 승인 후 공개다', () => {
  const code=readFileSync(new URL('../../services/comments/index.cjs', import.meta.url), 'utf8');
  const env={};
  vm.runInNewContext(code, {process:{env},require:()=>options=>options,module:{exports:{}}});
  assert.equal(env.LOGIN,'disable');
  assert.equal(env.COMMENT_AUDIT,'true');
  assert.equal(env.IPQPS,'60');
  assert.equal(env.DISABLE_REGION,'true');
  assert.equal(env.DISABLE_USERAGENT,'true');
});
