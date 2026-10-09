'use strict';
(function(root){
  const repo='libok03/libok03.github.io';
  function recoveryRun(state){
    if(state.busy||state.kind!=='publish'||!state.error)return null;
    if(!/error connecting|wsarecv|connection.*(?:abort|reset)|timed? out|timeout|TLS handshake|network|EOF/i.test(state.message+'\n'+state.logs))return null;
    const matches=[...(state.logs||'').matchAll(/https:\/\/github\.com\/libok03\/libok03\.github\.io\/actions\/runs\/(\d+)/g)];
    return matches.length?matches[matches.length-1][1]:null;
  }
  function result(run,id){
    if(String(run.id)!==String(id)||run.repository?.full_name!==repo)throw new Error('배포 실행 정보를 확인하지 못했습니다.');
    if(run.status!=='completed')return {done:false,error:false,message:'온라인 빌드·배포 진행 중'};
    return run.conclusion==='success'?{done:true,error:false,message:'온라인 배포 완료! 사이트에서 글을 확인하세요.'}:{done:true,error:true,message:'온라인 배포 결과: '+run.conclusion+' · 배포 상태 버튼에서 확인하세요.'};
  }
  root.DeploymentStatus={repo,recoveryRun,result};
})(typeof module==='object'?module.exports:window);
