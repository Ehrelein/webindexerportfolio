export const STATUS_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>WebIndexer вЂ” Status</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#0a0a0a;color:#00ff41;font-family:'JetBrains Mono','Fira Code','Courier New',monospace;min-height:100vh;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:8px 16px;background:#0d0d0d;border-bottom:1px solid #00ff4122;position:sticky;top:0;z-index:100;}
.topbar .logo{font-size:14px;font-weight:bold;letter-spacing:3px;text-transform:uppercase;display:flex;align-items:center;gap:8px;}
.topbar .logo .dot{width:8px;height:8px;background:#00ff41;border-radius:50%;animation:pulse 1.5s infinite;}
.topbar .nav{display:flex;gap:4px;}
.topbar .nav a{color:#00ff4166;text-decoration:none;font-size:10px;padding:4px 10px;border:1px solid transparent;border-radius:3px;text-transform:uppercase;letter-spacing:1px;transition:all .2s;}
.topbar .nav a:hover,.topbar .nav a.active{color:#00ff41;border-color:#00ff4144;background:#00ff4108;}
@keyframes pulse{0%,100%{opacity:1;box-shadow:0 0 8px #00ff4188;}50%{opacity:.4;box-shadow:0 0 2px #00ff4144;}}
@keyframes fadeIn{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
.container{max-width:900px;margin:0 auto;padding:40px 24px;}
h1{font-size:28px;font-weight:300;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;text-shadow:0 0 20px #00ff4144;}
.subtitle{color:#00ff4155;font-size:12px;margin-bottom:40px;letter-spacing:1px;}
.section{margin-bottom:32px;animation:fadeIn .6s ease-out;}
.section h2{font-size:14px;text-transform:uppercase;letter-spacing:3px;color:#00ff4188;margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid #00ff4115;}
.status-banner{text-align:center;padding:24px;border-radius:8px;margin-bottom:24px;border:1px solid;}
.status-banner.ok{background:#00ff4108;border-color:#00ff4133;}
.status-banner.ok .status-text{color:#00ff41;font-size:18px;letter-spacing:3px;}
.status-banner.warn{background:#ffaa0012;border-color:#ffaa0033;}
.status-banner.warn .status-text{color:#ffaa00;}
.status-banner.err{background:#ff414112;border-color:#ff414133;}
.status-banner.err .status-text{color:#ff4141;}
.checks-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.check-card{background:#0d0d0d;border:1px solid #00ff4115;border-radius:8px;padding:16px;display:flex;align-items:center;gap:12px;}
.check-card .indicator{width:12px;height:12px;border-radius:50%;flex-shrink:0;}
.check-card .indicator.ok{background:#00ff41;box-shadow:0 0 10px #00ff4166;}
.check-card .indicator.warn{background:#ffaa00;box-shadow:0 0 10px #ffaa0066;}
.check-card .indicator.err{background:#ff4141;box-shadow:0 0 10px #ff414166;}
.check-card .info .name{font-size:12px;font-weight:bold;}
.check-card .info .detail{font-size:9px;color:#00ff4155;margin-top:2px;}
.info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}
.info-card{background:#0d0d0d;border:1px solid #00ff4115;border-radius:8px;padding:16px;}
.info-card .label{font-size:9px;text-transform:uppercase;letter-spacing:2px;color:#00ff4155;margin-bottom:6px;}
.info-card .value{font-size:16px;font-weight:bold;}
.info-card .value.green{color:#00ff41;}
.info-card .value.blue{color:#41aaff;}
.info-card .value.yellow{color:#ffaa00;}
.slo-table{width:100%;border-collapse:collapse;}
.slo-table th,.slo-table td{padding:10px 12px;text-align:left;border-bottom:1px solid #00ff4111;font-size:11px;}
.slo-table th{color:#00ff4155;text-transform:uppercase;letter-spacing:1px;font-size:9px;}
.slo-table .badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:9px;text-transform:uppercase;letter-spacing:1px;}
.slo-table .badge.good{background:#00ff4118;color:#00ff41;border:1px solid #00ff4133;}
.slo-table .badge.warn{background:#ffaa0018;color:#ffaa00;border:1px solid #ffaa0033;}
.slo-table .badge.bad{background:#ff414118;color:#ff4141;border:1px solid #ff414133;}
.footer{text-align:center;padding:40px;color:#00ff4133;font-size:10px;letter-spacing:1px;border-top:1px solid #00ff4111;margin-top:40px;}
</style></head><body>
<div class="topbar">
  <div class="logo"><span class="dot"></span>WebIndexer</div>
  <div class="nav">
    <a href="/">Graph</a>
    <a href="/search">Search</a>
    <a href="/status" class="active">Status</a>
    <a href="/metrics">Metrics</a>
  </div>
</div>
<div class="container">
  <div class="section">
    <h1>System Status</h1>
    <div class="subtitle">Real-time health checks and performance metrics</div>
  </div>

  <div id="banner" class="status-banner ok">
    <div class="status-text" id="statusText">ALL SYSTEMS OPERATIONAL</div>
  </div>

  <div class="section">
    <h2>Health Checks</h2>
    <div class="checks-grid" id="checks">
      <div class="check-card"><div class="indicator" id="hc-live"></div><div class="info"><div class="name">Liveness</div><div class="detail">Process is running</div></div></div>
      <div class="check-card"><div class="indicator" id="hc-ready"></div><div class="info"><div class="name">Readiness</div><div class="detail">Ready to serve traffic</div></div></div>
      <div class="check-card"><div class="indicator" id="hc-db"></div><div class="info"><div class="name">Database</div><div class="detail">SQLite WAL accessible</div></div></div>
      <div class="check-card"><div class="indicator" id="hc-mem"></div><div class="info"><div class="name">Memory</div><div class="detail" id="memDetail">Checking...</div></div></div>
      <div class="check-card"><div class="indicator" id="hc-disk"></div><div class="info"><div class="name">Disk</div><div class="detail" id="diskDetail">Checking...</div></div></div>
      <div class="check-card"><div class="indicator" id="hc-crawler"></div><div class="info"><div class="name">Crawler</div><div class="detail" id="crawlerDetail">Checking...</div></div></div>
    </div>
  </div>

  <div class="section">
    <h2>System Information</h2>
    <div class="info-grid" id="sysInfo">
      <div class="info-card"><div class="label">Node.js Version</div><div class="value" id="sys-node">вЂ”</div></div>
      <div class="info-card"><div class="label">Platform</div><div class="value" id="sys-platform">вЂ”</div></div>
      <div class="info-card"><div class="label">Uptime</div><div class="value blue" id="sys-uptime">вЂ”</div></div>
      <div class="info-card"><div class="label">Memory RSS</div><div class="value" id="sys-rss">вЂ”</div></div>
      <div class="info-card"><div class="label">Heap Used</div><div class="value" id="sys-heap">вЂ”</div></div>
      <div class="info-card"><div class="label">CPU Cores</div><div class="value" id="sys-cpu">вЂ”</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Performance</h2>
    <table class="slo-table">
      <thead><tr><th>Metric</th><th>Value</th><th>Details</th></tr></thead>
      <tbody id="sloTable">
        <tr><td>Error Rate</td><td id="slo-err">вЂ”</td><td id="slo-err-detail"></td></tr>
        <tr><td>Crawl Throughput</td><td id="slo-throughput">вЂ”</td><td id="slo-throughput-detail"></td></tr>
        <tr><td>Domains Checked</td><td id="slo-domains">вЂ”</td><td id="slo-domains-detail"></td></tr>
        <tr><td>Memory RSS</td><td id="slo-rss">вЂ”</td><td>Process memory</td></tr>
      </tbody>
    </table>
  </div>

  <div class="footer">WebIndexer Status вЂ” Last checked: <span id="lastCheck">вЂ”</span></div>
</div>
<script>
function setCheck(id,ok){var el=document.getElementById(id);if(el){el.className='indicator '+(ok?'ok':'err');}}
function updateChecks(){
  fetch('/health/ready').then(function(r){return r.json();}).then(function(d){
    setCheck('hc-live',true);
    setCheck('hc-ready',d.status==='ready');
    setCheck('hc-db',d.checks&&d.checks.db);
    setCheck('hc-mem',d.checks&&d.checks.memory);
    setCheck('hc-crawler',d.checks&&d.checks.crawler);
    document.getElementById('statusText').textContent=d.status==='ready'?'ALL SYSTEMS OPERATIONAL':'DEGRADED PERFORMANCE';
    document.getElementById('banner').className='status-banner '+(d.status==='ready'?'ok':'warn');
    if(d.checks){document.getElementById('memDetail').textContent=d.checks.memory?'< 350MB':'Over limit';}
  }).catch(function(){setCheck('hc-live',false);setCheck('hc-ready',false);setCheck('hc-db',false);setCheck('hc-mem',false);setCheck('hc-crawler',false);document.getElementById('statusText').textContent='SERVICE UNAVAILABLE';document.getElementById('banner').className='status-banner err';});

  fetch('/api/stats').then(function(r){return r.json();}).then(function(d){
    var total=d.success+d.fail;var errPct=total>0?((d.fail/total)*100):0;
    document.getElementById('slo-err').textContent=errPct.toFixed(1)+'%';
    document.getElementById('slo-err-detail').textContent=d.fail+' errors / '+total+' total';
    document.getElementById('slo-throughput').textContent=(d.rate||0)+' pg/s';
    document.getElementById('slo-throughput-detail').textContent=(d.total||0).toLocaleString()+' pages indexed';
    document.getElementById('slo-domains').textContent=(d.domainsChecked||0).toLocaleString();
    document.getElementById('slo-domains-detail').textContent=(d.domainsBlacklisted||0)+' blacklisted';
    document.getElementById('slo-rss').textContent=d.rssBytes?Math.round(d.rssBytes/1024/1024)+'MB':'вЂ”';
    var up=d.uptime||0;var m=Math.floor(up/60);var h=Math.floor(m/60);var dd=Math.floor(h/24);
    var ts=dd>0?dd+'d '+(h%24)+'h':h>0?h+'h '+m%60+'m':m+'m '+up%60+'s';
    document.getElementById('sys-uptime').textContent=ts;
    document.getElementById('crawlerDetail').textContent=d.rate+' pg/s, '+(d.total||0).toLocaleString()+' pages';
    document.getElementById('diskDetail').textContent='Monitored (80% limit)';
    document.getElementById('sys-node').textContent=d.nodeVersion||'вЂ”';
    document.getElementById('sys-platform').textContent=d.platform?(d.platform+' '+(d.arch||'')):'вЂ”';
    document.getElementById('sys-cpu').textContent=typeof navigator!=='undefined'&&navigator.hardwareConcurrency?navigator.hardwareConcurrency:'вЂ”';
  }).catch(function(){});
  document.getElementById('lastCheck').textContent=new Date().toLocaleTimeString();
}
updateChecks();setInterval(updateChecks,10000);
</script></body></html>`;
