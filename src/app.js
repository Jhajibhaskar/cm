(function(){
  const $ = id => document.getElementById(id);
  const title=$('trackTitle'), artist=$('trackArtist'), quote=$('trackQuote'), badge=$('trackMoodBadge');
  const list=$('playlistList'), moodBar=$('moodBar');
  const seek=$('seek'), volume=$('volume'), playBtn=$('playBtn'), playIcon=$('playIcon'), pauseIcon=$('pauseIcon');
  const ytHost=$('youtubePlayer');
  const ALL=[...(window.CM_SONGS || [])];
  const moodMap=Object.fromEntries(MOODS.map(m=>[m.id,m]));

  let mood='all';
  let visible=[...ALL];
  let current=-1;
  let queue=[...ALL.map(s=>s.videoId).filter(Boolean)];
  let queueIndex=0;
  let shuffle=false;
  let repeat=false;
  let player=null;
  let ytReady=false;
  let progressTimer=null;
  let currentDuration=0;
  let lastError=null;
  // Multiple candidate IDs are supported per song. The first ID is the supplied primary.
  // Add verified alternates in s.fallbackVideoIds when a YouTube upload is not embeddable.
  let candidateIds=[];
  let candidateIndex=0;
  let failedVideoIds=new Set();

  try{volume.value=localStorage.getItem('cm_volume') || 72}catch(e){}

  function esc(s){const d=document.createElement('div');d.textContent=s??'';return d.innerHTML}
  function fmt(v){if(!isFinite(v)||v<0)v=0;return Math.floor(v/60)+':'+String(Math.floor(v%60)).padStart(2,'0')}
  function currentSong(){return ALL[current] || null}

  function candidatesForSong(s){
    const ids=[s?.videoId,...(s?.fallbackVideoIds||[])].filter(Boolean);
    return [...new Set(ids)];
  }

  function currentVideoId(){ return candidateIds[candidateIndex] || currentSong()?.videoId || ''; }

  function updateArtwork(s){
    const cover=$('coverArt');
    if(!s)return;
    cover.style.backgroundImage=`linear-gradient(145deg,rgba(4,8,14,.16),rgba(4,8,14,.72)),url(${s.artwork})`;
    cover.classList.add('cover-art--song');
  }

  function updateLinks(s){
    const href=s?.youtubeUrl || '#';
    $('ytOpen').href=href;
    $('ytOpenMobile').href=href;
  }

  function updateHeroMeta(s){
    $('heroVideoTitle').textContent=s?s.title.toUpperCase():'RETRO SIGNAL ONLINE';
    $('heroVideoMeta').textContent=s?`${s.artist||'Classic Hindi'} • ${s.year||'RETRO'} • ${s.film||'CORPORATE MAZDUR RADIO'}`:'Pick a mood. Press play. Survive the shift.';
  }

  function setUI(playing){
    playIcon.hidden=playing;
    pauseIcon.hidden=!playing;
    playBtn.setAttribute('aria-label',playing?'Pause':'Play');
    document.body.classList.toggle('is-playing',playing);
    $('ytStatus').textContent=playing?'PLAYING ON YOUTUBE':(lastError?'EMBED ERROR':'READY');
    $('playerTip').textContent=playing
      ? `Now playing • ${currentSong()?.title||''}`
      : (lastError || 'Tap play to start the YouTube player.');
  }

  function renderMoods(){
    moodBar.innerHTML='';
    MOODS.forEach(m=>{
      const b=document.createElement('button');
      b.className='mood-chip';
      b.textContent=m.emoji+' '+m.label;
      b.setAttribute('aria-selected',m.id===mood);
      b.setAttribute('role','tab');
      b.onclick=()=>{mood=m.id;renderMoods();renderList()};
      moodBar.appendChild(b);
    });
  }

  function renderList(){
    visible=mood==='all'?ALL:ALL.filter(s=>s.moods.includes(mood));
    list.innerHTML='';
    visible.forEach((s,i)=>{
      const b=document.createElement('button');
      b.className='track';
      b.setAttribute('role','option');
      const cur=ALL[current]?.videoId===s.videoId;
      b.setAttribute('aria-selected',cur);
      const moods=s.moods.filter(x=>x!=='all').slice(0,2).map(x=>moodMap[x]?.emoji||'').join(' ');
      b.innerHTML=`<span class="track__index">${cur?'▶':String(i+1).padStart(2,'0')}</span><span><span class="track__title">${esc(s.title)}</span><br><span class="track__sub">${esc(s.artist||'Classic Hindi')}${s.year?' • '+s.year:''}</span></span><span class="track__tag">${moods||'✦'}</span>`;
      b.onclick=()=>playQueue(visible.map(x=>x.videoId), i);
      list.appendChild(b);
    });
  }

  function syncQueueIndex(){
    const id=currentSong()?.videoId;
    queueIndex=Math.max(0,queue.indexOf(id));
  }

  function playQueue(ids,startIndex=0){
    const filtered=[...new Set((ids||[]).filter(Boolean))];
    if(!filtered.length)return;
    queue=filtered;
    queueIndex=((startIndex%queue.length)+queue.length)%queue.length;
    const id=queue[queueIndex];
    const idx=ALL.findIndex(s=>s.videoId===id);
    if(idx<0)return;
    current=idx;
    load(idx,!!ytReady);
  }

  function load(i,auto=false){
    if(i<0 || i>=ALL.length)return;
    current=i;
    const s=ALL[i];
    syncQueueIndex();
    lastError=null;
    candidateIds=candidatesForSong(s);
    candidateIndex=Math.max(0,candidateIds.indexOf(s.videoId));
    failedVideoIds=new Set();
    title.textContent=s.title;
    artist.textContent=s.artist||'Classic Hindi';
    quote.textContent='“'+(s.quote||'Pehle gaana, phir production.')+'”';
    badge.textContent=(moodMap[s.moods?.[0]]?.emoji||'✦')+' '+(moodMap[s.moods?.[0]]?.label||'RETRO RADIO').toUpperCase();
    $('playerTip').textContent=`Track ${i+1} of ${ALL.length} • YouTube IFrame playback`;
    $('timeCurrent').textContent='0:00';
    $('timeTotal').textContent='0:00';
    seek.value=0;
    currentDuration=0;
    updateArtwork(s);
    updateLinks(s);
    updateHeroMeta(s);
    renderList();

    if(ytReady && player){
      setUI(false);
      player.loadVideoById(currentVideoId());
      if(auto) player.playVideo();
    }
  }

  function toggle(){
    if(current<0){
      playQueue(queue,queueIndex);
      return;
    }
    if(!player)return;
    const st=player.getPlayerState();
    if(st===YT.PlayerState.PLAYING)player.pauseVideo();
    else player.playVideo();
  }

  function step(delta){
    if(!queue.length)return;
    if(shuffle && queue.length>1){
      let next=Math.floor(Math.random()*queue.length);
      if(next===queueIndex)next=(next+1)%queue.length;
      queueIndex=next;
    }else{
      queueIndex=(queueIndex+delta+queue.length)%queue.length;
    }
    const id=queue[queueIndex];
    const idx=ALL.findIndex(s=>s.videoId===id);
    if(idx>=0)load(idx,true);
  }

  function retryOrAdvance(code){
    const s=currentSong();
    const active=currentVideoId();
    if(active) failedVideoIds.add(active);

    // Try every configured alternate upload for the same song first.
    for(let i=candidateIndex+1;i<candidateIds.length;i++){
      const nextId=candidateIds[i];
      if(failedVideoIds.has(nextId)) continue;
      candidateIndex=i;
      lastError=`Trying another YouTube upload for “${s?.title||'this track'}”…`;
      $('ytStatus').textContent='RETRYING';
      $('playerTip').textContent=lastError;
      if(player){
        player.loadVideoById(nextId);
        player.playVideo();
      }
      return true;
    }

    // No alternate uploads configured/working: behave like the reference radio and move to the next track.
    lastError=`YouTube rejected this upload in the embedded player (error ${code}).`;
    $('ytStatus').textContent='SKIPPING';
    $('playerTip').textContent=`${lastError} Trying the next Corporate Mazdur track…`;
    setTimeout(()=>{ if(!document.hidden) step(1); },900);
    return false;
  }

  function handleEnded(){
    stopProgress();
    if(repeat){
      player.seekTo(0,true);
      player.playVideo();
      return;
    }
    step(1);
  }

  function initYouTube(){
    const first=ALL[0];
    if(!ytHost || !window.YT || !YT.Player || player) return;

    // Let the official YouTube IFrame API create the iframe.
    // Do not manually build the /embed/... URL: the widget API adds
    // its own origin/referrer/widget parameters and referrer policy.
    player=new YT.Player(ytHost,{
      height:'100%',
      width:'100%',
      videoId:first?.videoId||'',
      playerVars:{
        autoplay:0,
        controls:0,
        disablekb:1,
        playsinline:1,
        rel:0,
        modestbranding:1,
        enablejsapi:1,
        origin:window.location.origin
      },
      events:{
        onReady:()=>{
          ytReady=true;
          player.setVolume(Number(volume.value));
          const start=Math.max(0,ALL.findIndex(s=>s.videoId===first?.videoId));
          load(start,false);
          $('ytStatus').textContent='READY';
        },
        onStateChange:e=>{
          if(e.data===YT.PlayerState.PLAYING){
            setUI(true);
            startProgress();
          }else if(e.data===YT.PlayerState.BUFFERING){
            $('ytStatus').textContent='BUFFERING';
            $('playerTip').textContent='YouTube is buffering the retro signal…';
          }else if(e.data===YT.PlayerState.PAUSED){
            setUI(false);
            stopProgress();
          }else if(e.data===YT.PlayerState.CUED){
            $('ytStatus').textContent='READY';
            stopProgress();
          }else if(e.data===YT.PlayerState.ENDED){
            handleEnded();
          }
        },
        onError:e=>{
          const code=e?.data||'unknown';
          setUI(false);
          retryOrAdvance(code);
          renderList();
        }
      }
    });
  }

  function startProgress(){
    stopProgress();
    progressTimer=setInterval(()=>{
      if(!player)return;
      const t=player.getCurrentTime()||0;
      const d=player.getDuration()||0;
      currentDuration=d;
      $('timeCurrent').textContent=fmt(t);
      $('timeTotal').textContent=fmt(d);
      seek.value=d?String(t/d*100):'0';
    },200);
  }

  function stopProgress(){
    if(progressTimer){clearInterval(progressTimer);progressTimer=null;}
  }

  // Load the official IFrame API once. If it is already loaded, initialize immediately.
  if(window.YT && window.YT.Player){
    initYouTube();
  }else{
    const previousReady=window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady=()=>{
      try{previousReady?.()}catch(e){}
      initYouTube();
    };
    const script=document.createElement('script');
    script.id='cm-youtube-iframe-api';
    script.src='https://www.youtube.com/iframe_api';
    script.async=true;
    script.referrerPolicy='strict-origin-when-cross-origin';
    document.head.appendChild(script);
  }

  $('playBtn').onclick=toggle;
  $('prevBtn').onclick=()=>step(-1);
  $('nextBtn').onclick=()=>step(1);
  $('shuffleBtn').onclick=()=>{shuffle=!shuffle;$('shuffleBtn').setAttribute('aria-pressed',shuffle)};
  $('repeatBtn').onclick=()=>{repeat=!repeat;$('repeatBtn').setAttribute('aria-pressed',repeat)};
  seek.oninput=()=>{if(player&&currentDuration)player.seekTo(Number(seek.value)/100*currentDuration,true)};
  volume.oninput=()=>{if(player)player.setVolume(Number(volume.value));try{localStorage.setItem('cm_volume',volume.value)}catch(e){}};

  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','BUTTON'].includes(document.activeElement.tagName))return;
    if(e.code==='Space'){e.preventDefault();toggle()}
    if(e.code==='ArrowRight')step(1);
    if(e.code==='ArrowLeft')step(-1);
  });

  document.querySelectorAll('[data-mode]').forEach(btn=>btn.onclick=()=>{
    const mode=btn.dataset.mode;
    document.body.classList.remove('mode-rain','mode-cloud','mode-agent','mode-apex');
    document.body.classList.add('mode-'+mode);
    if(window.CorporateRain&&mode==='rain')CorporateRain.boost();
    const msgs={
      rain:'Rain mode activated. Chai recommended.',
      cloud:'Data Cloud says: aggregate the feelings.',
      agent:'Agentforce says: next song selected by vibes.',
      apex:'Apex executed. No governor limits on nostalgia.'
    };
    $('agentLine').textContent='Agent says: “'+msgs[mode]+'”';
    if(mode==='agent')step(1);
  });

  const status=['SURVIVING','ONE MORE MEETING','COFFEE REQUIRED','SHIP IT'];
  setInterval(()=>{
    $('statusLabel').textContent=status[(Math.random()*status.length)|0];
    $('statusFill').style.width=(42+Math.random()*45)+'%';
  },5000);

  renderMoods();
  renderList();
  $('catalogCount')?.replaceChildren(document.createTextNode(String(ALL.length)));
})();
