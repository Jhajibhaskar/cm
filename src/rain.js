(function(){
  const canvas=document.getElementById('rain'); if(!canvas) return;
  const ctx=canvas.getContext('2d',{alpha:true});
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TOKENS=['Apex','@InvocableMethod','SOQL','Flow','Get Records','Decision','Update Records','Prompt Template','Grounding','Data Cloud','Data 360','Calculated Insight','Agentforce','Topic','Action','Reasoning','LWC','Platform Event','Queueable','Case','Order','SELECT Id','System.debug()','Trigger','Record-Triggered Flow','Flow.Interview'];
  let w=0,h=0,dpr=1,cols=[],raf=0,last=performance.now(),running=!reduce;
  function resize(){dpr=Math.min(devicePixelRatio||1,2);w=innerWidth;h=innerHeight;canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const step=w<600?150:125;cols=Array.from({length:Math.max(4,Math.ceil(w/step))},(_,i)=>({x:i*step+step/2,y:-Math.random()*h,s:18+Math.random()*34,t:pick(),a:.10+Math.random()*.18,size:9+Math.random()*3,life:0}));}
  const pick=()=>TOKENS[(Math.random()*TOKENS.length)|0];
  function frame(now){if(!running)return;const dt=Math.min((now-last)/1000,.04);last=now;ctx.clearRect(0,0,w,h);ctx.textAlign='center';for(const c of cols){c.y+=c.s*dt;c.life++;if(c.y>h+50){c.y=-30-Math.random()*200;c.t=pick();c.s=18+Math.random()*34;c.life=0}if(c.life%270===0)c.t=pick();ctx.save();ctx.translate(c.x,c.y);ctx.rotate(Math.PI/2);ctx.font=`${c.size}px ui-monospace,monospace`;const mint=/Data|Agentforce|Prompt|Flow|Grounding/.test(c.t);ctx.fillStyle=mint?`rgba(101,230,176,${c.a})`:`rgba(0,161,224,${c.a})`;ctx.shadowColor=mint?'rgba(101,230,176,.25)':'rgba(0,161,224,.35)';ctx.shadowBlur=7;ctx.fillText(c.t,0,0);ctx.restore();}raf=requestAnimationFrame(frame)}
  function start(){if(raf||reduce)return;running=true;last=performance.now();raf=requestAnimationFrame(frame)}
  function stop(){running=false;if(raf)cancelAnimationFrame(raf);raf=0}
  addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',()=>document.hidden?stop():start());resize();if(!reduce)start();
  window.CorporateRain={boost(){canvas.animate([{opacity:.55},{opacity:1},{opacity:.68}],{duration:900,easing:'ease-out'});}};
})();
