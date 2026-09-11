/* ==========================================================================
   engine.js — Simulation engine: connectivity solver, load evaluation, protections, VFD / soft starter / ATS / PLC models
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
// ---------- logic ----------
const isBrk=t=>t==='mcb3'||t==='mccb3'||t==='mccb4';
const isMains=s=>s==='L1'||s==='L2'||s==='L3'||s==='L1b'||s==='L2b'||s==='L3b';
const isN=s=>s==='N'||s==='Nb';
const base=n=>n?n.split('@')[0]:n;
const drvId=n=>n&&n.includes('@')?parseInt(n.split('@')[1]):null;
const isOn=s=>s==='on'||s==='star'||s==='delta';
function coilOn(label){ for (const c of doc.comps) if (c.label===label&&(c.type==='coil')&&sim.loadState.get(c.id)==='on') return true; return false; }
function timerDone(label){ for (const c of doc.comps) if (c.label===label&&(c.type==='timer'||c.type==='timer_off')&&c.done) return true; return false; }
function olTripped(label){ const o=doc.comps.filter(c=>c.type==='ol3'&&c.label===label); return o.length?o.some(c=>c.tripped):null; }
function pairClosed(c,i){
  if (c.stuck==='open') return false;
  switch(c.type){
    case 'pb_no': return c.pressed; case 'pb_nc': return !c.pressed;
    case 'sw': case 'limit_no': case 'float_no': case 'press_no': case 'thermo_no': return c.on;
    case 'limit_nc': case 'float_nc': case 'press_nc': case 'thermo_nc': return !c.on;
    case 'k_no': case 'k3': return coilOn(c.label); case 'k_nc': return !coilOn(c.label);
    case 't_no': return timerDone(c.label); case 't_nc': return !timerDone(c.label);
    case 'ol': { const t=olTripped(c.label); return !(t===null?c.tripped:t); }
    case 'fuse': return !c.blown; case 'mcb3': case 'mccb3': case 'mccb4': return c.on&&!c.tripped; case 'ol3': return !c.tripped;

    case 'vfd': { const rel=c.rel[i<2?0:1]; return (i%2===0)?rel:!rel; }
    case 'prox_npn': case 'prox_pnp': return c.on&&c.powered;
    case 'box': return true;
    case 'rcd2': case 'rcd4': return c.on&&!c.tripped;
    case 'meterA': return true;
    case 'softstart': return c.rel[0];
    case 'plc': return c.plcQ[i];
    case 'ats': { if (i<4) return c.pos===1; if (i<8) return c.pos===2; if (i===8) return c.pos===1; return c.pos===2; }
  }
  return false;
}
function sourceNodes(c){
  const t=TYPES[c.type];
  if (t.src) return mains.tripped?[]:[{i:0,name:t.src}];
  if (c.type==='dcps') return c.tripped?[]:[{i:0,name:'DC+@'+c.id},{i:1,name:'DC-@'+c.id}];
  if (c.type==='softstart'&&c.running&&!c.fault) return [{i:3,name:'U@'+c.id},{i:4,name:'V@'+c.id},{i:5,name:'W@'+c.id}];
  if (c.type==='vfd'&&c.running&&!c.fault){ const rev=c.freq<0; return [{i:3,name:'U@'+c.id},{i:4,name:(rev?'W':'V')+'@'+c.id},{i:5,name:(rev?'V':'W')+'@'+c.id}]; }
  return [];
}
function onSegment(p,w){ if (w.ay===w.by) return p.y===w.ay&&p.x>=Math.min(w.ax,w.bx)&&p.x<=Math.max(w.ax,w.bx); if (w.ax===w.bx) return p.x===w.ax&&p.y>=Math.min(w.ay,w.by)&&p.y<=Math.max(w.ay,w.by); return false; }
function nodePoints(){ const pts=new Map(); for (const w of doc.wires){ pts.set(key(w.ax,w.ay),{x:w.ax,y:w.ay}); pts.set(key(w.bx,w.by),{x:w.bx,y:w.by}); } for (const c of doc.comps) for (const t of terminals(c)) pts.set(key(t.x,t.y),t); return [...pts.values()]; }
function solveOnce(forceOpen,cutWire){
  const parent=new Map();
  const find=k=>{ while(parent.has(k)&&parent.get(k)!==k) k=parent.get(k); return k; };
  const union=(a,b)=>{ const ra=find(a),rb=find(b); if(!parent.has(ra)) parent.set(ra,ra); if(!parent.has(rb)) parent.set(rb,rb); if(ra!==rb) parent.set(ra,rb); };
  const pts=nodePoints();
  for (const w of doc.wires){ if (w.cut||w.id===cutWire) continue; const a=key(w.ax,w.ay); union(a,a); for (const p of pts) if (onSegment(p,w)) union(a,key(p.x,p.y)); }
  const srcPts={};
  for (const c of doc.comps){
    const t=TYPES[c.type], term=terminals(c);
    for (const s of sourceNodes(c)) (srcPts[s.name]=srcPts[s.name]||[]).push(key(term[s.i].x,term[s.i].y));
    if (t.pairs&&!(forceOpen&&forceOpen.has(c.id))) t.pairs.forEach(([a,b],i)=>{ if (pairClosed(c,i)) union(key(term[a].x,term[a].y),key(term[b].x,term[b].y)); });
  }
  const srcOf=new Map();
  for (const name in srcPts){ const ks=srcPts[name]; for (let i=1;i<ks.length;i++) union(ks[0],ks[i]); const r=find(ks[0]); if(!srcOf.has(r)) srcOf.set(r,new Set()); srcOf.get(r).add(name); }
  const bonded=s=>s.size===2&&((s.has('N')&&s.has('PE'))||(s.has('Nb')&&s.has('PE')));
  const shorts=[]; for (const [r,s] of srcOf) if (s.size>=2&&!bonded(s)) shorts.push({root:r,names:[...s]});
  const potOf=k=>{ const s=srcOf.get(find(k)); if(!s) return '0'; if(bonded(s)) return s.has('N')?'N':'Nb'; if(s.size>=2) return 'short'; return [...s][0]; };
  const pot=new Map(); for (const p of pts) pot.set(key(p.x,p.y),potOf(key(p.x,p.y)));
  return {find,srcOf,shorts,pot,potOf,pts};
}
function voltBetween(a,b){
  if (!a||!b||a==='0'||b==='0'||a===b) return 0;
  const A=base(a),B=base(b);
  if (isMains(A)&&isMains(B)) return 400;
  if ((isMains(A)&&(isN(B)||B==='PE'))||(isMains(B)&&(isN(A)||A==='PE'))) return 230;
  if ((A==='PE'&&isN(B))||(isN(A)&&B==='PE')) return 0; if (A==='PE'||B==='PE') return 0; if (isN(A)&&isN(B)) return 0;
  if (A.startsWith('DC')&&B.startsWith('DC')){ if (drvId(a)===drvId(b)){ const ps=doc.comps.find(c=>c.id===drvId(a)); return ps?ps.volts:24; } return 48; }
  if ('UVW'.includes(A)&&'UVW'.includes(B)){ const d=doc.comps.find(c=>c.id===drvId(a)); if (d&&d.type==='softstart') return 400*(d.level||0); return d?400*Math.min(1,Math.abs(d.freq)/50):400; }
  return 400;
}
function evaluateLoads(r){
  const st=new Map();
  const loads2=doc.comps.filter(c=>TYPES[c.type].kind==='load'&&!c.burnt);
  const adj=new Map();
  const link=(c,a,b)=>{ (adj.get(a)||adj.set(a,[]).get(a)).push({c,o:b}); (adj.get(b)||adj.set(b,[]).get(b)).push({c,o:a}); };
  for (const c of loads2){ const t=terminals(c); link(c,r.find(key(t[0].x,t[0].y)),r.find(key(t[1].x,t[1].y))); }
  for (const c of doc.comps) if (c.type==='motor6'&&!c.burnt){ const t=terminals(c); [[0,4],[1,5],[2,3]].forEach(([a,b])=>link(c,r.find(key(t[a].x,t[a].y)),r.find(key(t[b].x,t[b].y)))); }
  const reach=(start,excl,notSrc)=>{ const seen=new Set([start]),q=[start]; while(q.length){ const n=q.shift(); const s=r.srcOf.get(n); if (s&&s.size===1&&[...s][0]!==notSrc) return [...s][0]; for (const e of (adj.get(n)||[])) if (e.c!==excl&&!seen.has(e.o)){ seen.add(e.o); q.push(e.o); } } return null; };
  const mixCache=new Map();
  const mixOf=root=>{ if (mixCache.has(root)) return mixCache.get(root); const seen=new Set([root]),q=[root],names=new Set(); while(q.length){ const n=q.shift(); const s=r.srcOf.get(n); if (s) for (const nm of s) names.add(nm); for (const e of (adj.get(n)||[])) if (!seen.has(e.o)){ seen.add(e.o); q.push(e.o); } } const v=[...names].sort().join('|'); mixCache.set(root,v); return v; };
  for (const p of r.pts){ const k=key(p.x,p.y); if (r.pot.get(k)==='0'){ const m=mixOf(r.find(k)); if (m) r.pot.set(k,m); } }
  for (const c of doc.comps){
    const t=TYPES[c.type];
    if (t.kind==='load'){
      if (c.burnt){ st.set(c.id,'burnt'); continue; }
      const term=terminals(c),ka=key(term[0].x,term[0].y),kb=key(term[1].x,term[1].y),a=r.potOf(ka),b=r.potOf(kb);
      let s='off',v=0;
      if (a==='short'||b==='short') s='off';
      else if (a!=='0'&&b!=='0') v=voltBetween(a,b);
      else if (a!=='0'&&b==='0'){ const o=reach(r.find(kb),c,a); if (o){ v=voltBetween(a,o); s=v>c.vrate*1.25?'back':'weak'; } }
      else if (b!=='0'&&a==='0'){ const o=reach(r.find(ka),c,b); if (o){ v=voltBetween(b,o); s=v>c.vrate*1.25?'back':'weak'; } }
      if (s==='off'&&v>0){ const ratio=v/c.vrate; s=ratio>1.25?'over':ratio<0.7?'weak':'on'; }
      c.volts=v; st.set(c.id,s);
    } else if (t.kind==='load3'){
      if (c.burnt){ st.set(c.id,'burnt'); continue; }
      const ps=terminals(c).map(p=>r.potOf(key(p.x,p.y)));
      if (ps.includes('short')){ st.set(c.id,'off'); continue; }
      const mp=new Set(ps.filter(isMains)); const drv=new Set(ps.filter(p=>'UVW'.includes(base(p)))); const dids=new Set([...drv].map(drvId));
      if (mp.size===3){ c.freq=50; c.drive=null; st.set(c.id,'on'); }
      else if (drv.size===3&&dids.size===1){ const d=doc.comps.find(x=>x.id===[...dids][0]); if (d.type==='softstart'){ c.freq=50*Math.min(1,d.level*1.25); c.drive=d.id; c.rev=false; } else { c.freq=Math.abs(d.freq); c.drive=d.id; c.rev=d.freq<0; } st.set(c.id,'on'); }
      else if (mp.size+drv.size===2) st.set(c.id,'loss'); else st.set(c.id,'off');
    } else if (t.kind==='load6'){
      if (c.burnt){ st.set(c.id,'burnt'); continue; }
      const term=terminals(c); const ps=term.map(p=>r.potOf(key(p.x,p.y))); const roots=term.map(p=>r.find(key(p.x,p.y)));
      if (ps.includes('short')){ st.set(c.id,'off'); continue; }
      const top=new Set(ps.slice(0,3).filter(isMains)); const bot=ps.slice(3);
      c.freq=50; c.drive=null;
      // delta: each winding sees two different phases; star: x2 terminals tied together (floating) and 3 phases on x1
      const wind=[[0,4],[1,5],[2,3]].map(([a,b])=>[ps[a],ps[b]]);
      const deltaOK=wind.every(([a,b])=>isMains(a)&&isMains(b)&&a!==b);
      const starOK=top.size===3&&bot.every(p=>p==='0')&&roots[3]===roots[4]&&roots[4]===roots[5];
      if (deltaOK) st.set(c.id,'delta'); else if (starOK) st.set(c.id,'star');
      else { const live=wind.filter(([a,b])=>voltBetween(a,b)>0||(isMains(a)&&roots[3]===roots[4]&&roots[4]===roots[5])).length; st.set(c.id, live===2?'loss':'off'); }
    }
  }
  // sensors powered?
  for (const c of doc.comps) if (TYPES[c.type].kind==='sensor'){ const t=terminals(c); const a=r.potOf(key(t[0].x,t[0].y)),b=r.potOf(key(t[2].x,t[2].y)); c.powered=base(a)==='DC+'&&base(b)==='DC-'&&drvId(a)===drvId(b); }
  return st;
}
function motorIn(c){ return c.power*2.1; }
function motorCurrent(c){ const s=sim.loadState.get(c.id);
  if (c.type==='motor3'){ if (s==='on') return motorIn(c)*c.loadPct/100; if (s==='loss') return motorIn(c)*c.loadPct/100*1.73; return 0; }
  if (c.type==='motor6'){ if (s==='delta') return motorIn(c)*c.loadPct/100; if (s==='star') return motorIn(c)*c.loadPct/100/3*Math.max(1,c.loadPct/100); if (s==='loss') return motorIn(c)*c.loadPct/100*1.73; return 0; }
  if (TYPES[c.type].kind==='load'){ if (s==='on'||s==='over'||s==='back') return c.power/Math.max(1,c.volts||c.vrate); } return 0; }
function simulate(dt){
  simTime+=dt;
  for (const c of doc.comps){
    if (c.type==='timer'){ if (sim.loadState.get(c.id)==='on'){ c.elapsed=Math.min(c.elapsed+dt,c.preset); if(!c.done&&c.elapsed>=c.preset){ c.done=true; log(T('m_timer',c.label,c.preset),'good'); } } else { c.elapsed=0; c.done=false; } }
    if (c.type==='timer_off'){ const on=sim.loadState.get(c.id)==='on'; if (on){ c.done=true; c.offT=0; c.elapsed=0; } else if (c.done){ c.elapsed+=dt; if (c.elapsed>=c.preset){ c.done=false; c.elapsed=0; log(T('m_toff',c.label,c.preset),'good'); } } }
  }
  let r,stable=false; const prevState=sim.loadState;
  for (let i=0;i<40;i++){
    r=solveOnce(); const st=evaluateLoads(r);
    let same=true; for (const [id,v] of st) if ((sim.loadState.get(id)||'off')!==v){ same=false; break; }
    sim.loadState=st; if (same){ stable=true; break; }
  }
  for (const [id,v] of sim.loadState){ const c=doc.comps.find(x=>x.id===id); const prev=prevState.get(id)||'off'; if (prev!==v) noteTransition(c,prev,v); }
  sim.pot=r.pot; sim.shorts=r.shorts; sim.unstable=!stable; sim.r=r;
  if (r.shorts.length) handleShort(r);
  for (const v of doc.comps) if (v.type==='vfd') vfdUpdate(v,r,dt);
  for (const a of doc.comps) if (a.type==='ats') atsUpdate(a,r,dt);
  for (const a of doc.comps) if (a.type==='softstart') ssUpdate(a,r,dt);
  for (const a of doc.comps) if (a.type==='plc') plcUpdate(a,r,dt);
  for (const a of doc.comps) if (a.type==='meterA') a.current=currentThrough(a,r);
  for (const c of doc.comps){
    const s=sim.loadState.get(c.id);
    if (s==='over'){ c.stress+=dt; if (c.stress>1.5){ c.burnt=true; log(T('m_burnV',c.label,Math.round(c.volts),c.vrate),'fault'); } }
    else if (s==='back'){ c.stress+=dt; if (c.stress>3){ c.burnt=true; log(T('m_burnBack',c.label),'fault'); } }
    else if (s==='loss'){ c.stress+=dt; if (c.stress>15){ c.burnt=true; log(T('m_burnLoss',c.label),'fault'); } }
    else if (!c.burnt) c.stress=Math.max(0,c.stress-dt*0.5);
  }
  for (const m of doc.comps) if ((m.type==='motor3'||m.type==='motor6')&&!m.burnt&&isOn(sim.loadState.get(m.id))){ const ratio=motorCurrent(m)/motorIn(m); if (ratio>1.15){ m.stress+=dt*(ratio*ratio-1); if (m.stress>40){ m.burnt=true; log(T('m_burnOL',m.label,motorCurrent(m).toFixed(1),Math.round(ratio*100)),'fault'); } } else m.stress=Math.max(0,m.stress-dt); }
  for (const ol of doc.comps.filter(c=>c.type==='ol3'&&!c.tripped)){
    const I=currentThrough(ol,r); ol.current=I; const ratio=I/ol.iset;
    if (ratio>1.05){ ol.heat+=dt*(ratio*ratio-1)/3; if (ol.heat>=ol.preset){ ol.tripped=true; ol.heat=0; log(T('m_olTrip',ol.label,I.toFixed(1),ol.iset,Math.round(ratio*100)),'fault'); } }
    else ol.heat=Math.max(0,ol.heat-dt*0.5);
  }
  for (const f of doc.comps.filter(c=>(c.type==='fuse'&&!c.blown)||(isBrk(c.type)&&c.on&&!c.tripped))){
    const I=currentThrough(f,r); f.current=I; const ratio=I/f.rating;
    if (ratio>1.1){ f.heat+=dt*(ratio*ratio-1); if (f.heat>3){ if (f.type==='fuse'){ f.blown=true; log(T('m_fuse',f.label,I.toFixed(1),f.rating),'fault'); } else { f.tripped=true; log(T('m_mcbOL',f.label,I.toFixed(1),f.rating),'fault'); } f.heat=0; } }
    else f.heat=Math.max(0,f.heat-dt);
  }
  if (meter.clamp!==null){ const w=doc.wires.find(x=>x.id===meter.clamp); meter.clampI=w?currentThrough(null,r,w.id):0; }
  updateRunPanel();
}
function currentThrough(dev,r,wireId){
  const before=sim.loadState; const r2=solveOnce(dev?new Set([dev.id]):null,wireId); const after=evaluateLoads(r2);
  let I=0; for (const c of doc.comps){ const b=before.get(c.id),a=after.get(c.id); if ((isOn(b)||b==='loss'||b==='over'||b==='back')&&a!==b) I+=motorCurrent(c); }
  return I;
}
function noteTransition(c,prev,v){
  if (v==='on'&&c.type==='coil') log(T('m_coilOn',c.label),'good');
  else if (prev==='on'&&v!=='on'&&c.type==='coil') log(T('m_coilOff',c.label));
  else if (v==='on'&&c.type==='motor3') log(T('m_m3on',c.label,c.drive,c.rev),'good');
  else if (v==='star') log(T('m_m6star',c.label),'good'); else if (v==='delta') log(T('m_m6delta',c.label),'good');
  else if (v==='loss') log(T('m_loss',c.label),'fault');
  else if (v==='weak') log(T('m_weak',c.label,Math.round(c.volts),c.vrate),'fault');
  else if (v==='back') log(T('m_back',c.label,Math.round(c.volts)),'fault');
  else if (v==='over') log(T('m_over',c.label,Math.round(c.volts),c.vrate),'fault');
  else if (v==='on'&&c.type==='timer') log(T('m_tstart',c.label));
}
function handleShort(r){
  for (const w of doc.wires) if (!w.cut&&r.pot.get(key(w.ax,w.ay))==='short') sparks.push({x:(w.ax+w.bx)/2*G,y:(w.ay+w.by)/2*G,until:simTime+1.5});
  let mainsShort=false,earth=false,names=[];
  for (const sh of r.shorts){
    names.push(sh.names.map(base).join(lang==='ar'?' و ':' and '));
    for (const n of sh.names){ const id=drvId(n); if (id!==null){ const d=doc.comps.find(c=>c.id===id); if (d&&(d.type==='vfd'||d.type==='softstart')&&!d.fault) vfdFault(d,'OC',T('f_OC')); if (d&&d.type==='dcps'&&!d.tripped){ d.tripped=true; log(T('m_dcSC',d.label),'fault'); } } }
    if (sh.names.filter(n=>isMains(n)||isN(n)||n==='PE').length>=2) mainsShort=true; if (sh.names.includes('PE')) earth=true;
  }
  if (!mainsShort) return;
  const txt=names.join(', '); if (earth) log(T('m_earth'),'fault');
  if (earth){ const rcds=doc.comps.filter(c=>(c.type==='rcd2'||c.type==='rcd4')&&pairClosed(c,0)&&solveOnce(new Set([c.id])).shorts.length<r.shorts.length); if (rcds.length){ for (const c of rcds){ c.tripped=true; log(T('m_rcdTrip',c.label),'fault'); } return; } }
  const cands=doc.comps.filter(c=>(c.type==='fuse'||isBrk(c.type))&&pairClosed(c,0));
  const inPath=cands.filter(c=>solveOnce(new Set([c.id])).shorts.length<r.shorts.length);
  if (inPath.length){ const minR=Math.min(...inPath.map(c=>c.rating)); for (const c of inPath.filter(c=>c.rating===minR)){ if (c.type==='fuse'){ c.blown=true; log(T('m_fuseSC',c.label,txt),'fault'); } else { c.tripped=true; log(T('m_mcbSC',c.label,txt),'fault'); } } }
  else if (!mains.tripped){ mains.tripped=true; log(T('m_mainsSC',txt),'fault'); }
}
function atsHealthy(a,r,src){ const t=terminals(a); const ps=[0,1,2,3].map(i=>r.potOf(key(t[i+(src===1?0:4)].x,t[i+(src===1?0:4)].y))); if (ps.includes('short')) return false; const ph=new Set(ps.filter(isMains)); return ph.size===3; }
function atsUpdate(a,r,dt){
  const t=terminals(a); const F=i=>r.find(key(t[i].x,t[i].y)); const com=F(14);
  a.h1=atsHealthy(a,r,1); a.h2=atsHealthy(a,r,2);
  let want=a.target;
  if (a.mode==='auto'){
    const desired=a.h1?1:a.h2?2:0;
    if (desired!==a.pending){ a.pending=desired; a.waitT=0; }
    const needed=desired===1?(a.pos===2?a.retDelay:0):desired===2?a.delay:0;
    a.waitT+=dt; want=a.waitT>=needed?desired:a.target;
  } else if (a.mode==='remote'){ const x1=F(12)===com,x2=F(13)===com; want=(x1&&!x2)?1:(x2&&!x1)?2:0; }
  if (want!==a.target){ a.target=want; a.waitT=0; log(T('m_atsCmd',a.label,want,a.mode),want?'good':''); }
  if (a.pos!==a.target){ a.moveT+=dt; if (a.moveT>=0.8){ a.moveT=0; if (a.pos!==0) a.pos=0; else a.pos=a.target; log(T('m_atsPos',a.label,a.pos),a.pos?'good':''); } } else a.moveT=0;
}
function ssUpdate(v,r,dt){
  const t=terminals(v); const P=i=>r.potOf(key(t[i].x,t[i].y)); const F=i=>r.find(key(t[i].x,t[i].y));
  const inP=[P(0),P(1),P(2)]; const ph=new Set(inP.filter(isMains)); const powered=!inP.includes('short')&&ph.size>=2, phl=ph.size===2;
  if (!powered){ if (v.powered) log(T('m_vfdLost',v.label)); v.powered=false; v.level=0; v.running=false; v.fault=null; v.rel=[false,false]; return; }
  if (!v.powered){ v.powered=true; log(T('m_vfdReady',v.label),'good'); }
  const com=F(8); const runIn=F(6)===com, resetIn=F(7)===com;
  if (phl){ v.phlT+=dt; if (v.phlT>1&&!v.fault) vfdFault(v,'PHL',T('f_PHL')); } else v.phlT=0;
  if (resetIn&&!v.resetPrev&&v.fault){ v.fault=null; log(T('m_vfdReset',v.label,'X2'),'good'); } v.resetPrev=resetIn;
  const target=(runIn&&!v.fault)?1:0;
  if (v.target!==target){ v.target=target; log(target?T('m_ssRun',v.label,v.ramp):T('m_ssStop',v.label,v.rampDown)); }
  const rate=1/Math.max(0.1,target?v.ramp:v.rampDown);
  if (v.level<target) v.level=Math.min(1,v.level+rate*dt); else if (v.level>target) v.level=Math.max(0,v.level-rate*dt);
  if (v.fault) v.level=0;
  v.running=v.level>0.02; v.bypass=v.level>=1;
  const outSets=new Set([F(3),F(4),F(5)]); let I=0,loss=false;
  for (const m of doc.comps) if (m.type==='motor3'&&terminals(m).some(p=>outSets.has(r.find(key(p.x,p.y))))){ const base=motorCurrent(m); I+=v.bypass?base:base*(1+2.5*(1-v.level)); if (sim.loadState.get(m.id)==='loss') loss=true; }
  v.current=v.running?I:0; v.freq=v.level*50;
  if (v.running&&loss){ v.oplT+=dt; if (v.oplT>0.5&&!v.fault) vfdFault(v,'OPL',T('f_OPL')); } else v.oplT=0;
  if (v.running&&v.bypass){ const ratio=I/v.irated; if (ratio>1.05){ v.heat+=dt*(ratio*ratio-1)/3; if (v.heat>10&&!v.fault){ v.heat=0; vfdFault(v,'oL',T('f_oL',I.toFixed(1),v.irated)); } } else v.heat=Math.max(0,v.heat-dt); }
  v.rel=[v.running&&!v.fault,false];
}
// ---- mini PLC: expression language  Q1 = I1 & !I2 | Q1 ;  T1 = TON(expr, sec)  ----
function plcParse(prog){
  const rules=[]; const errs=[];
  for (const raw of String(prog||'').split('\n')){ const line=raw.split('//')[0].trim(); if (!line) continue; const m=line.match(/^(Q[1-8]|T[1-8])\s*=\s*(.+)$/i); if (!m){ errs.push(line); continue; }
    const dst=m[1].toUpperCase(); let expr=m[2].trim(); let timer=null;
    if (dst[0]==='T'){ const tm=expr.match(/^(TON|TOF)\s*\((.+),\s*([0-9.]+)\s*\)$/i); if (!tm){ errs.push(line); continue; } timer={kind:tm[1].toUpperCase(),sec:parseFloat(tm[3])}; expr=tm[2]; }
    try{ rules.push({dst,ast:plcExpr(expr),timer}); }catch(e){ errs.push(line); } }
  return {rules,errs};
}
function plcExpr(src){
  const toks=src.match(/[IQT][1-8]|&|\||!|\(|\)|AND|OR|NOT/gi); if (!toks) throw 0; let i=0;
  const peek=()=>toks[i], next=()=>toks[i++];
  const prim=()=>{ const t=next(); if (!t) throw 0; const u=t.toUpperCase(); if (u==='!'||u==='NOT') return {op:'!',a:prim()}; if (u==='('){ const e=orx(); if (next()!==')') throw 0; return e; } if (/^[IQT][1-8]$/.test(u)) return {v:u}; throw 0; };
  const andx=()=>{ let a=prim(); while (peek()&&['&','AND'].includes(peek().toUpperCase())){ next(); a={op:'&',a,b:prim()}; } return a; };
  const orx=()=>{ let a=andx(); while (peek()&&['|','OR'].includes(peek().toUpperCase())){ next(); a={op:'|',a,b:andx()}; } return a; };
  const e=orx(); if (i<toks.length) throw 0; return e;
}
function plcEval(ast,env){ if (ast.v) return !!env[ast.v]; if (ast.op==='!') return !plcEval(ast.a,env); if (ast.op==='&') return plcEval(ast.a,env)&&plcEval(ast.b,env); return plcEval(ast.a,env)||plcEval(ast.b,env); }
function plcUpdate(c,r,dt){
  if (c._progSrc!==c.prog){ const p=plcParse(c.prog); c._rules=p.rules; c.plcErr=p.errs.join(' ; '); c._progSrc=c.prog; c.plcT=[]; }
  const t=terminals(c); const F=i=>r.find(key(t[i].x,t[i].y)); const com=F(8);
  const env={}; for (let i=0;i<8;i++) env['I'+(i+1)]=F(i)===com; for (let i=0;i<8;i++) env['Q'+(i+1)]=c.plcQ[i]; for (let i=0;i<8;i++) env['T'+(i+1)]=!!(c.plcT[i]&&c.plcT[i].done);
  c.plcI=[...Array(8)].map((_,i)=>env['I'+(i+1)]);
  for (let pass=0;pass<4;pass++) for (const rule of (c._rules||[])){
    const val=plcEval(rule.ast,env);
    if (rule.timer){ const k=parseInt(rule.dst[1])-1; const tm=c.plcT[k]||(c.plcT[k]={acc:0,done:false});
      if (rule.timer.kind==='TON'){ if (val){ if (pass===0) tm.acc=Math.min(rule.timer.sec,tm.acc+dt); tm.done=tm.acc>=rule.timer.sec; } else { tm.acc=0; tm.done=false; } }
      else { if (val){ tm.acc=0; tm.done=true; } else if (tm.done){ if (pass===0) tm.acc+=dt; if (tm.acc>=rule.timer.sec) tm.done=false; } }
      env[rule.dst]=tm.done; }
    else env[rule.dst]=val;
  }
  for (let i=0;i<8;i++){ const nv=!!env['Q'+(i+1)]; if (nv!==c.plcQ[i]) log(T('m_plcQ',c.label,i+1,nv),nv?'good':''); c.plcQ[i]=nv; }
}
function vfdFault(v,code,why){ v.fault=code; v.freq=0; v.target=0; v.running=false; log(T('m_vfdFault',v.label,code,why),'fault'); }
function vfdUpdate(v,r,dt){
  const t=terminals(v); const P=i=>r.potOf(key(t[i].x,t[i].y)); const F=i=>r.find(key(t[i].x,t[i].y));
  const inP=[P(0),P(1),P(2)]; let powered=false,phl=false;
  if (inP.some(p=>p==='short')) powered=false;
  else if (v.volt===400){ const ph=new Set(inP.filter(isMains)); powered=ph.size>=2; phl=ph.size===2; }
  else powered=(isMains(inP[0])&&isN(inP[1]))||(isMains(inP[1])&&isN(inP[0]));
  if (!powered){ if (v.powered) log(T('m_vfdLost',v.label)); v.powered=false; v.freq=0; v.target=0; v.running=false; v.fault=null; v.rel=[false,false]; v.heat=0; return; }
  if (!v.powered){ v.powered=true; log(T('m_vfdReady',v.label),'good'); }
  const com=F(11); const fn={}; v.xfn.forEach((f,i)=>{ if (F(6+i)===com) fn[f]=true; });
  if (phl){ v.phlT+=dt; if (v.phlT>1&&!v.fault) vfdFault(v,'PHL',T('f_PHL')); } else v.phlT=0;
  if (fn.EXT_FAULT&&!v.fault) vfdFault(v,'EF',T('f_EF'));
  if (fn.RESET&&!v.resetPrev&&v.fault){ v.fault=null; log(T('m_vfdReset',v.label,'X'+(v.xfn.indexOf('RESET')+1)),'good'); }
  v.resetPrev=!!fn.RESET;
  let target=0;
  if (!v.fault&&!fn.COAST){ let f=v.setf; if (fn.MS1&&fn.MS2) f=v.ms3; else if (fn.MS1) f=v.ms1; else if (fn.MS2) f=v.ms2; if (fn.JOG) f=5; const dir=(fn.FWD&&!fn.REV)?1:(fn.REV&&!fn.FWD)?-1:(fn.JOG?1:0); target=Math.min(f,v.fmax)*dir; }
  if (fn.COAST||v.fault) v.freq=0;
  const wasRun=v.running;
  if (v.target!==target){ if (target!==0) log(T('m_vfdRun',v.label,target>0,Math.abs(target))); else if (wasRun) log(T('m_vfdStop',v.label,v.decel)); v.target=target; }
  const rate=v.fmax/(Math.abs(target)>Math.abs(v.freq)?Math.max(0.1,v.accel):Math.max(0.1,v.decel));
  if (v.freq<target) v.freq=Math.min(target,v.freq+rate*dt); else if (v.freq>target) v.freq=Math.max(target,v.freq-rate*dt);
  v.running=Math.abs(v.freq)>0.05;
  const outSets=new Set([F(3),F(4),F(5)]); let I=0,loss=false;
  for (const m of doc.comps) if (m.type==='motor3'&&terminals(m).some(p=>outSets.has(r.find(key(p.x,p.y))))){ I+=motorCurrent(m); if (sim.loadState.get(m.id)==='loss') loss=true; }
  v.current=v.running?I:0;
  if (v.running&&loss){ v.oplT+=dt; if (v.oplT>0.5&&!v.fault) vfdFault(v,'OPL',T('f_OPL')); } else v.oplT=0;
  if (v.running){ const ratio=I/v.irated; if (ratio>2.5&&!v.fault) vfdFault(v,'OC',T('f_OCI',I.toFixed(1),v.irated)); else if (ratio>1.05){ v.heat+=dt*(ratio*ratio-1)/3; if (v.heat>10&&!v.fault){ v.heat=0; vfdFault(v,'oL',T('f_oL',I.toFixed(1),v.irated)); } } else v.heat=Math.max(0,v.heat-dt); }
  v.rel=v.rfn.map(f=>f==='RUN'?v.running:f==='AT_SPEED'?(v.running&&Math.abs(Math.abs(v.freq)-Math.abs(v.target))<0.3):f==='FAULT'?!!v.fault:f==='READY'?!v.fault:false);
}
function resetProtection(){ mains.tripped=false; for (const c of doc.comps){ if (c.hidden) continue; c.blown=false; c.tripped=false; c.burnt=false; c.stress=0; c.heat=0; if(isBrk(c.type)||c.type==='rcd2'||c.type==='rcd4') c.on=true; if(c.type==='vfd'||c.type==='softstart') c.fault=null; } log(T('m_resetAll'),'good'); }
function log(msg,cls){ const el=document.getElementById('log'); if (el.querySelector('.hint')) el.innerHTML=''; const d=document.createElement('div'); d.className=cls||''; d.innerHTML=`<span class="t">${simTime.toFixed(1)}s</span>${msg}`; el.appendChild(d); el.scrollTop=el.scrollHeight; }
