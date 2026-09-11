/* ==========================================================================
   render.js — Canvas rendering of wires, components, meters, export helpers
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
// ---------- rendering ----------
function resize(){ cv.width=stage.clientWidth*devicePixelRatio; cv.height=stage.clientHeight*devicePixelRatio; cv.style.width=stage.clientWidth+'px'; cv.style.height=stage.clientHeight+'px'; draw(); }
window.addEventListener('resize',resize);
const colorsOn=()=>running&&showCol&&!ex.active;
function potAt(p){ const k=key(p.x,p.y); if (sim.pot.has(k)) return sim.pot.get(k); const w=doc.wires.find(w=>!w.cut&&onSegment(p,w)); return w?(sim.pot.get(key(w.ax,w.ay))||'0'):'0'; }
function potColors(x,y){ if(!colorsOn()) return [C.ink]; const p=sim.pot.get(key(x,y)); if(p==='short') return [C.short]; if(!p||p==='0') return [C.dead]; if(p==='PE') return [C.PE,C.PEy]; return p.split('|').map(n=>C[base(n)]||C.dead); }
function strokeMulti(x1,y1,x2,y2,cols,width){ ctx.lineWidth=width||2; if (cols.length<=1){ ctx.strokeStyle=cols[0]; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); return; } const seg=10; cols.forEach((col,i)=>{ ctx.strokeStyle=col; ctx.setLineDash([seg,seg*(cols.length-1)]); ctx.lineDashOffset=-seg*i; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }); ctx.setLineDash([]); ctx.lineDashOffset=0; }
function upright(c,x,y,fn){ ctx.save(); ctx.translate(x,y); ctx.rotate(-c.rot*Math.PI/2); fn(); ctx.restore(); }
function text(s,x,y,size,col,weight,align){ ctx.fillStyle=col||C.ink; ctx.font=`${weight||500} ${size||10}px IBM Plex Sans, sans-serif`; ctx.textAlign=align||'center'; ctx.textBaseline='middle'; ctx.fillText(s,x,y); }
function draw(target){
  const W=stage.clientWidth,H=stage.clientHeight;
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0); ctx.fillStyle=C.paper; ctx.fillRect(0,0,W*2,H*2);
  ctx.translate(view.x,view.y); ctx.scale(view.z,view.z);
  const Wz=W/view.z,Hz=H/view.z,ox=-view.x/view.z,oy=-view.y/view.z;
  if (!target){ ctx.fillStyle=C.grid; const gx0=Math.floor(ox/G)*G,gy0=Math.floor(oy/G)*G; for (let x=gx0;x<ox+Wz;x+=G) for (let y=gy0;y<oy+Hz;y+=G) ctx.fillRect(x-0.75,y-0.75,1.5,1.5); }
  ctx.lineCap='round'; ctx.lineJoin='round';
  for (const w of doc.wires){
    const isSel=sel.wires.has(w.id); const wcols=isSel?[C.sel]:potColors(w.ax,w.ay);
    const ax=w.ax*G,ay=w.ay*G,bx=w.bx*G,by=w.by*G;
    if (w.cut&&!w.hidden){ const mx=(ax+bx)/2,my=(ay+by)/2,dx=bx-ax,dy=by-ay,L=Math.hypot(dx,dy)||1,ux=dx/L*7,uy=dy/L*7; ctx.strokeStyle=C.dead; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(mx-ux,my-uy); ctx.moveTo(mx+ux,my+uy); ctx.lineTo(bx,by); ctx.stroke(); ctx.strokeStyle=C.L1; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(mx-5,my-5); ctx.lineTo(mx+5,my+5); ctx.moveTo(mx+5,my-5); ctx.lineTo(mx-5,my+5); ctx.stroke(); }
    else { const ww=w.w||2; ctx.lineCap=w.bus?'butt':'round'; if (w.color){ ctx.strokeStyle=isSel?C.sel:w.color; ctx.lineWidth=ww; ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke(); if (colorsOn()&&!isSel) strokeMulti(ax,ay,bx,by,wcols,Math.max(1.5,ww*0.35)); } else strokeMulti(ax,ay,bx,by,wcols,isSel?ww+2:ww); ctx.lineCap='round'; }
    if (isSel&&!running){ ctx.fillStyle=C.white; ctx.strokeStyle=C.sel; ctx.lineWidth=1.5; for (const [x,y] of [[ax,ay],[bx,by]]){ ctx.beginPath(); ctx.rect(x-4,y-4,8,8); ctx.fill(); ctx.stroke(); } }
    if (meter.clamp===w.id){ const mx=(ax+bx)/2,my=(ay+by)/2; ctx.strokeStyle='#37474F'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(mx,my,9,0.4,Math.PI*2-0.4); ctx.stroke(); ctx.fillStyle='#37474F'; ctx.beginPath(); ctx.roundRect(mx+12,my-10,78,20,4); ctx.fill(); text(running?`${meter.clampI.toFixed(2)} A`:'-- A',mx+40,my,11,'#69F0AE',600); text('✕',mx+79,my,10,'#B0BEC5',600); meter.cbox={x:mx+12,y:my-10,w:78,h:20,cx:mx,cy:my}; }
  }
  const deg=new Map(),pts=nodePoints();
  for (const w of doc.wires) for (const p of pts) if (onSegment(p,w)){ const k=key(p.x,p.y); const interior=!((p.x===w.ax&&p.y===w.ay)||(p.x===w.bx&&p.y===w.by)); deg.set(k,(deg.get(k)||0)+(interior?2:1)); }
  for (const c of doc.comps) for (const t of terminals(c)){ const k=key(t.x,t.y); deg.set(k,(deg.get(k)||0)+1); }
  for (const p of pts) if ((deg.get(key(p.x,p.y))||0)>=3){ ctx.fillStyle=potColors(p.x,p.y)[0]; ctx.beginPath(); ctx.arc(p.x*G,p.y*G,3.5,0,Math.PI*2); ctx.fill(); }
  if ((tool==='wire'||tool==='bus')&&wireStart){ const segs=elbow(wireStart,{x:mouse.gx,y:mouse.gy}); ctx.strokeStyle=C.sel; ctx.lineWidth=tool==='bus'?8:2; ctx.setLineDash([6,4]); ctx.beginPath(); ctx.moveTo(wireStart.x*G,wireStart.y*G); for (const s of segs) ctx.lineTo(s.bx*G,s.by*G); ctx.stroke(); ctx.setLineDash([]); }
  for (const n of doc.comps) if (n.type==='note') for (const l of (n.links||[])){ let tx,ty; if (l.kind==='comp'){ const c=doc.comps.find(x=>x.id===l.id); if(!c) continue; tx=c.x*G; ty=c.y*G; } else { const w=doc.wires.find(x=>x.id===l.id); if(!w) continue; tx=(w.ax+w.bx)/2*G; ty=(w.ay+w.by)/2*G; } ctx.strokeStyle='#B0A060'; ctx.lineWidth=1; ctx.setLineDash([4,4]); ctx.beginPath(); ctx.moveTo(n.x*G,n.y*G); ctx.lineTo(tx,ty); ctx.stroke(); ctx.setLineDash([]); ctx.fillStyle='#B0A060'; ctx.beginPath(); ctx.arc(tx,ty,2.5,0,Math.PI*2); ctx.fill(); }
  for (const c of doc.comps) drawComp(c,sel.comps.has(c.id));
  if (marquee){ ctx.strokeStyle=C.sel; ctx.fillStyle='rgba(233,164,0,0.08)'; ctx.lineWidth=1; ctx.setLineDash([5,3]); const x=Math.min(marquee.x0,mouse.x),y=Math.min(marquee.y0,mouse.y),w=Math.abs(mouse.x-marquee.x0),h=Math.abs(mouse.y-marquee.y0); ctx.fillRect(x,y,w,h); ctx.strokeRect(x,y,w,h); ctx.setLineDash([]); }
  if (TYPES[tool]&&!drag&&!target){ ctx.globalAlpha=0.45; drawComp({id:-1,type:tool,label:TYPES[tool].prefix||TYPES[tool].src,x:mouse.gx,y:mouse.gy,rot:rotGhost,...defaults(tool)},false,true); ctx.globalAlpha=1; }
  // voltmeter probes
  const probe=(p,col,lab)=>{ ctx.fillStyle=col; ctx.beginPath(); ctx.arc(p.x*G,p.y*G,5,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=C.white; ctx.lineWidth=1.5; ctx.stroke(); text(lab,p.x*G,p.y*G-11,9,col,600); };
  if (meter.a) probe(meter.a,'#D8322A','V+'); if (meter.b) probe(meter.b,'#1E2A32','V−');
  if (meter.a&&meter.b){ const p=meter.b; let s=T('meterOff'), col='#FFD740';
    if (running){ const pa=potAt(meter.a),pb=potAt(meter.b);
      if (pa==='short'||pb==='short'){ s=T('meterShort'); col='#FF5252'; } else if (pa.includes('|')||pb.includes('|')){ s=T('meterFloat'); col='#FFD740'; } else { s=`${voltBetween(pa,pb).toFixed(0)} ${T('meterV')}`; col='#69F0AE'; } }
    const bw=Math.max(70,s.length*7+16), bx=p.x*G+meter.off.x, by=p.y*G+meter.off.y; meter.box={x:bx,y:by,w:bw,h:24}; ctx.fillStyle='#1B2A32'; ctx.beginPath(); ctx.roundRect(bx,by,bw+22,24,4); ctx.fill(); text(s,bx+bw/2,by+12,12,col,600); text('✕',bx+bw+10,by+12,11,'#B0BEC5',600); meter.box.w=bw+22; meter.box.closeX=bx+bw; ctx.strokeStyle='#546E7A'; ctx.lineWidth=1; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(p.x*G,p.y*G); ctx.lineTo(bx,by+12); ctx.stroke(); ctx.setLineDash([]); } else meter.box=null;
  if (tool==='meter'&&meter.a&&!meter.b&&!target){ ctx.strokeStyle='#D8322A'; ctx.setLineDash([4,4]); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(meter.a.x*G,meter.a.y*G); ctx.lineTo(mouse.gx*G,mouse.gy*G); ctx.stroke(); ctx.setLineDash([]); }
  sparks=sparks.filter(s=>s.until>simTime);
  for (const s of sparks){ ctx.strokeStyle=C.sel; ctx.lineWidth=2; for (let i=0;i<6;i++){ const a=i*1.05+simTime*9,r1=4+Math.random()*4,r2=10+Math.random()*6; ctx.beginPath(); ctx.moveTo(s.x+Math.cos(a)*r1,s.y+Math.sin(a)*r1); ctx.lineTo(s.x+Math.cos(a)*r2,s.y+Math.sin(a)*r2); ctx.stroke(); } }
}
function drawComp(c,selected,ghost){
  const t=TYPES[c.type],px=c.x*G,py=c.y*G,term=terminals(c);
  const cols=term.map(p=>ghost?[C.ink]:potColors(p.x,p.y));
  const st=running?sim.loadState.get(c.id):'off';
  const vis={blown:c.blown&&!c.hidden,burnt:c.burnt&&!c.hidden};
  ctx.save(); ctx.translate(px,py); ctx.rotate(c.rot*Math.PI/2); ctx.lineWidth=2; ctx.lineCap='round';
  const line=(x1,y1,x2,y2,col)=>{ if (Array.isArray(col)) strokeMulti(x1,y1,x2,y2,col,2); else { ctx.strokeStyle=col; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); } };
  if (c.type==='dcps'){
    line(-20,40,-20,20,cols[0]); line(20,40,20,20,cols[1]);
    ctx.strokeStyle=C.ink; ctx.fillStyle=c.tripped?'#FADBD8':C.white; ctx.beginPath(); ctx.rect(-30,-20,60,40); ctx.fill(); ctx.stroke();
    upright(c,0,-5,()=>text(`${c.volts}V DC`,0,0,10,C.ink,600)); upright(c,0,9,()=>text(c.tripped?'FAULT':'+          −',0,0,9,c.tripped?C.L1:C.ink,600));
    if (running&&!c.tripped){ ctx.fillStyle=C.ok; ctx.beginPath(); ctx.arc(22,-12,3,0,Math.PI*2); ctx.fill(); }
  } else if (t.kind==='source'){
    if (t.src==='PE'){ line(0,0,0,-18,cols[0]); ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.moveTo(-12,-18); ctx.lineTo(12,-18); ctx.moveTo(-8,-24); ctx.lineTo(8,-24); ctx.moveTo(-4,-30); ctx.lineTo(4,-30); ctx.stroke(); }
    else { line(0,0,0,-16,cols[0]); ctx.strokeStyle=C.ink; ctx.fillStyle=C.white; ctx.beginPath(); ctx.arc(0,-26,10,0,Math.PI*2); ctx.fill(); ctx.stroke(); upright(c,0,-26,()=>text(t.src.replace('b','′'),0,0,t.src.length>2?7.5:9,cols[0][0],600)); }
  } else if (t.kind==='sensor'){
    for (let i=0;i<3;i++) line((i-1)*2*G,40,(i-1)*2*G,20,cols[i]);
    ctx.strokeStyle=C.ink; ctx.fillStyle=c.on&&running?'#FFF0B8':C.white; ctx.beginPath(); ctx.rect(-40,-24,80,44); ctx.fill(); ctx.stroke();
    upright(c,0,-10,()=>text(c.type==='prox_npn'?'NPN':'PNP',0,0,10,C.ink,600)); upright(c,0,6,()=>text(running?(c.powered?(c.on?'● TARGET':'○ ---'):'no power'):'sensor',0,0,8.5,running&&c.on?C.L1:C.dead,500));
    ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.moveTo(-8,-30); ctx.lineTo(8,-30); ctx.moveTo(-5,-34); ctx.lineTo(5,-34); ctx.stroke();
  } else if (c.type==='ats'){
    for (let i=0;i<8;i++){ const x=(-7+i*2)*G; line(x,-100,x,-80,cols[i]); }
    for (let i=0;i<4;i++){ const x=(-3+i*2)*G; line(x,100,x,80,cols[8+i]); }
    line(-160,-40,-140,-40,cols[12]); line(-160,0,-140,0,cols[13]); line(-160,40,-140,40,cols[14]);
    line(160,-60,140,-60,cols[15]); line(160,-40,140,-40,cols[16]); line(160,20,140,20,cols[17]); line(160,40,140,40,cols[18]);
    ctx.strokeStyle=C.ink; ctx.fillStyle=C.white; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(-140,-80,280,160); ctx.fill(); ctx.stroke();
    // poles: source I lines to y=-50, source II to y=-50, load from y=50; blades
    for (let i=0;i<4;i++){ const lx=(-3+i*2)*G, x1=(-7+i*2)*G, x2=(1+i*2)*G;
      line(x1,-80,x1,-50,cols[i]); line(x2,-80,x2,-50,cols[i+4]); line(lx,80,lx,50,cols[8+i]);
      ctx.strokeStyle=c.pos===1?cols[i][0]:c.pos===2?cols[i+4][0]:C.ink; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(lx,50);
      if (c.pos===1) ctx.lineTo(x1,-50); else if (c.pos===2) ctx.lineTo(x2,-50); else ctx.lineTo(lx,-20); ctx.stroke(); }
    ctx.strokeStyle=C.ink; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(-70,10); ctx.lineTo(70,10); ctx.stroke(); ctx.setLineDash([]);
    upright(c,-80,-66,()=>text('I',0,0,10,C.ink,600)); upright(c,80,-66,()=>text('II',0,0,10,C.ink,600)); upright(c,0,66,()=>text('LOAD',0,0,8,C.dead,600));
    upright(c,-118,-40,()=>text('I',0,0,7,C.ink,500)); upright(c,-118,0,()=>text('II',0,0,7,C.ink,500)); upright(c,-118,40,()=>text('COM',0,0,7,C.ink,500));
    upright(c,118,-50,()=>text('aux I',0,0,7,C.dead,500)); upright(c,118,30,()=>text('aux II',0,0,7,C.dead,500));
    ctx.fillStyle='#1B2A32'; ctx.beginPath(); ctx.roundRect(-46,-8,92,34,4); ctx.fill();
    const posT=c.pos===0?'0':c.pos===1?'I':'II'; upright(c,0,4,()=>text(`${c.mode.toUpperCase()}  POS ${posT}${running&&c.pos!==c.target?' ⟳':''}`,0,0,9,'#69F0AE',600));
    upright(c,0,18,()=>text(running?`S1 ${c.h1?'OK':'--'}   S2 ${c.h2?'OK':'--'}`:'motorised changeover',0,0,7.5,'#B0BEC5',500));
    if (running&&c.mode==='auto'&&c.pending!==undefined&&c.pending!==c.target){ ctx.fillStyle=C.sel; ctx.fillRect(-46,28,92*Math.min(1,c.waitT/Math.max(0.1,c.pending===1?c.retDelay:c.delay)),3); }
  } else if (c.type==='box'){
    for (let i=0;i<4;i++){ const y=(-3+i*2)*G; line(-60,y,-40,y,cols[i]); line(40,y,60,y,cols[i+4]); }
    ctx.strokeStyle=C.ink; ctx.fillStyle=C.white; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(-40,-80,80,160); ctx.fill(); ctx.stroke();
    ctx.setLineDash([3,3]); ctx.lineWidth=1; for (let i=0;i<4;i++){ const y=(-3+i*2)*G; ctx.strokeStyle=cols[i][0]; ctx.beginPath(); ctx.moveTo(-40,y); ctx.lineTo(40,y); ctx.stroke(); } ctx.setLineDash([]);
    upright(c,0,0,()=>{ ctx.fillStyle=C.white; ctx.fillRect(-36,-12,72,24); text(c.label,0,-6,10,C.ink,600); text(c.sub||'',0,7,7.5,C.dead,500); });
  } else if (t.kind==='note'){
    ctx.font='500 11px IBM Plex Sans, sans-serif'; const lines=String(c.text||'').split('\n'); const tw=Math.max(40,...lines.map(l=>(ctx.measureText(l)||{width:l.length*6.5}).width))+16, th=lines.length*15+10;
    c.w=tw/G; c.h=th/G;
    ctx.rotate(-c.rot*Math.PI/2); ctx.fillStyle='#FFF8D6'; ctx.strokeStyle=selected?C.sel:'#D6C77A'; ctx.lineWidth=1; ctx.beginPath(); ctx.rect(-tw/2,-th/2,tw,th); ctx.fill(); ctx.stroke();
    lines.forEach((l,i)=>text(l,0,-th/2+12+i*15,11,C.ink,500));
  } else if (t.kind==='vfd'){
    ctx.strokeStyle=C.ink; ctx.fillStyle=C.white; ctx.beginPath(); ctx.rect(-80,-100,160,200); ctx.fill(); ctx.stroke();
    VFD_T.forEach(([dx,dy],i)=>{ const x=dx*G,y=dy*G; let ex2=x,ey=y; if (dy===-5) ey=y+10; else if (dy===5) ey=y-10; else if (dx===-4) ex2=x+10; else ex2=x-10; line(x,y,ex2,ey,cols[i]); let lx=ex2,ly=ey; if (dy===-5) ly+=8; else if (dy===5) ly-=8; else if (dx===-4) lx+=14; else lx-=14; upright(c,lx,ly,()=>text(VFD_NAMES[i],0,0,7.5,C.ink,500)); });
    upright(c,50,-70,()=>text('R1',0,0,8,C.ink,600)); upright(c,50,10,()=>text('R2',0,0,8,C.ink,600));
    c.xfn.forEach((f,i)=>{ if (f!=='NONE') upright(c,-42,(-4+i)*G,()=>text(f.replace('_',' '),0,0,6.5,C.dead,500,'left')); });
    c.rfn.forEach((f,i)=>upright(c,42,i===0?-50:30,()=>text(f.replace('_',' '),0,0,6.5,C.dead,500,'right')));
    ctx.fillStyle='#1B2A32'; ctx.beginPath(); ctx.rect(-32,-38,64,34); ctx.fill();
    let disp='OFF',dc='#546E7A';
    if (running){ if (!c.powered) disp='OFF'; else if (c.fault){ disp='Err '+c.fault; dc='#FF5252'; } else if (c.running){ disp=`${Math.abs(c.freq).toFixed(1)} Hz`; dc='#69F0AE'; } else { disp='STOP'; dc='#FFD740'; } }
    upright(c,0,-27,()=>text(disp,0,0,11,dc,600));
    upright(c,0,-12,()=>text(running&&c.powered&&!c.fault?(c.freq>0?'▶ FWD':c.freq<0?'◀ REV':'READY')+(c.running?`  ${c.current.toFixed(1)}A`:''):'',0,0,8,'#B0BEC5',500));
    upright(c,0,10,()=>text(`${c.power}kW ${c.volt}V ${c.irated}A`,0,0,8,C.dead,500));
    if (running&&c.powered) for (let i=0;i<2;i++){ ctx.fillStyle=c.rel[i]?C.ok:'#DDD'; ctx.beginPath(); ctx.arc(62,i?12:-68,3,0,Math.PI*2); ctx.fill(); }
    if (running&&c.fault) smoke(0,-100);
  } else if (t.kind==='load6'){
    for (let i=0;i<3;i++){ const x=(i-1)*2*G; line(x,-40,x,-26,cols[i]); line(x,40,x,26,cols[i+3]); }
    ctx.strokeStyle=C.ink; ctx.fillStyle=vis.burnt?C.burnt:st==='delta'?'#FADBD8':st==='star'?'#FFF0B8':st==='loss'?'#FF8A65':C.white; ctx.beginPath(); ctx.arc(0,0,24,0,Math.PI*2); ctx.fill(); ctx.stroke();
    upright(c,0,0,()=>{ text('M',0,-6,11,vis.burnt?C.white:C.ink,600); text(st==='star'?'Y':st==='delta'?'Δ':'3~',0,7,10,vis.burnt?C.white:C.ink,600); });
    if (isOn(st)) spin(0,0,29,st==='star'?0.7:1);
    if (st==='loss'){ const j=Math.sin(simTime*40)*2; ctx.strokeStyle=C.L1; ctx.beginPath(); ctx.arc(j,0,29,0.3,1.0); ctx.moveTo(0,0); ctx.arc(j,0,29,3.4,4.1); ctx.stroke(); }
    if (vis.burnt||(st==='loss'&&c.stress>4)) smoke(0,-26);
  } else if (c.type==='rcd2'||c.type==='rcd4'){
    const n=c.type==='rcd4'?4:2, xs=n===4?[-3,-1,1,3]:[-1,1]; const closed=running?pairClosed(c,0):true; const hw=n===4?70:36;
    for (let i=0;i<n;i++){ const x=xs[i]*G; line(x,-40,x,-30,cols[i]); line(x,40,x,30,cols[n+i]); }
    ctx.strokeStyle=C.ink; ctx.fillStyle=c.tripped?'#FADBD8':C.white; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(-hw,-30,hw*2,60); ctx.fill(); ctx.stroke();
    for (let i=0;i<n;i++){ const x=xs[i]*G; line(x,-30,x,-12,cols[i]); line(x,30,x,12,cols[n+i]); ctx.strokeStyle=closed?cols[i][0]:C.ink; ctx.beginPath(); ctx.moveTo(x,12); if (closed) ctx.lineTo(x,-12); else ctx.lineTo(x+10,-8); ctx.stroke(); }
    ctx.strokeStyle=C.ink; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(-hw+6,0); ctx.lineTo(hw-6,0); ctx.stroke(); ctx.setLineDash([]);
    ctx.lineWidth=1.5; ctx.beginPath(); ctx.ellipse(0,0,hw-4,8,0,0,Math.PI*2); ctx.stroke(); ctx.lineWidth=2;
    ctx.fillStyle=C.sel; ctx.beginPath(); ctx.arc(hw-10,22,4,0,Math.PI*2); ctx.fill(); upright(c,hw-22,22,()=>text('T',0,0,7,C.ink,600));
    upright(c,-hw+20,-22,()=>text(c.tripped?'TRIP':'30mA',0,0,7,c.tripped?C.L1:C.ink,600));
  } else if (c.type==='meterV'||c.type==='meterA'){
    line(-40,0,-14,0,cols[0]); line(14,0,40,0,cols[1]);
    ctx.strokeStyle=C.ink; ctx.fillStyle=C.white; ctx.beginPath(); ctx.arc(0,0,16,0,Math.PI*2); ctx.fill(); ctx.stroke();
    let val='';
    if (running){ if (c.type==='meterV'){ const t2=terminals(c); const v=voltBetween(sim.pot.get(key(t2[0].x,t2[0].y))||'0',sim.pot.get(key(t2[1].x,t2[1].y))||'0'); val=`${Math.round(v)}V`; } else val=`${(c.current||0).toFixed(1)}A`; }
    upright(c,0,0,()=>{ text(c.type==='meterV'?'V':'A',0,-5,10,C.ink,600); if (val) text(val,0,6,7.5,C.L1,600); });
  } else if (c.type==='softstart'){
    ctx.strokeStyle=C.ink; ctx.fillStyle=C.white; ctx.beginPath(); ctx.rect(-80,-100,160,200); ctx.fill(); ctx.stroke();
    const names=['L1','L2','L3','T1','T2','T3','RUN','RST','COM','RA','RC'];
    TYPES.softstart.terms.forEach(([dx,dy],i)=>{ const x=dx*G,y=dy*G; let ex2=x,ey=y; if (dy===-5) ey=y+10; else if (dy===5) ey=y-10; else if (dx===-4) ex2=x+10; else ex2=x-10; line(x,y,ex2,ey,cols[i]); let lx=ex2,ly=ey; if (dy===-5) ly+=8; else if (dy===5) ly-=8; else if (dx===-4) lx+=16; else lx-=14; upright(c,lx,ly,()=>text(names[i],0,0,7,C.ink,500)); });
    ctx.fillStyle='#1B2A32'; ctx.beginPath(); ctx.rect(-32,-38,64,34); ctx.fill();
    let disp='OFF',dc='#546E7A'; if (running){ if (!c.powered) disp='OFF'; else if (c.fault){ disp='Err '+c.fault; dc='#FF5252'; } else if (c.running){ disp=`${Math.round(c.level*100)} %`; dc=c.bypass?'#69F0AE':'#FFD740'; } else { disp='READY'; dc='#FFD740'; } }
    upright(c,0,-27,()=>text(disp,0,0,11,dc,600)); upright(c,0,-12,()=>text(running&&c.running?(c.bypass?'BYPASS':'RAMP')+`  ${(c.current||0).toFixed(1)}A`:'',0,0,8,'#B0BEC5',500));
    upright(c,0,10,()=>text(`Soft starter ${c.power}kW`,0,0,8,C.dead,500)); upright(c,0,24,()=>text(`ramp ${c.ramp}s / ${c.rampDown}s`,0,0,7.5,C.dead,500));
    ctx.strokeStyle=C.ink; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-30,60); ctx.quadraticCurveTo(0,60,30,40); ctx.stroke(); ctx.lineWidth=2;
    if (running&&c.powered){ ctx.fillStyle=c.rel[0]?C.ok:'#DDD'; ctx.beginPath(); ctx.arc(62,-40,3,0,Math.PI*2); ctx.fill(); }
    if (running&&c.fault) smoke(0,-100);
  } else if (t.kind==='plc'){
    ctx.strokeStyle=C.ink; ctx.fillStyle=C.white; ctx.beginPath(); ctx.rect(-100,-180,200,280); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#ECEEEA'; ctx.fillRect(-98,-178,196,40); upright(c,0,-158,()=>text('PLC',0,0,14,C.ink,600));
    for (let i=0;i<8;i++){ const y=(-6+i)*G; line(-100,y,-84,y,cols[i]); upright(c,-72,y,()=>text('I'+(i+1),0,0,8,C.ink,500)); if (running){ ctx.fillStyle=c.plcI&&c.plcI[i]?C.ok:'#DDD'; ctx.beginPath(); ctx.arc(-56,y,4,0,Math.PI*2); ctx.fill(); } }
    line(-100,60,-84,60,cols[8]); upright(c,-68,60,()=>text('COM',0,0,8,C.ink,500));
    line(100,-160,84,-160,cols[9]); upright(c,70,-160,()=>text('C',0,0,8,C.ink,600));
    for (let i=0;i<8;i++){ const y=(-6+i)*G; line(100,y,84,y,cols[10+i]); upright(c,72,y,()=>text('Q'+(i+1),0,0,8,C.ink,500)); if (running){ ctx.fillStyle=c.plcQ[i]?C.L1:'#DDD'; ctx.beginPath(); ctx.arc(56,y,4,0,Math.PI*2); ctx.fill(); } }
    ctx.fillStyle='#1B2A32'; ctx.beginPath(); ctx.roundRect(-40,-126,80,22,3); ctx.fill(); upright(c,0,-115,()=>text(running?(c.plcErr?'ERR':'RUN'):'STOP',0,0,9,running?(c.plcErr?'#FF5252':'#69F0AE'):'#FFD740',600));
    upright(c,0,84,()=>text(`${(c._rules||[]).length||String(c.prog||'').split('\n').filter(x=>x.trim()).length} rules`,0,0,7.5,C.dead,500));
  } else if (c.type==='mccb3'||c.type==='mccb4'){
    const n=c.type==='mccb4'?4:3, xs=n===4?[-3,-1,1,3]:[-2,0,2]; const closed=running?pairClosed(c,0):true; const hw=n===4?70:56;
    for (let i=0;i<n;i++){ const x=xs[i]*G; line(x,-40,x,-30,cols[i]); line(x,40,x,30,cols[n+i]); }
    ctx.strokeStyle=C.ink; ctx.fillStyle=c.tripped?'#FADBD8':C.white; ctx.lineWidth=2; ctx.beginPath(); ctx.rect(-hw,-30,hw*2,60); ctx.fill(); ctx.stroke();
    for (let i=0;i<n;i++){ const x=xs[i]*G; line(x,-30,x,-12,cols[i]); line(x,30,x,12,cols[n+i]); ctx.strokeStyle=closed?cols[i][0]:C.ink; ctx.beginPath(); ctx.moveTo(x,12); if (closed) ctx.lineTo(x,-12); else ctx.lineTo(x+10,-8); ctx.stroke(); }
    ctx.strokeStyle=C.ink; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.moveTo(-hw+8,0); ctx.lineTo(hw-8,0); ctx.stroke(); ctx.setLineDash([]);
    // handle
    ctx.fillStyle=c.tripped?C.L1:(c.on?C.ok:'#90A4AE'); ctx.beginPath(); ctx.roundRect(hw-16,c.on&&!c.tripped?-26:c.tripped?-8:2,10,c.tripped?12:24,3); ctx.fill();
    upright(c,-hw+16,-20,()=>text(c.tripped?'TRIP':c.on?'ON':'OFF',0,0,7,c.tripped?C.L1:C.ink,600));
    if (running&&c.heat>0){ ctx.fillStyle=C.L1; ctx.fillRect(-hw+4,24,(hw*2-8)*Math.min(1,c.heat/3),3); }
  } else if (t.terms.length===6){
    const closed=running?pairClosed(c,0):(c.type==='ol3'||c.type==='mcb3');
    for (let i=0;i<3;i++){ const x=(i-1)*2*G; line(x,-40,x,-14,cols[i]); line(x,14,x,40,cols[i+3]);
      ctx.strokeStyle=closed?cols[i][0]:C.ink; ctx.beginPath(); ctx.moveTo(x,-14); if (closed) ctx.lineTo(x,16); else ctx.lineTo(x+12,12); ctx.stroke(); ctx.strokeStyle=C.ink;
      if (c.type==='ol3'){ ctx.fillStyle=C.white; ctx.beginPath(); ctx.rect(x-5,-8,10,14); ctx.fill(); ctx.stroke(); }
      if (c.type==='mcb3'){ ctx.beginPath(); ctx.moveTo(x-4,-10); ctx.lineTo(x+4,-2); ctx.moveTo(x+4,-10); ctx.lineTo(x-4,-2); ctx.stroke(); } }
    ctx.strokeStyle=C.ink; ctx.setLineDash([4,3]); ctx.beginPath(); ctx.moveTo(-46,closed?2:0); ctx.lineTo(46,closed?2:0); ctx.stroke(); ctx.setLineDash([]);
    if (running&&(c.type==='mcb3'||c.type==='ol3')){ ctx.fillStyle=c.tripped?C.L1:C.white; ctx.beginPath(); ctx.arc(52,-30,6,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    if (running&&c.heat>0){ ctx.fillStyle=C.L1; ctx.fillRect(-40,24,80*Math.min(1,c.heat/(c.type==='ol3'?c.preset:3)),3); }
  } else if (t.kind==='contact'){
    const closed=running?pairClosed(c,0):NC_TYPES.includes(c.type)||c.type==='fuse';
    line(-40,0,-14,0,cols[0]); line(14,0,40,0,cols[1]);
    if (c.type==='fuse'){ ctx.fillStyle=vis.blown?C.burnt:C.white; ctx.strokeStyle=C.ink; ctx.beginPath(); ctx.rect(-14,-6,28,12); ctx.fill(); ctx.stroke(); if(!vis.blown) line(-14,0,14,0,cols[0]); else { ctx.strokeStyle=C.sel; ctx.beginPath(); ctx.moveTo(-6,-4); ctx.lineTo(0,2); ctx.lineTo(-2,-1); ctx.lineTo(6,4); ctx.stroke(); } if (running&&c.heat>0){ ctx.fillStyle=C.L1; ctx.fillRect(-14,9,28*Math.min(1,c.heat/3),3); } }
    else {
      let showClosed=closed; if (c.stuck==='open'&&c.hidden){ c.stuck=null; showClosed=running?pairClosed(c,0):NC_TYPES.includes(c.type); c.stuck='open'; }
      ctx.strokeStyle=showClosed?cols[0][0]:C.ink; ctx.beginPath(); ctx.moveTo(-14,0); if (showClosed) ctx.lineTo(16,0); else ctx.lineTo(14,-12); ctx.stroke(); ctx.strokeStyle=C.ink;
      if (NC_TYPES.includes(c.type)){ ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(15,-14); ctx.stroke(); }
      if (c.type==='pb_no'||c.type==='pb_nc'){ ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(0,-20); ctx.moveTo(-7,-20); ctx.lineTo(7,-20); ctx.stroke(); if(running){ ctx.fillStyle=c.pressed?C.sel:C.white; ctx.beginPath(); ctx.arc(0,-28,6,0,Math.PI*2); ctx.fill(); ctx.stroke(); } }
      if (c.type==='sw'){ ctx.fillStyle=C.white; ctx.beginPath(); ctx.arc(-14,0,2.5,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
      if (c.type.startsWith('limit')){ ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(-22,-10); ctx.moveTo(-26,-10); ctx.lineTo(-18,-10); ctx.stroke(); }
      if (c.type.startsWith('float')){ ctx.fillStyle=running&&c.on?'#90CAF9':C.white; ctx.beginPath(); ctx.arc(0,-22,6,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(0,-6); ctx.stroke(); }
      if (c.type.startsWith('press')){ ctx.beginPath(); ctx.moveTo(-8,-18); ctx.lineTo(8,-18); ctx.moveTo(0,-18); ctx.lineTo(0,-6); ctx.stroke(); ctx.beginPath(); ctx.rect(-8,-26,16,8); ctx.stroke(); }
      if (c.type.startsWith('thermo')){ ctx.beginPath(); ctx.moveTo(-6,-24); ctx.lineTo(6,-24); ctx.lineTo(-6,-18); ctx.lineTo(6,-18); ctx.moveTo(0,-18); ctx.lineTo(0,-6); ctx.stroke(); }
      if (c.type==='t_no'||c.type==='t_nc'){ ctx.beginPath(); ctx.arc(0,-16,7,Math.PI,0); ctx.stroke(); }
      if (c.type==='ol'){ ctx.beginPath(); ctx.rect(-5,-24,10,7); ctx.moveTo(0,-17); ctx.lineTo(0,-8); ctx.stroke(); }
      if (running&&MANUAL_SW.includes(c.type)&&c.type!=='sw'){ ctx.fillStyle=c.on?C.sel:C.white; ctx.beginPath(); ctx.arc(24,-22,5,0,Math.PI*2); ctx.fill(); ctx.stroke(); }
    }
  } else if (t.kind==='load'){
    line(-40,0,-14,0,cols[0]); line(14,0,40,0,cols[1]); ctx.strokeStyle=C.ink; const on=st==='on';
    ctx.fillStyle=vis.burnt?C.burnt:(st==='over'||st==='back')?'#FF8A65':on?(c.type==='lamp'?c.color:c.type==='heater'?'#FF7043':'#FADBD8'):st==='weak'?(c.type==='lamp'?'#FFF0B8':'#FDEDEC'):C.white;
    if (c.type==='coil'||c.type==='timer'||c.type==='timer_off'){ ctx.beginPath(); ctx.rect(-14,-10,28,20); ctx.fill(); ctx.stroke(); if (c.type==='timer'){ ctx.beginPath(); ctx.moveTo(-5,-6); ctx.lineTo(5,-6); ctx.lineTo(-5,6); ctx.lineTo(5,6); ctx.stroke(); } if (c.type==='timer_off'){ ctx.beginPath(); ctx.moveTo(-5,6); ctx.lineTo(5,6); ctx.lineTo(-5,-6); ctx.lineTo(5,-6); ctx.stroke(); } }
    else if (c.type==='lamp'){ ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-8.5,-8.5); ctx.lineTo(8.5,8.5); ctx.moveTo(8.5,-8.5); ctx.lineTo(-8.5,8.5); ctx.stroke(); }
    else if (c.type==='motor1'){ ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill(); ctx.stroke(); upright(c,0,0,()=>text('M',0,0,11,C.ink,600)); if(on) spin(0,0,18); }
    else if (c.type==='buzzer'){ ctx.beginPath(); ctx.arc(0,4,13,Math.PI,0); ctx.closePath(); ctx.fill(); ctx.stroke(); if(on){ ctx.strokeStyle=C.L1; ctx.beginPath(); ctx.arc(0,4,18,Math.PI*1.2,Math.PI*1.8); ctx.stroke(); } }
    else if (c.type==='heater'){ ctx.beginPath(); ctx.rect(-14,-8,28,16); ctx.fill(); ctx.stroke(); ctx.strokeStyle=on?C.L1:C.ink; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(-11,0); for (let i=0;i<5;i++) ctx.lineTo(-9+i*4.5,i%2?4:-4); ctx.lineTo(11,0); ctx.stroke(); ctx.lineWidth=2; if(on){ ctx.strokeStyle='rgba(255,112,67,0.6)'; ctx.beginPath(); ctx.arc(0,0,20,Math.PI*1.15,Math.PI*1.85); ctx.stroke(); } }
    if (st==='back'){ ctx.strokeStyle=C.L1; ctx.setLineDash([3,3]); ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
    if (st==='weak'){ ctx.strokeStyle=C.ink; ctx.setLineDash([2,3]); ctx.beginPath(); ctx.arc(0,0,20,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); }
    if (vis.burnt||st==='over'||st==='back') smoke(0,-14);
  } else if (t.kind==='load3'){
    for (let i=0;i<3;i++){ const x=(i-1)*2*G; line(x,-40,x,-24,cols[i]); line(x,-24,x*0.3,-6,cols[i]); }
    ctx.strokeStyle=C.ink; ctx.fillStyle=vis.burnt?C.burnt:st==='on'?'#FADBD8':st==='loss'?'#FF8A65':C.white; ctx.beginPath(); ctx.arc(0,12,18,0,Math.PI*2); ctx.fill(); ctx.stroke();
    upright(c,0,12,()=>{ text('M',0,-4,11,vis.burnt?C.white:C.ink,600); text('3~',0,7,9,vis.burnt?C.white:C.ink,500); });
    if (st==='on') spin(0,12,23,(c.freq||50)/50*(c.rev?-1:1));
    if (st==='loss'){ const j=Math.sin(simTime*40)*2; ctx.strokeStyle=C.L1; ctx.beginPath(); ctx.arc(j,12,23,0.3,1.0); ctx.moveTo(0,0); ctx.arc(j,12,23,3.4,4.1); ctx.stroke(); }
    if (vis.burnt||(st==='loss'&&c.stress>4)) smoke(0,-12);
  }
  // IEC terminal numbers
  if (showNum&&t.num&&!ghost){ t.terms.forEach(([dx,dy],i)=>{ const x=dx*G,y=dy*G; let lx=x,ly=y; if (t.terms.length===2){ lx=x+(dx<0?12:-12); ly=y-8; } else if (dy<0){ ly=y+8; lx=x+9; } else { ly=y-8; lx=x+9; } upright(c,lx,ly,()=>text(t.num[i],0,0,7,C.ink,500)); }); }
  ctx.restore();
  let lbl=c.label;
  if (c.type==='timer') lbl+=running&&st==='on'?` ${c.elapsed.toFixed(1)}/${c.preset}s`:` ${c.preset}s`;
  if (c.type==='timer_off') lbl+=running&&c.done&&st!=='on'?` ${(c.preset-c.elapsed).toFixed(1)}s`:` ${c.preset}s`;
  if (c.type==='ol3') lbl+=running?` ${(c.current||0).toFixed(1)}/${c.iset}A`:` ${c.iset}A`;
  if (c.type==='fuse'||isBrk(c.type)) lbl+=running&&c.current>0?` ${c.current.toFixed(1)}/${c.rating}A`:` ${c.rating}A`;
  if (c.type==='motor3'||c.type==='motor6') lbl+=running&&(isOn(st)||st==='loss')?` ${isOn(st)?Math.round(120*(c.freq||50)/c.poles*0.97)+'rpm ':''}${motorCurrent(c).toFixed(1)}A`:` ${c.power}kW`;
  const sc=selected?C.sel:C.ink;
  if (c.type==='dcps'){ const [dx,dy]=rotOff(0,-1.7,c.rot); text(lbl,px+dx*G,py+dy*G,11,sc); }
  else if (t.kind==='sensor'){ const [dx,dy]=rotOff(0,-2.2,c.rot); text(lbl,px+dx*G,py+dy*G,11,sc); }
  else if (t.kind==='source'){ const [dx,dy]=rotOff(0,-2.6,c.rot); text(lbl,px+dx*G,py+dy*G+(c.rot===0?4:c.rot===2?-4:0),11,sc); }
  else if (t.kind==='vfd'){ const [dx,dy]=rotOff(0,-5.6,c.rot); text(lbl,px+dx*G,py+dy*G,11,sc,600); }
  else if (c.type==='mccb4'||c.type==='rcd4'){ text(lbl,px+(c.rot%2===0?78:30),py-(c.rot%2===0?30:80),11,sc,500,'left'); }
  else if (c.type==='rcd2'){ text(lbl,px+(c.rot%2===0?44:30),py-(c.rot%2===0?30:50),11,sc,500,'left'); }
  else if (c.type==='softstart'){ const [dx,dy]=rotOff(0,-5.6,c.rot); text(lbl,px+dx*G,py+dy*G,11,sc,600); }
  else if (t.kind==='plc'){ const [dx,dy]=rotOff(0,-9.6,c.rot); text(lbl,px+dx*G,py+dy*G,11,sc,600); }
  else if (t.terms.length>2){ text(lbl,px+(c.rot%2===0?58:30),py-(c.rot%2===0?30:60),11,sc,500,'left'); }
  else if (c.type==='box'){ }
  else if (c.type==='ats'){ text(lbl,px,py-5.6*G,11,sc,600); }
  else if (t.kind==='note'){ }
  else { const off=c.rot%2===0?{x:0,y:-24}:{x:26,y:-6}; text(lbl,px+off.x,py+off.y,11,sc); }
  if (selected){ ctx.strokeStyle=C.sel; ctx.lineWidth=1; ctx.setLineDash([4,3]); const b=bbox(c); ctx.strokeRect(b.x*G,b.y*G,b.w*G,b.h*G); ctx.setLineDash([]); }
  if (!running&&!ghost){ ctx.strokeStyle=C.ink; ctx.lineWidth=1; ctx.fillStyle=C.paper; for (const p of term){ ctx.beginPath(); ctx.arc(p.x*G,p.y*G,2.5,0,Math.PI*2); ctx.fill(); ctx.stroke(); } }
}
function spin(x,y,r,speed){ const a=(performance.now()/150*(speed||1))%(Math.PI*2); ctx.strokeStyle=C.L1; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,r,a,a+1.2); ctx.stroke(); ctx.beginPath(); ctx.arc(x,y,r,a+Math.PI,a+Math.PI+1.2); ctx.stroke(); }
function smoke(x,y){ ctx.fillStyle='rgba(60,60,60,0.35)'; for (let i=0;i<3;i++){ const ph=(simTime*1.2+i*0.6)%1.8; ctx.beginPath(); ctx.arc(x+Math.sin(ph*4+i)*6,y-ph*22,4+ph*5,0,Math.PI*2); ctx.fill(); } }
function elbow(a,b){ if (a.x===b.x||a.y===b.y) return [{ax:a.x,ay:a.y,bx:b.x,by:b.y}]; const hFirst=(Math.abs(b.x-a.x)>=Math.abs(b.y-a.y))!==wireFlip; const m=hFirst?{x:b.x,y:a.y}:{x:a.x,y:b.y}; return [{ax:a.x,ay:a.y,bx:m.x,by:m.y},{ax:m.x,ay:m.y,bx:b.x,by:b.y}]; }
function bounds(){ if (!doc.comps.length&&!doc.wires.length) return null; let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9; for (const c of doc.comps){ const b=bbox(c); x0=Math.min(x0,b.x-1); y0=Math.min(y0,b.y-2); x1=Math.max(x1,b.x+b.w+1); y1=Math.max(y1,b.y+b.h+1); } for (const w of doc.wires){ x0=Math.min(x0,w.ax,w.bx); y0=Math.min(y0,w.ay,w.by); x1=Math.max(x1,w.ax,w.bx); y1=Math.max(y1,w.ay,w.by); } return {x0,y0,x1,y1}; }
function fitView(){ const b=bounds(); if(!b) return; const w=(b.x1-b.x0+2)*G,h=(b.y1-b.y0+2)*G; const z=Math.max(0.3,Math.min(2,Math.min(stage.clientWidth/w,stage.clientHeight/h))); view={z,x:(stage.clientWidth-w*z)/2-(b.x0-1)*G*z,y:(stage.clientHeight-h*z)/2-(b.y0-1)*G*z}; draw(); }
function renderPNG(){ const b=bounds(); if(!b) return null; const w=(b.x1-b.x0+2)*G,h=(b.y1-b.y0+2)*G; const c2=document.createElement('canvas'); const scale=2; c2.width=w*scale; c2.height=h*scale; const saveCtx=ctx,saveView=view; ctx=c2.getContext('2d'); view={z:1,x:-(b.x0-1)*G,y:-(b.y0-1)*G}; try{ ctx.setTransform(scale,0,0,scale,0,0); ctx.fillStyle=C.paper; ctx.fillRect(0,0,w,h); ctx.translate(view.x,view.y); drawContent(); } finally { ctx=saveCtx; view=saveView; } return c2.toDataURL('image/png'); }
function printPDF(){ const img=renderPNG(); if(!img) return; const logHtml=document.getElementById('log').innerHTML; const w=window.open('','_blank'); w.document.write(`<html dir="${lang==='ar'?'rtl':'ltr'}"><head><title>${T('ttl')}</title><style>body{font-family:sans-serif;margin:20px;color:#1E2A32}img{max-width:100%;border:1px solid #ccc}h2{font-size:14px;margin:16px 0 6px}.t{color:#888;font-size:11px;margin:0 4px}.fault{color:#D8322A}.good{color:#2E7D4F}div.l{border-bottom:1px dashed #eee;padding:2px 0;font-size:12px}</style></head><body><h1 style="font-size:18px">${T('ttl')}</h1><div style="font-size:12px;color:#666">${new Date().toLocaleString()}</div><img src="${img}"><h2>${T('hLog')}</h2>${logHtml.replace(/<div/g,'<div class="l"')}</body></html>`); w.document.close(); setTimeout(()=>w.print(),400); }
function exportPNG(){ const b=bounds(); if(!b) return; const w=(b.x1-b.x0+2)*G,h=(b.y1-b.y0+2)*G; const c2=document.createElement('canvas'); const scale=2; c2.width=w*scale; c2.height=h*scale; const saveCtx=ctx,saveView=view; ctx=c2.getContext('2d'); view={z:1,x:-(b.x0-1)*G,y:-(b.y0-1)*G};
  const origDPR=devicePixelRatio; try{ ctx.setTransform(scale,0,0,scale,0,0); ctx.fillStyle=C.paper; ctx.fillRect(0,0,w,h); ctx.translate(view.x,view.y); drawContent(); } finally { ctx=saveCtx; view=saveView; }
  const a=document.createElement('a'); a.href=c2.toDataURL('image/png'); a.download='circuit.png'; a.click(); draw(); }
function drawContent(){ // wires + comps only (used by export)
  ctx.lineCap='round'; ctx.lineJoin='round';
  for (const w of doc.wires){ const wcols=potColors(w.ax,w.ay); if (w.color){ ctx.strokeStyle=w.color; ctx.lineWidth=w.w||2; ctx.beginPath(); ctx.moveTo(w.ax*G,w.ay*G); ctx.lineTo(w.bx*G,w.by*G); ctx.stroke(); } else strokeMulti(w.ax*G,w.ay*G,w.bx*G,w.by*G,wcols,w.w||2); }
  const deg=new Map(),pts=nodePoints();
  for (const w of doc.wires) for (const p of pts) if (onSegment(p,w)){ const k=key(p.x,p.y); const interior=!((p.x===w.ax&&p.y===w.ay)||(p.x===w.bx&&p.y===w.by)); deg.set(k,(deg.get(k)||0)+(interior?2:1)); }
  for (const c of doc.comps) for (const t of terminals(c)){ const k=key(t.x,t.y); deg.set(k,(deg.get(k)||0)+1); }
  for (const p of pts) if ((deg.get(key(p.x,p.y))||0)>=3){ ctx.fillStyle=potColors(p.x,p.y)[0]; ctx.beginPath(); ctx.arc(p.x*G,p.y*G,3.5,0,Math.PI*2); ctx.fill(); }
  for (const c of doc.comps) drawComp(c,false);
}
