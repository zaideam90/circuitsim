/* ==========================================================================
   editor.js — Editing: undo/redo, clipboard, hit-testing, wire routing, mouse & keyboard interaction
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
// ---------- history / clipboard ----------
const serialize=()=>JSON.stringify({...doc,wires:doc.wires.map(({_o,_m,...w})=>w)});
function pushHistory(){ history.push(serialize()); if (history.length>60) history.shift(); future=[]; }
function autosave(){ try{ localStorage.setItem('circuitsim.autosave',serialize()); }catch(e){} }
setInterval(()=>{ if (!running) autosave(); },3000); window.addEventListener('beforeunload',autosave);
function restore(s){ doc=JSON.parse(s); clearSel(); renderProps(); draw(); }
function undo(){ if(!history.length||running) return; future.push(serialize()); restore(history.pop()); }
function redo(){ if(!future.length||running) return; history.push(serialize()); restore(future.pop()); }
function copySel(){ if(!selCount()) return; clipboard={comps:doc.comps.filter(c=>sel.comps.has(c.id)).map(c=>({...c})),wires:doc.wires.filter(w=>sel.wires.has(w.id)).map(w=>({...w}))}; }
function paste(){ if(!clipboard||running) return; pushHistory(); clearSel(); for (const c of clipboard.comps){ const n={...c,id:doc.nextId++,x:c.x+2,y:c.y+2}; if (Array.isArray(n.xfn)) n.xfn=[...n.xfn]; if (Array.isArray(n.rfn)) n.rfn=[...n.rfn]; doc.comps.push(n); sel.comps.add(n.id); } for (const w of clipboard.wires){ const n={...w,id:doc.nextId++,ax:w.ax+2,ay:w.ay+2,bx:w.bx+2,by:w.by+2}; doc.wires.push(n); sel.wires.add(n.id); } renderProps(); draw(); }

// ---------- hit testing / editing ----------
function hitComp(wx,wy){ for (let i=doc.comps.length-1;i>=0;i--){ const c=doc.comps[i],b=bbox(c); if (wx>=b.x*G&&wx<=(b.x+b.w)*G&&wy>=b.y*G&&wy<=(b.y+b.h)*G) return c; } return null; }
function hitWire(wx,wy){ for (let i=doc.wires.length-1;i>=0;i--){ const w=doc.wires[i]; const tol=Math.max(7,(w.w||2)/2+3)/view.z; const ax=w.ax*G,ay=w.ay*G,bx=w.bx*G,by=w.by*G; const L2=(bx-ax)**2+(by-ay)**2; let t=L2?((wx-ax)*(bx-ax)+(wy-ay)*(by-ay))/L2:0; t=Math.max(0,Math.min(1,t)); if (Math.hypot(wx-(ax+t*(bx-ax)),wy-(ay+t*(by-ay)))<=tol) return w; } return null; }
function nearestNode(wx,wy){ const gx=Math.round(wx/G),gy=Math.round(wy/G); const p={x:gx,y:gy}; const k=key(gx,gy); if (nodePoints().some(q=>key(q.x,q.y)===k)) return p; if (doc.wires.some(w=>!w.cut&&onSegment(p,w))) return p; return null; }
function markMove(w,end){ if (w._o===undefined) w._o=(w.ay===w.by)?'h':'v'; w._m=end; }
function relaxWires(){
  const termKeys=new Set(); for (const c of doc.comps) for (const t of terminals(c)) termKeys.add(key(t.x,t.y));
  for (const w of doc.wires){
    if (!w._o||!w._m) continue; if (w.ax===w.bx||w.ay===w.by) continue;
    const m=w._m==='a'?{x:w.ax,y:w.ay}:{x:w.bx,y:w.by}, pk=w._m==='a'?'b':'a', p=pk==='a'?{x:w.ax,y:w.ay}:{x:w.bx,y:w.by};
    if (termKeys.has(key(p.x,p.y))) continue;
    const touching=doc.wires.filter(o=>o!==w&&((o.ax===p.x&&o.ay===p.y)||(o.bx===p.x&&o.by===p.y)));
    const passing=doc.wires.filter(o=>o!==w&&!touching.includes(o)&&onSegment(p,o));
    if (touching.length!==1||passing.length) continue;
    const o=touching[0]; const oV=o.ax===o.bx,oH=o.ay===o.by; let np=null;
    if (w._o==='h'&&oV) np={x:p.x,y:m.y}; else if (w._o==='v'&&oH) np={x:m.x,y:p.y};
    if (!np) continue;
    if (pk==='a'){ w.ax=np.x; w.ay=np.y; } else { w.bx=np.x; w.by=np.y; }
    if (o.ax===p.x&&o.ay===p.y){ o.ax=np.x; o.ay=np.y; } else { o.bx=np.x; o.by=np.y; }
  }
}
function fixWires(){ relaxWires(); const out=[]; for (const w of doc.wires){ if (w.ax===w.bx&&w.ay===w.by) continue; if (w.ax!==w.bx&&w.ay!==w.by){ const a={x:w.ax,y:w.ay},b={x:w.bx,y:w.by}; let segs; if (w._o&&w._m){ const f=w._m==='a'?b:a,m=w._m==='a'?a:b; const mid=w._o==='v'?{x:f.x,y:m.y}:{x:m.x,y:f.y}; segs=[{ax:f.x,ay:f.y,bx:mid.x,by:mid.y},{ax:mid.x,ay:mid.y,bx:m.x,by:m.y}]; } else segs=elbow(a,b); for (const sg of segs) if (!(sg.ax===sg.bx&&sg.ay===sg.by)) out.push({id:doc.nextId++,...sg,cut:w.cut,hidden:w.hidden,w:w.w,color:w.color,bus:w.bus}); } else { delete w._o; delete w._m; out.push(w); } } doc.wires=out; }
function moveWireEnd(w,end,nx,ny){ markMove(w,end); if (end==='a'){ w.ax=nx; w.ay=ny; } else { w.bx=nx; w.by=ny; } }
function wireById(id){ return doc.wires.find(w=>w.id===id); }
function moveWireSeg(w,nx,ny){ const oA={x:w.ax,y:w.ay},oB={x:w.bx,y:w.by}; if (w.ay===w.by){ if (ny===w.ay) return; w.ay=w.by=ny; } else { if (nx===w.ax) return; w.ax=w.bx=nx; } const nA={x:w.ax,y:w.ay},nB={x:w.bx,y:w.by};
  for (const o of doc.wires){ if (o===w) continue; if (o.ax===oA.x&&o.ay===oA.y){ markMove(o,'a'); o.ax=nA.x; o.ay=nA.y; } else if (o.ax===oB.x&&o.ay===oB.y){ markMove(o,'a'); o.ax=nB.x; o.ay=nB.y; } if (o.bx===oA.x&&o.by===oA.y){ markMove(o,'b'); o.bx=nA.x; o.by=nA.y; } else if (o.bx===oB.x&&o.by===oB.y){ markMove(o,'b'); o.bx=nB.x; o.by=nB.y; } } fixWires(); }
function remapWires(old,nw){ for (const w of doc.wires) old.forEach((o,i)=>{ if (w.ax===o.x&&w.ay===o.y){ markMove(w,'a'); w.ax=nw[i].x; w.ay=nw[i].y; } if (w.bx===o.x&&w.by===o.y){ markMove(w,'b'); w.bx=nw[i].x; w.by=nw[i].y; } }); fixWires(); }
function moveComp(c,nx,ny){ const old=terminals(c); c.x=nx; c.y=ny; remapWires(old,terminals(c)); }
function rotateComp(c){ pushHistory(); const old=terminals(c); c.rot=(c.rot+1)%4; remapWires(old,terminals(c)); }
function startGroupDrag(){ const comps=[...sel.comps].map(id=>doc.comps.find(c=>c.id===id)).filter(Boolean); return {kind:'group',snap:cloneWires(),orig:comps.map(c=>({c,x:c.x,y:c.y,terms:terminals(c)})),gx:mouse.gx,gy:mouse.gy,moved:false,hist:serialize()}; }
function applyGroupDrag(d){
  const dx=mouse.gx-d.gx,dy=mouse.gy-d.gy; if (dx===0&&dy===0&&!d.moved) return; d.moved=true;
  const oldT=[],newT=[];
  for (const o of d.orig){ o.c.x=o.x+dx; o.c.y=o.y+dy; const nt=terminals(o.c); o.terms.forEach((t,i)=>{ oldT.push(t); newT.push(nt[i]); }); }
  doc.wires=d.snap.map(w=>({...w}));
  for (const w of doc.wires){ if (sel.wires.has(w.id)){ w.ax+=dx; w.ay+=dy; w.bx+=dx; w.by+=dy; continue; } oldT.forEach((o,i)=>{ if (w.ax===o.x&&w.ay===o.y){ markMove(w,'a'); w.ax=newT[i].x; w.ay=newT[i].y; } if (w.bx===o.x&&w.by===o.y){ markMove(w,'b'); w.bx=newT[i].x; w.by=newT[i].y; } }); }
  fixWires();
}
function toWorld(e){ const r=cv.getBoundingClientRect(); const x=(e.clientX-r.left-view.x)/view.z,y=(e.clientY-r.top-view.y)/view.z; return {x,y,gx:Math.round(x/G),gy:Math.round(y/G)}; }
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('mousemove',e=>{ mouse=toWorld(e); document.getElementById('coords').textContent=`${mouse.gx}, ${mouse.gy}`;
  if (drag){ if (drag.kind==='pan'){ view.x+=e.movementX; view.y+=e.movementY; } else if (drag.kind==='group') applyGroupDrag(drag); else if (drag.kind==='probe'){ const p=nearestNode(mouse.x,mouse.y); if (p) meter[drag.which]=p; } else if (drag.kind==='mbox'){ meter.off={x:mouse.x-drag.sx,y:mouse.y-drag.sy}; } else if (drag.kind==='wend'){ doc.wires=drag.snap.map(w=>({...w})); moveWireEnd(wireById(drag.id),drag.end,mouse.gx,mouse.gy); } else if (drag.kind==='wseg'){ doc.wires=drag.snap.map(w=>({...w})); moveWireSeg(wireById(drag.id),mouse.gx,mouse.gy); } }
  draw(); });
function runClick(c){
  if (c.type==='pb_no'||c.type==='pb_nc') c.pressed=true;
  else if (MANUAL_SW.includes(c.type)){ c.on=!c.on; log(T(c.on?'m_swOn':'m_swOff',c.label)); }
  else if (TYPES[c.type].kind==='sensor'){ c.on=!c.on; log(T(c.on?'m_sensOn':'m_sensOff',c.label)); }
  else if (c.type==='ats'){ if (c.mode==='manual'){ c.target=c.target===1?0:c.target===0?(c.pos===1?2:1):0; log(T('m_atsCmd',c.label,c.target,'manual'),'good'); } }
  else if (c.type==='rcd2'||c.type==='rcd4'){ if (c.tripped){ c.tripped=false; c.on=true; log(T('m_mcbReset',c.label),'good'); } else { c.tripped=true; log(T('m_rcdTest',c.label)); } }
  else if (isBrk(c.type)){ if (c.tripped&&!c.hidden){ c.tripped=false; c.on=true; c.heat=0; log(T('m_mcbReset',c.label),'good'); } else if (!c.hidden){ c.on=!c.on; log(T(c.on?'m_mcbOn':'m_mcbOff',c.label)); } }
  else if (c.type==='ol3'||c.type==='ol'){ c.tripped=!c.tripped; c.heat=0; log(T(c.tripped?'m_olTest':'m_olReset',c.label)); }
  else if (c.type==='fuse'&&c.blown&&!c.hidden){ c.blown=false; c.heat=0; log(T('m_fuseNew',c.label),'good'); }
  else if ((c.type==='vfd'||c.type==='softstart')&&c.fault){ c.fault=null; c.heat=0; log(T('m_vfdKey',c.label),'good'); }
  else if (c.type==='dcps'&&c.tripped){ c.tripped=false; log(T('m_dcReset',c.label),'good'); }
  else if (c.burnt&&!c.hidden){ c.burnt=false; c.stress=0; log(T('m_replaced',c.label),'good'); }
}
cv.addEventListener('mousedown',e=>{
  mouse=toWorld(e); cv.focus();
  if (e.button===1){ drag={kind:'pan'}; e.preventDefault(); return; }
  if (e.button===2){ if ((tool==='wire'||tool==='bus')&&wireStart){ wireStart=null; draw(); } else if (tool==='meter'&&meter.a&&!meter.b){ meter.a=null; draw(); } else cancelTool(); return; }
  { const near=q=>q&&Math.hypot(mouse.x-q.x*G,mouse.y-q.y*G)<10/view.z;
    if (meter.box&&mouse.x>=meter.box.x&&mouse.x<=meter.box.x+meter.box.w&&mouse.y>=meter.box.y&&mouse.y<=meter.box.y+meter.box.h){ if (mouse.x>=meter.box.closeX){ meter.a=null; meter.b=null; meter.box=null; draw(); return; } drag={kind:'mbox',sx:mouse.x-meter.off.x,sy:mouse.y-meter.off.y}; return; }
    if (near(meter.a)){ drag={kind:'probe',which:'a'}; return; } if (near(meter.b)){ drag={kind:'probe',which:'b'}; return; }
    if (meter.clamp!==null&&meter.cbox&&((mouse.x>=meter.cbox.x&&mouse.x<=meter.cbox.x+meter.cbox.w&&mouse.y>=meter.cbox.y&&mouse.y<=meter.cbox.y+meter.cbox.h)||Math.hypot(mouse.x-meter.cbox.cx,mouse.y-meter.cbox.cy)<12/view.z)){ meter.clamp=null; meter.cbox=null; draw(); return; } }
  if (linkFrom!==null){ const n=doc.comps.find(x=>x.id===linkFrom); const c=hitComp(mouse.x,mouse.y); const w=(!c||c===n)?hitWire(mouse.x,mouse.y):null; if (n&&((c&&c!==n)||w)){ pushHistory(); const tgt=c&&c!==n?{kind:'comp',id:c.id}:{kind:'wire',id:w.id}; const i=(n.links||[]).findIndex(l=>l.kind===tgt.kind&&l.id===tgt.id); if (i>=0) n.links.splice(i,1); else (n.links=n.links||[]).push(tgt); renderProps(); draw(); } return; }
  if (ex.guessing){ const c=hitComp(mouse.x,mouse.y); const w=c?null:hitWire(mouse.x,mouse.y); if (c||w) exGuess(c,w); return; }
  if (tool==='meter'){ const p=nearestNode(mouse.x,mouse.y); if (!p) return; if (!meter.a||meter.b){ meter.a=p; meter.b=null; } else meter.b=p; draw(); return; }
  if (tool==='clamp'){ const w=hitWire(mouse.x,mouse.y); meter.clamp=w?w.id:null; if (running&&w&&sim.r) meter.clampI=currentThrough(null,sim.r,w.id); draw(); return; }
  if (running){ const c=hitComp(mouse.x,mouse.y); if (c){ runClick(c); return; } const w=hitWire(mouse.x,mouse.y); if (w&&!w.hidden){ w.cut=!w.cut; log(T(w.cut?'wireCut':'wireFix'),w.cut?'fault':'good'); } return; }
  if (TYPES[tool]){ pushHistory(); const nc=addComp(tool,mouse.gx,mouse.gy,rotGhost); setStatus(T('added',tname(tool))); if (!e.shiftKey){ setTool('select'); clearSel(); sel.comps.add(nc.id); renderProps(); } draw(); return; }
  if (tool==='wire'||tool==='bus'){ if(!wireStart) wireStart={x:mouse.gx,y:mouse.gy}; else { pushHistory(); const st=tool==='bus'?{w:8,color:'#B87333',bus:true}:wireStyle; for (const s of elbow(wireStart,{x:mouse.gx,y:mouse.gy})) addWire(s.ax,s.ay,s.bx,s.by,st); wireStart={x:mouse.gx,y:mouse.gy}; } draw(); return; }
  const add=e.ctrlKey||e.shiftKey; const c=hitComp(mouse.x,mouse.y);
  if (c){ if (add){ if (sel.comps.has(c.id)) sel.comps.delete(c.id); else sel.comps.add(c.id); } else if (!sel.comps.has(c.id)){ clearSel(); sel.comps.add(c.id); } if (sel.comps.has(c.id)) drag=startGroupDrag(); }
  else { const w=hitWire(mouse.x,mouse.y);
    if (w){ if (add){ if (sel.wires.has(w.id)) sel.wires.delete(w.id); else sel.wires.add(w.id); } else if (!sel.wires.has(w.id)||selCount()>1){ clearSel(); sel.wires.add(w.id); }
      if (selCount()>1&&sel.wires.has(w.id)) drag=startGroupDrag();
      else if (sel.wires.has(w.id)){ const tol=8/view.z; const da=Math.hypot(mouse.x-w.ax*G,mouse.y-w.ay*G),db=Math.hypot(mouse.x-w.bx*G,mouse.y-w.by*G); drag=da<=tol?{kind:'wend',id:w.id,end:'a',snap:cloneWires(),hist:serialize()}:db<=tol?{kind:'wend',id:w.id,end:'b',snap:cloneWires(),hist:serialize()}:{kind:'wseg',id:w.id,snap:cloneWires(),hist:serialize()}; } }
    else { if (!add) clearSel(); marquee={x0:mouse.x,y0:mouse.y}; } }
  renderProps(); draw();
});
window.addEventListener('mouseup',()=>{
  if (drag&&drag.hist&&(drag.kind!=='group'||drag.moved)&&serialize()!==drag.hist){ history.push(drag.hist); future=[]; }
  if (drag&&drag.kind==='wend'){ fixWires(); draw(); }
  if (marquee){ const x0=Math.min(marquee.x0,mouse.x)/G,y0=Math.min(marquee.y0,mouse.y)/G,x1=Math.max(marquee.x0,mouse.x)/G,y1=Math.max(marquee.y0,mouse.y)/G;
    for (const c of doc.comps){ const b=bbox(c); if (b.x<x1&&b.x+b.w>x0&&b.y<y1&&b.y+b.h>y0) sel.comps.add(c.id); }
    for (const w of doc.wires){ if (w.ax>=x0&&w.ax<=x1&&w.bx>=x0&&w.bx<=x1&&w.ay>=y0&&w.ay<=y1&&w.by>=y0&&w.by<=y1) sel.wires.add(w.id); }
    marquee=null; renderProps(); draw(); }
  drag=null; if (running) for (const c of doc.comps) if (c.type==='pb_no'||c.type==='pb_nc') c.pressed=false; });
cv.addEventListener('dblclick',()=>{ const near=q=>q&&Math.hypot(mouse.x-q.x*G,mouse.y-q.y*G)<10/view.z; if (near(meter.a)||near(meter.b)){ meter.a=null; meter.b=null; meter.box=null; draw(); return; } if (meter.clamp!==null){ const w=hitWire(mouse.x,mouse.y); if (w&&w.id===meter.clamp){ meter.clamp=null; draw(); return; } } if (tool==='wire'||tool==='bus'){ wireStart=null; draw(); } });
cv.addEventListener('wheel',e=>{ e.preventDefault(); const r=cv.getBoundingClientRect(); const mx=e.clientX-r.left,my=e.clientY-r.top; const f=e.deltaY<0?1.1:1/1.1; const nz=Math.max(0.25,Math.min(3,view.z*f)); view.x=mx-(mx-view.x)*(nz/view.z); view.y=my-(my-view.y)*(nz/view.z); view.z=nz; draw(); },{passive:false});
cv.tabIndex=0;
window.addEventListener('keydown',e=>{
  if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)) return;
  const k=e.code, ctrl=e.ctrlKey||e.metaKey;
  if (e.key==='Escape') cancelTool();
  else if (ctrl&&k==='KeyZ'){ e.preventDefault(); undo(); } else if (ctrl&&k==='KeyY'){ e.preventDefault(); redo(); }
  else if (ctrl&&k==='KeyC'){ copySel(); } else if (ctrl&&k==='KeyV'){ paste(); }
  else if (ctrl&&k==='KeyA'&&!running){ e.preventDefault(); clearSel(); doc.comps.forEach(c=>sel.comps.add(c.id)); doc.wires.forEach(w=>sel.wires.add(w.id)); renderProps(); draw(); }
  else if (k==='KeyR'){ if (TYPES[tool]) rotGhost=(rotGhost+1)%4; else if (sel.comps.size===1&&!running){ const c=doc.comps.find(x=>sel.comps.has(x.id)); if(c) rotateComp(c); } draw(); }
  else if (k==='KeyF'){ wireFlip=!wireFlip; draw(); }
  else if (k==='KeyZ'){ if (!running) setTool('wire'); } else if (k==='KeyB'){ if (!running) setTool('bus'); }
  else if (k==='KeyM'){ setTool('meter'); } else if (k==='KeyA'){ setTool('clamp'); }
  else if (e.key==='Delete'||e.key==='Backspace') deleteSel();
  else if (k==='Space'){ e.preventDefault(); toggleRun(); }
});
function cancelTool(){ wireStart=null; linkFrom=null; if (!running) renderProps(); if (tool==='meter'&&meter.a&&!meter.b) meter.a=null; setTool('select'); }
function deleteSel(){ if (!selCount()&&(meter.a||meter.clamp!==null)){ meter.a=null; meter.b=null; meter.box=null; meter.clamp=null; draw(); return; } if(running||!selCount()) return; pushHistory(); doc.comps=doc.comps.filter(c=>!sel.comps.has(c.id)); doc.wires=doc.wires.filter(w=>!sel.wires.has(w.id)); for (const n of doc.comps) if (n.links) n.links=n.links.filter(l=>l.kind==='comp'?doc.comps.some(c=>c.id===l.id):doc.wires.some(w=>w.id===l.id)); clearSel(); renderProps(); draw(); }

// ---------- touch support (single finger = mouse, two fingers = pinch zoom / pan) ----------
(function(){
  let pinch=null;
  const fire=(type,t,extra)=>cv.dispatchEvent(new MouseEvent(type,{clientX:t.clientX,clientY:t.clientY,button:0,buttons:1,bubbles:true,...(extra||{})}));
  cv.addEventListener('touchstart',e=>{ e.preventDefault(); if (e.touches.length===2){ const [a,b]=e.touches; pinch={d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),cx:(a.clientX+b.clientX)/2,cy:(a.clientY+b.clientY)/2,z:view.z,vx:view.x,vy:view.y}; drag=null; return; } fire('mousemove',e.touches[0]); fire('mousedown',e.touches[0]); },{passive:false});
  cv.addEventListener('touchmove',e=>{ e.preventDefault(); if (pinch&&e.touches.length===2){ const [a,b]=e.touches; const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),cx=(a.clientX+b.clientX)/2,cy=(a.clientY+b.clientY)/2; const r=cv.getBoundingClientRect(); const nz=Math.max(0.25,Math.min(3,pinch.z*d/pinch.d)); const px=pinch.cx-r.left,py=pinch.cy-r.top; view.z=nz; view.x=(cx-r.left)-(px-pinch.vx)*(nz/pinch.z); view.y=(cy-r.top)-(py-pinch.vy)*(nz/pinch.z); draw(); return; } if (e.touches.length===1) fire('mousemove',e.touches[0]); },{passive:false});
  cv.addEventListener('touchend',e=>{ e.preventDefault(); if (pinch){ if (e.touches.length<2) pinch=null; return; } const t=e.changedTouches[0]; window.dispatchEvent(new MouseEvent('mouseup',{clientX:t.clientX,clientY:t.clientY,button:0,bubbles:true})); },{passive:false});
  // long-press = right-click (finish wire / cancel tool)
  let lp=null; cv.addEventListener('touchstart',e=>{ if (e.touches.length===1){ const t=e.touches[0]; lp=setTimeout(()=>{ cv.dispatchEvent(new MouseEvent('mousedown',{clientX:t.clientX,clientY:t.clientY,button:2,bubbles:true})); },600); } },{passive:true});
  ['touchend','touchmove','touchcancel'].forEach(ev=>cv.addEventListener(ev,()=>{ if (lp){ clearTimeout(lp); lp=null; } },{passive:true}));
})();
