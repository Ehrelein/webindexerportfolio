export const SEARCH_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Web Search</title><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{background:#141414;color:#bbb;font-family:'Segoe UI',Arial,sans-serif;min-height:100vh;}
.hdr{text-align:center;padding:60px 20px 10px;}
.hdr h1{color:#00ff41;font-size:32px;letter-spacing:6px;text-transform:uppercase;font-weight:300;}
.hdr .sub{color:#00ff4144;font-size:12px;margin-top:6px;letter-spacing:2px;}
.sb2{max-width:620px;margin:24px auto;display:flex;gap:8px;padding:0 16px;}
.sb2 input{flex:1;padding:14px 18px;background:#1e1e1e;border:2px solid #00ff4133;color:#00ff41;font-size:16px;border-radius:10px;outline:none;font-family:inherit;transition:border-color .2s;}
.sb2 input:focus{border-color:#00ff41;}
.sb2 input::placeholder{color:#00ff4144;}
.sb2 button{padding:14px 28px;background:#00ff4122;border:2px solid #00ff41;color:#00ff41;font-size:13px;cursor:pointer;border-radius:10px;font-family:inherit;text-transform:uppercase;letter-spacing:1px;transition:background .2s;}
.sb2 button:hover{background:#00ff4133;}
.info{text-align:center;font-size:12px;color:#00ff4155;margin:8px 0;}
.results{max-width:680px;margin:16px auto;padding:0 20px;}
.res{margin-bottom:28px;}
.res-t{color:#7fbfff;font-size:17px;cursor:pointer;text-decoration:none;display:block;margin-bottom:2px;line-height:1.3;}
.res-t:hover{text-decoration:underline;}
.res-u{color:#00ff4188;font-size:12px;margin-bottom:4px;font-family:'Courier New',monospace;}
.res-s{color:#888;font-size:14px;line-height:1.5;}
.res-t em{color:#00ff41;font-style:normal;font-weight:bold;text-decoration:underline;}
.res-s em{color:#00ff41;font-style:normal;font-weight:bold;background:#00ff4118;padding:0 2px;border-radius:2px;}
.nf{text-align:center;color:#00ff4144;padding:60px 20px;font-size:15px;}
.back{position:fixed;top:16px;left:16px;color:#00ff4155;text-decoration:none;font-size:12px;letter-spacing:1px;text-transform:uppercase;transition:color .2s;}
.back:hover{color:#00ff41;}
</style></head><body>
<a class="back" href="/">&larr; Graph</a>
<div class="hdr"><h1>Web Search</h1><div class="sub">search across <span id="tc">0</span> crawled pages</div></div>
<form class="sb2" id="sf"><input type="text" id="si" placeholder="Search websites..." autofocus autocomplete="off"><button type="submit">Search</button></form>
<div class="info" id="info"></div>
<div class="results" id="res"></div>
<script>
var sf=document.getElementById('sf'),si=document.getElementById('si'),info=document.getElementById('info'),res=document.getElementById('res');
var params=new URLSearchParams(window.location.search);
if(params.get('q')){si.value=params.get('q');doSearch(params.get('q'));}
fetch('/api/stats').then(function(r){return r.json();}).then(function(d){document.getElementById('tc').textContent=d.total||0;}).catch(function(){});
sf.addEventListener('submit',function(e){e.preventDefault();var q=si.value.trim();if(!q)return;history.replaceState(null,'','?q='+encodeURIComponent(q));doSearch(q);});
function esc(s){var d=document.createElement('div');d.appendChild(document.createTextNode(s));return d.innerHTML;}
function hl(text,words){if(!text)return'';var s=esc(text);words.forEach(function(w){var lw=w.toLowerCase();var ls=s.toLowerCase();var i=ls.indexOf(lw);while(i>=0){var tag='<em>';var end='</em>';s=s.substring(0,i)+tag+s.substring(i,i+w.length)+end+s.substring(i+w.length);i=ls.indexOf(lw,i+tag.length+w.length+end.length);}});return s;}
function doSearch(q){info.textContent='Searching...';res.innerHTML='';fetch('/api/search?q='+encodeURIComponent(q)).then(function(r){return r.json();}).then(function(d){if(d.error){info.textContent='Error: '+d.error;return;}if(!d.results.length){info.textContent='';res.innerHTML='<div class="nf">No results for "'+esc(q)+'"</div>';return;}info.textContent=d.results.length+' results';var words=q.toLowerCase().split(/\\s+/);var h='';d.results.forEach(function(r){var sn=r.metaDescription||r.ogDescription||'';var ti=r.title||r.ogTitle||r.url;h+='<div class="res"><a class="res-t" href="'+esc(r.url)+'" target="_blank">'+hl(ti,words)+'</a><div class="res-u">'+esc(r.domain)+' &middot; '+esc(r.url)+'</div><div class="res-s">'+hl(sn.slice(0,250),words)+'</div></div>';});res.innerHTML=h;}).catch(function(e){info.textContent='Error: '+e.message;});}
</script></body></html>`;
