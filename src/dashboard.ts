export const DASHBOARD_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>WebIndexer вЂ” Live Crawler</title><style>
*{margin:0;padding:0;box-sizing:border-box;user-select:none;}
::-webkit-scrollbar{width:6px;}
::-webkit-scrollbar-track{background:#0a0a0a;}
::-webkit-scrollbar-thumb{background:#00ff4144;border-radius:3px;}
::-webkit-scrollbar-thumb:hover{background:#00ff4188;}
body{background:#0a0a0a;color:#00ff41;font-family:'JetBrains Mono','Fira Code','Courier New',monospace;overflow:hidden;height:100vh;display:flex;flex-direction:column;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#0d0d0d;border-bottom:1px solid #00ff4122;z-index:100;}
.topbar .logo{font-size:14px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;display:flex;align-items:center;gap:8px;}
.topbar .logo .dot{width:8px;height:8px;background:#00ff41;border-radius:50%;animation:pulse 1.5s infinite;}
.topbar .nav{display:flex;gap:4px;}
.topbar .nav a{color:#00ff4166;text-decoration:none;font-size:10px;padding:4px 10px;border:1px solid transparent;border-radius:3px;text-transform:uppercase;letter-spacing:1px;transition:all .2s;}
.topbar .nav a:hover,.topbar .nav a.active{color:#00ff41;border-color:#00ff4144;background:#00ff4108;}
.topbar .stats-bar{display:flex;gap:16px;font-size:10px;color:#00ff4188;}
.topbar .stats-bar .stat{display:flex;align-items:center;gap:4px;}
.topbar .stats-bar .stat .val{color:#00ff41;font-weight:bold;}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 8px #00ff4188;}50%{opacity:.4;box-shadow:0 0 2px #00ff4144;}}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
@keyframes slideIn{from{opacity:0;transform:scale(.3);}to{opacity:1;transform:scale(1);}}
.main{flex:1;display:flex;overflow:hidden;}
.canvas-wrap{flex:1;position:relative;overflow:hidden;}
canvas{position:absolute;top:0;left:0;width:100%;height:100%;}
.node-container{position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;}
.node{position:absolute;width:40px;height:40px;border-radius:8px;cursor:grab;pointer-events:auto;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#00ff4122,#00ff4108);border:1px solid #00ff4133;transition:transform .2s,box-shadow .2s;animation:slideIn .4s ease-out;}
.node:hover{transform:scale(1.2);box-shadow:0 0 20px #00ff4144;border-color:#00ff4166;}
.node img{width:22px;height:22px;border-radius:3px;pointer-events:none;}
.node-label{position:absolute;left:50%;top:100%;transform:translateX(-50%);margin-top:3px;font-size:8px;color:#00ff4188;white-space:nowrap;pointer-events:none;max-width:80px;overflow:hidden;text-overflow:ellipsis;}
.sidebar{width:320px;background:#0d0d0d;border-left:1px solid #00ff4122;display:flex;flex-direction:column;overflow:hidden;}
.sidebar-section{padding:12px;border-bottom:1px solid #00ff4111;}
.sidebar-section h3{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#00ff4155;margin-bottom:8px;}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
.stat-card{background:#111;border:1px solid #00ff4115;border-radius:6px;padding:10px;text-align:center;}
.stat-card .label{font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#00ff4155;margin-bottom:4px;}
.stat-card .value{font-size:18px;font-weight:bold;text-shadow:0 0 10px #00ff4144;}
.stat-card .value.green{color:#00ff41;}
.stat-card .value.yellow{color:#ffaa00;}
.stat-card .value.red{color:#ff4141;}
.stat-card .value.blue{color:#41aaff;}
.chart-container{height:60px;background:#111;border:1px solid #00ff4115;border-radius:6px;overflow:hidden;position:relative;}
.chart-container canvas{width:100%!important;height:100%!important;}
.chart-label{position:absolute;top:4px;left:6px;font-size:8px;color:#00ff4155;text-transform:uppercase;letter-spacing:1px;}
.chart-value{position:absolute;top:4px;right:6px;font-size:10px;color:#00ff41;font-weight:bold;}
.progress-bar{height:6px;background:#1a1a1a;border-radius:3px;overflow:hidden;margin-top:6px;}
.progress-bar .fill{height:100%;border-radius:3px;transition:width .5s ease;}
.site-list{flex:1;overflow-y:auto;padding:8px;}
.site-item{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:4px;cursor:pointer;transition:background .2s;border-bottom:1px solid #00ff4108;}
.site-item:hover{background:#00ff4108;}
.site-item img{width:14px;height:14px;border-radius:2px;}
.site-item .name{flex:1;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.site-item .count{font-size:10px;font-weight:bold;color:#00ff4188;}
.search-input{width:100%;padding:8px 10px;background:#111;border:1px solid #00ff4122;color:#00ff41;font-size:10px;border-radius:4px;outline:none;font-family:inherit;}
.search-input:focus{border-color:#00ff4166;}
.search-input::placeholder{color:#00ff4133;}
.btn{width:100%;padding:8px;background:#00ff4112;border:1px solid #00ff4133;color:#00ff41;font-size:10px;cursor:pointer;border-radius:4px;font-family:inherit;text-transform:uppercase;letter-spacing:1px;transition:all .2s;}
.btn:hover{background:#00ff4122;border-color:#00ff4166;}
.tooltip{display:none;position:fixed;z-index:9999;background:#111;border:1px solid #00ff4144;border-radius:6px;padding:10px;max-width:300px;pointer-events:none;font-size:10px;box-shadow:0 4px 20px #00000088;}
.tooltip .domain{font-weight:bold;font-size:12px;margin-bottom:4px;}
.tooltip .meta{color:#00ff4166;line-height:1.6;}
</style></head><body>
<div class="topbar">
  <div class="logo"><span class="dot"></span>WebIndexer</div>
  <div class="nav">
    <a href="/" class="active">Graph</a>
    <a href="/search">Search</a>
    <a href="/status">Status</a>
    <a href="/metrics">Metrics</a>
  </div>
  <div class="stats-bar">
    <div class="stat"><span>LIVE</span><span class="val" id="tb-rate">0 pg/s</span></div>
    <div class="stat"><span>NODES</span><span class="val" id="tb-nodes">0</span></div>
    <div class="stat"><span>ERRORS</span><span class="val" id="tb-err">0%</span></div>
    <div class="stat"><span>UPTIME</span><span class="val" id="tb-up">0m</span></div>
  </div>
</div>
<div class="main">
  <div class="canvas-wrap" id="cw">
    <canvas id="cv"></canvas>
    <div class="node-container" id="nc"></div>
  </div>
  <div class="sidebar">
    <div class="sidebar-section">
      <h3>System Overview</h3>
      <div class="stat-grid">
        <div class="stat-card"><div class="label">Pages Indexed</div><div class="value green" id="s-pages">0</div></div>
        <div class="stat-card"><div class="label">Frontier Queue</div><div class="value blue" id="s-frontier">0</div></div>
        <div class="stat-card"><div class="label">Domains</div><div class="value" id="s-domains">0</div></div>
        <div class="stat-card"><div class="label">Throughput</div><div class="value green" id="s-rate">0</div></div>
      </div>
    </div>
    <div class="sidebar-section">
      <h3>Error Rate</h3>
      <div class="chart-container"><canvas id="errChart"></canvas><div class="chart-label">ERROR %</div><div class="chart-value" id="errVal">0%</div></div>
      <div class="progress-bar"><div class="fill" id="errBar" style="width:0%;background:#00ff41;"></div></div>
    </div>
    <div class="sidebar-section">
      <h3>Throughput (pg/s)</h3>
      <div class="chart-container"><canvas id="rateChart"></canvas><div class="chart-label">PAGES/SEC</div><div class="chart-value" id="rateVal">0</div></div>
    </div>
    <div class="sidebar-section">
      <h3>Memory (MB)</h3>
      <div class="chart-container"><canvas id="memChart"></canvas><div class="chart-label">RSS</div><div class="chart-value" id="memVal">0MB</div></div>
    </div>
    <div class="sidebar-section">
      <h3>Actions</h3>
      <a href="/search" class="btn" style="text-align:center;text-decoration:none;display:block;margin-bottom:6px;">Search Pages</a>
      <button class="btn" onclick="selRoot=null;renderR();buildG._l='';">Show All Sites</button>
      <input class="search-input" id="ri" placeholder="> filter sites..." style="margin-top:6px;">
    </div>
    <div class="site-list" id="rl"></div>
  </div>
</div>
<div class="tooltip" id="tip"></div>
<script>
var esc=function(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML;};
var cv=document.getElementById('cv'),ctx=cv.getContext('2d'),wrap=document.getElementById('cw'),cont=document.getElementById('nc');
var pos={},vel={},nodes=[],edges=[],ox=0,oy=0,drag=false,dsx=0,dsy=0,mx=-9999,my=-9999,mc=false,dragMoved=false;
var els={},allN=[],allEdges=[],prevU={},lastA={},selRoot=null;
var REP=6000,ATT=.005,IDEAL=80,CPULL=.01,DAMP=.85,MVEL=10,CS=120;
var errHistory=[],rateHistory=[],memHistory=[];
function resize(){var r=wrap.getBoundingClientRect();cv.width=r.width;cv.height=r.height;}
resize();window.addEventListener('resize',resize);
wrap.addEventListener('mousedown',function(e){drag=true;dragMoved=false;dsx=e.clientX-ox;dsy=e.clientY-oy;e.preventDefault();});
wrap.addEventListener('mouseenter',function(){mc=true;});
wrap.addEventListener('mouseleave',function(){mc=false;mx=-9999;my=-9999;});
wrap.addEventListener('mousemove',function(e){var r=wrap.getBoundingClientRect();mx=e.clientX-r.left;my=e.clientY-r.top;if(drag){var ndx=e.clientX-dsx-ox,ndy=e.clientY-dsy-oy;if(Math.abs(ndx)>3||Math.abs(ndy)>3)dragMoved=true;ox=e.clientX-dsx;oy=e.clientY-dsy;}});
document.addEventListener('mouseup',function(){drag=false;});
function buildG(dn){
  var nm={};dn.forEach(function(n){nm[n.domain]=n;});
  var e=[];allEdges.forEach(function(ed){if(nm[ed.src]&&nm[ed.dst])e.push([ed.src,ed.dst]);});
  var cx=cv.width/2,cy=cv.height/2;var np={},nv={};
  dn.forEach(function(n){if(pos[n.domain]){np[n.domain]=pos[n.domain];nv[n.domain]=vel[n.domain];}else{np[n.domain]={x:cx+(Math.random()-.5)*200,y:cy+(Math.random()-.5)*200};nv[n.domain]={x:0,y:0};}});
  pos=np;vel=nv;nodes=dn;edges=e;}
function tick(){
  var N=nodes.length;if(!N)return;var w=cv.width,h=cv.height;
  var g={};
  for(var i=0;i<N;i++){var p=pos[nodes[i].domain];if(!p)continue;var k=Math.floor(p.x/CS)+','+Math.floor(p.y/CS);if(!g[k])g[k]=[];g[k].push(i);}
  for(var i=0;i<N;i++){var pi=pos[nodes[i].domain],vi=vel[nodes[i].domain];if(!pi||!vi)continue;var cx=Math.floor(pi.x/CS),cy=Math.floor(pi.y/CS);
    for(var dx=-2;dx<=2;dx++)for(var dy=-2;dy<=2;dy++){var c=g[(cx+dx)+','+(cy+dy)];if(!c)continue;for(var j=0;j<c.length;j++){if(c[j]<=i)continue;var pj=pos[nodes[c[j]].domain],vj=vel[nodes[c[j]].domain];if(!pj||!vj)continue;var ddx=pi.x-pj.x,ddy=pi.y-pj.y;var d=Math.sqrt(ddx*ddx+ddy*ddy)||1;if(d>CS*3)continue;var f=REP/(d*d);vi.x+=(ddx/d)*f;vi.y+=(ddy/d)*f;vj.x-=(ddx/d)*f;vj.y-=(ddy/d)*f;}}}
  if(mc)for(var i=0;i<N;i++){var pi=pos[nodes[i].domain],vi=vel[nodes[i].domain];if(!pi||!vi)continue;var ddx=pi.x-mx,ddy=pi.y-my;var d=Math.sqrt(ddx*ddx+ddy*ddy)||1;if(d<100){var f=30000*(1-d/100)*(1-d/100)/d;vi.x+=(ddx/d)*f;vi.y+=(ddy/d)*f;}}
  for(var ei=0;ei<edges.length;ei++){var a=edges[ei][0],b=edges[ei][1];var pa=pos[a],pb=pos[b],va=vel[a],vb=vel[b];if(!pa||!pb||!va||!vb)continue;var ddx=pb.x-pa.x,ddy=pb.y-pa.y;var d=Math.sqrt(ddx*ddx+ddy*ddy)||1;var f=ATT*(d-IDEAL);va.x+=(ddx/d)*f;va.y+=(ddy/d)*f;vb.x-=(ddx/d)*f;vb.y-=(ddy/d)*f;}
  for(var i=0;i<N;i++){var p=pos[nodes[i].domain],v=vel[nodes[i].domain];if(!p||!v)continue;v.x+=(w/2-p.x)*CPULL;v.y+=(h/2-p.y)*CPULL;v.x*=DAMP;v.y*=DAMP;v.x=Math.max(-MVEL,Math.min(MVEL,v.x));v.y=Math.max(-MVEL,Math.min(MVEL,v.y));p.x+=v.x;p.y+=v.y;p.x=Math.max(15,Math.min(w-15,p.x));p.y=Math.max(15,Math.min(h-15,p.y));}
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,w,h);ctx.save();ctx.translate(ox,oy);ctx.strokeStyle='#00ff4118';ctx.lineWidth=.6;
  edges.forEach(function(e){var pa=pos[e[0]],pb=pos[e[1]];if(!pa||!pb)return;ctx.beginPath();ctx.moveTo(pa.x,pa.y);ctx.lineTo(pb.x,pb.y);ctx.stroke();});
  ctx.restore();
  var sf=nodes.length<=300;
  nodes.forEach(function(n){var p=pos[n.domain];if(!p)return;var el=els[n.domain];if(!el){el=document.createElement('div');el.className='node';
    el.addEventListener('click',function(){if(!dragMoved){selRoot=selRoot===n.domain?null:n.domain;renderR();buildG._l='';}});
    el.addEventListener('mouseenter',function(e){var t=document.getElementById('tip');t.innerHTML='<div class="domain">'+esc(n.domain)+'</div><div class="meta">'+esc(n.title||'No title')+'<br>Popularity: '+n.popularity+' | Depth: '+n.depth+'</div>';t.style.display='block';t.style.left=(e.clientX+12)+'px';t.style.top=(e.clientY+12)+'px';});
    el.addEventListener('mouseleave',function(){document.getElementById('tip').style.display='none';});
    if(sf){var img=document.createElement('img');img.draggable=false;img.src='https://www.google.com/s2/favicons?domain='+n.domain+'&sz=32';img.onerror=function(){this.style.display='none';};el.appendChild(img);}
    var l=document.createElement('div');l.className='node-label';l.textContent=n.domain.slice(0,22);el.appendChild(l);
    els[n.domain]=el;cont.appendChild(el);}
    el.style.left=(p.x-20+ox)+'px';el.style.top=(p.y-20+oy)+'px';});
  var ac={};nodes.forEach(function(n){ac[n.domain]=1;});
  Object.keys(els).forEach(function(u){if(!ac[u]){els[u].remove();delete els[u];}});
}
function renderR(){
  var f=(document.getElementById('ri').value||'').toLowerCase();
  var filt=allN.filter(function(n){return !f||n.domain.toLowerCase().includes(f)||(n.title||'').toLowerCase().includes(f);});
  var c=document.getElementById('rl');c.innerHTML='';
  filt.forEach(function(n){var bg=selRoot===n.domain?'#00ff4112':'transparent';
    var d=document.createElement('div');d.className='site-item';d.style.background=bg;
    d.onclick=function(){window._sr(n.domain);};
    var img=document.createElement('img');img.onerror=function(){this.style.display='none';};img.src='https://www.google.com/s2/favicons?domain='+encodeURIComponent(n.domain)+'&sz=32';
    var sp=document.createElement('span');sp.className='name';sp.textContent=n.domain;
    var pp=document.createElement('span');pp.className='count';pp.textContent=n.popularity;
    d.appendChild(img);d.appendChild(sp);d.appendChild(pp);c.appendChild(d);});}
window._sr=function(d){selRoot=selRoot===d?null:d;renderR();buildG._l='';};
document.getElementById('ri').addEventListener('input',renderR);

function drawMiniChart(canvasId,data,color,maxVal){
  var canvas=document.getElementById(canvasId);if(!canvas)return;
  var c=canvas.getContext('2d');
  var w=canvas.parentElement.clientWidth;var h=canvas.parentElement.clientHeight;
  canvas.width=w;canvas.height=h;
  c.clearRect(0,0,w,h);
  if(data.length<2)return;
  var max=maxVal||Math.max.apply(null,data)||1;
  c.beginPath();c.moveTo(0,h);
  for(var i=0;i<data.length;i++){var x=(i/(data.length-1))*w;var y=h-(data[i]/max)*h*.85;c.lineTo(x,y);}
  c.lineTo(w,h);c.closePath();
  var grad=c.createLinearGradient(0,0,0,h);
  grad.addColorStop(0,color+'44');grad.addColorStop(1,color+'05');
  c.fillStyle=grad;c.fill();
  c.beginPath();
  for(var i=0;i<data.length;i++){var x=(i/(data.length-1))*w;var y=h-(data[i]/max)*h*.85;if(i===0)c.moveTo(x,y);else c.lineTo(x,y);}
  c.strokeStyle=color;c.lineWidth=1.5;c.stroke();
}

function load(){fetch('/api/tree').then(function(r){return r.json();}).then(function(d){if(!d.nodes||!d.nodes.length)return;var nu={};d.nodes.forEach(function(n){nu[n.domain]=1;});lastA={};d.nodes.forEach(function(n){if(!prevU[n.domain])lastA[n.domain]=1;});allN=d.nodes;allEdges=d.edges||[];prevU=nu;renderR();
  document.getElementById('s-pages').textContent=(d.total||0).toLocaleString();
  document.getElementById('s-domains').textContent=(d.domains||d.nodes.length);}).catch(function(){});}

function loadStats(){fetch('/api/stats').then(function(r){return r.json();}).then(function(d){
  document.getElementById('s-frontier').textContent=(d.frontier||0).toLocaleString();
  document.getElementById('s-rate').textContent=(d.rate||0)+' pg/s';
  var total=d.success+d.fail;var errPct=total>0?((d.fail/total)*100).toFixed(1):'0';
  document.getElementById('tb-rate').textContent=(d.rate||0)+' pg/s';
  document.getElementById('tb-nodes').textContent=(d.total||0).toLocaleString();
  document.getElementById('tb-err').textContent=errPct+'%';
  var up=d.uptime||0;var m=Math.floor(up/60);var h=Math.floor(m/60);var dd=Math.floor(h/24);
  var ts=dd>0?dd+'d '+(h%24)+'h':h>0?h+'h '+m%60+'m':m+'m '+up%60+'s';
  document.getElementById('tb-up').textContent=ts;
  document.getElementById('errVal').textContent=errPct+'%';
  document.getElementById('rateVal').textContent=(d.rate||0);
  errHistory.push(parseFloat(errPct));if(errHistory.length>60)errHistory.shift();
  rateHistory.push(parseFloat(d.rate)||0);if(rateHistory.length>60)rateHistory.shift();
  drawMiniChart('errChart',errHistory,'#ff4141',30);
  drawMiniChart('rateChart',rateHistory,'#00ff41',20);
  var eb=document.getElementById('errBar');if(eb){eb.style.width=errPct+'%';eb.style.background=parseFloat(errPct)>20?'#ff4141':parseFloat(errPct)>10?'#ffaa00':'#00ff41';}
}).catch(function(){});}

function loadMetrics(){fetch('/metrics').then(function(r){return r.text();}).then(function(t){var m=t.match(/webindexer_memory_rss_bytes\\s+(\\d+)/);if(m){var mb=Math.round(parseInt(m[1])/1048576);document.getElementById('memVal').textContent=mb+'MB';memHistory.push(mb);if(memHistory.length>60)memHistory.shift();drawMiniChart('memChart',memHistory,'#41aaff',400);}}).catch(function(){});}

function animate(){
  var dn=selRoot?allN.filter(function(n){return n.domain===selRoot||allEdges.some(function(e){return(e.src===selRoot&&e.dst===n.domain)||(e.dst===selRoot&&e.src===n.domain);})}).slice(0,50):allN.slice(0,100);
  if(!dn.length){ctx.clearRect(0,0,cv.width,cv.height);ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,cv.width,cv.height);}
  else{var cu=dn.map(function(n){return n.domain;}).join(',');if(cu!==buildG._l){buildG(dn);buildG._l=cu;}tick();}
  requestAnimationFrame(animate);}
load();loadStats();loadMetrics();setInterval(load,5000);setInterval(loadStats,5000);setInterval(loadMetrics,30000);animate();
</script></body></html>`;
