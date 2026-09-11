/* ==========================================================================
   ui.js — UI: palette, properties panel, run panel, run loop, exercise mode, header buttons, files, language
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
// ---------- palette & props ----------
const pal=document.getElementById('palette');
function buildPalette(){ pal.innerHTML=`<button class="closeX" onclick="document.getElementById('dim').click()">✕</button><h2>${T('tools')}</h2>`; pal.appendChild(toolBtn('select',T('select'),'<path d="M14 3l14 10-6 1 4 6-3 2-4-6-4 5z"/>')); pal.appendChild(toolBtn('wire',T('wire'),'<path d="M4 16h14v-10h22"/><circle cx="4" cy="16" r="2"/><circle cx="40" cy="6" r="2"/>')); pal.appendChild(toolBtn('bus',T('bus'),'<rect x="2" y="9" width="40" height="6"/>')); pal.appendChild(toolBtn('meter',T('meter'),'<circle cx="22" cy="11" r="8"/><path d="M18 14l4-6 4 6M10 20l6-5M34 20l-6-5"/>')); pal.appendChild(toolBtn('clamp',T('clamp'),'<path d="M22 4a8 8 0 1 1-6 13M22 4a8 8 0 0 0-6 13"/><path d="M2 12h40" stroke-dasharray="3 2"/>')); for (const [title,list] of PALETTE){ pal.insertAdjacentHTML('beforeend',`<h2>${T(title)}</h2>`); for (const t of list) pal.appendChild(toolBtn(t,tname(t),TYPES[t].icon)); } }
function toolBtn(id,name,icon){ const b=document.createElement('button'); b.className='tool'+(tool===id?' active':''); b.dataset.tool=id; b.innerHTML=`<svg viewBox="0 0 44 24">${icon}</svg><span>${name}</span>`; b.onclick=()=>setTool(id); return b; }
function setTool(t){ tool=t; wireStart=null; rotGhost=0; if (t!=='meter'){ } document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('active',b.dataset.tool===t)); cv.className=(t==='meter'||t==='clamp')?'meter':running?'run':(t==='select'?'select':''); setStatus(t==='select'?T('ready'):t==='wire'?T('wireHint'):t==='bus'?T('busHint'):t==='meter'?T('meterHint'):t==='clamp'?T('clampHint'):T('placeHint',tname(t))); draw(); }
function setStatus(s){ document.getElementById('status').textContent=s; }
const fld=(id,label,type,val,extra='')=>`<div class="field"><label>${label}</label><input id="${id}" type="${type}" value="${val}" ${extra}></div>`;
const self=(id,label,opts,val)=>`<div class="field"><label>${label}</label><select id="${id}">${opts.map(([v,n])=>`<option value="${v}"${String(val)===String(v)?' selected':''}>${n}</option>`).join('')}</select></div>`;
function renderProps(){
  const el=document.getElementById('propsBody');
  if (running){ renderRunPanel(); return; }
  if (!selCount()){ el.className='hint'; el.textContent=T('noSel'); return; }
  if (selCount()>1){ el.className=''; el.innerHTML=`<div class="hint" style="margin-bottom:8px">${T('multi',sel.comps.size,sel.wires.size)}</div><button class="danger" id="delBtn">${T('delSel')}</button>`; el.querySelector('#delBtn').onclick=deleteSel; return; }
  if (sel.wires.size>=1&&sel.comps.size===0){ el.className=''; const w=doc.wires.find(x=>sel.wires.has(x.id)); const cols=[['','auto'],['#8D5524','Brown'],['#212121','Black'],['#8A9299','Grey'],['#2A64B0','Blue'],['#2E7D32','Green/Yellow'],['#D8322A','Red'],['#B87333','Copper'],['#F9A825','Yellow'],['#FFFFFF','White']].map(([v,n])=>[v,v?n:T('auto')]);
    el.innerHTML=`<div class="hint" style="margin-bottom:8px">${sel.wires.size===1?T('wireSel'):T('multi',0,sel.wires.size)}</div><div class="row">${fld('wW',T('thick'),'number',w.w||2,'min="1" max="24" step="1"')}${self('wC',T('wColor'),cols,w.color||'')}</div><button class="danger" id="delBtn">${T('delWire')}</button>`;
    const apply=fn=>{ pushHistory(); for (const x of doc.wires) if (sel.wires.has(x.id)) fn(x); draw(); };
    el.querySelector('#wW').oninput=e=>apply(x=>{ x.w=Math.max(1,Math.min(24,parseInt(e.target.value)||2)); x.bus=x.w>=6; }); el.querySelector('#wC').onchange=e=>apply(x=>{ x.color=e.target.value; });
    el.querySelector('#delBtn').onclick=deleteSel; return; }
  const c=doc.comps.find(x=>sel.comps.has(x.id)); if(!c) return; const t=TYPES[c.type]; el.className='';
  let h=`<div class="hint" style="margin-bottom:6px">${tname(c.type)}</div>`+fld('pLabel',T('name'),'text',c.label);
  if (['k_no','k_nc','k3'].includes(c.type)) h+=`<div class="hint">${T('followsCoil')}</div>`;
  if (['t_no','t_nc'].includes(c.type)) h+=`<div class="hint">${T('followsTimer')}</div>`;
  if (c.type==='ol') h+=`<div class="hint">${T('followsOL')}</div>`;
  if (t.kind==='sensor') h+=`<div class="hint">${T('proxHint')}</div>`;
  if (c.type==='box') h+=fld('pSub',T('boxSub'),'text',c.sub||'');
  if (c.type==='ats') h+=`<div class="hint">${T('atsHint')}</div>`+self('pMode',T('atsMode'),[['auto','Auto'],['remote','Remote'],['manual','Manual']],c.mode)+`<div class="row">${fld('pDelay',T('atsDelay'),'number',c.delay,'min="0" step="0.5"')}${fld('pRet',T('atsRet'),'number',c.retDelay,'min="0" step="0.5"')}</div>`;
  if (c.type==='note') h+=`<div class="field"><label>${T('noteText')}</label><textarea id="pText" rows="3" style="width:100%;font:inherit;font-size:13px;padding:4px 8px;border:1px solid var(--line);border-radius:4px">${(c.text||'').replace(/</g,'&lt;')}</textarea></div><div class="hint">${T('linksN',(c.links||[]).length)}</div><button id="linkBtn" class="${linkFrom===c.id?'accent':''}">${T('linkBtn')}</button><div class="hint" id="linkHint" ${linkFrom===c.id?'':'hidden'}>${T('linkHint')}</div>`;
  const cols=[['#FFD23F',0],['#E53935',1],['#43A047',2],['#FFFFFF',3],['#1E88E5',4],['#FB8C00',5]].map(([v,i])=>[v,T('colors')[i]]);
  if (c.type==='lamp') h+=self('pColor',T('lampCol'),cols,c.color);
  if (t.kind==='load') h+=`<div class="row">${self('pVrate',T('vrate'),[[230,'230 V AC'],[400,'400 V AC'],[110,'110 V AC'],[12,'12 V DC'],[24,'24 V DC'],[48,'48 V DC']],c.vrate)}${fld('pPower',T('powerW'),'number',c.power,'min="0.1" step="1"')}</div>`;
  if (c.type==='dcps') h+=self('pVolts',T('dcOut'),[[5,'5 V'],[12,'12 V'],[24,'24 V'],[48,'48 V']],c.volts);
  if (c.type==='motor3'||c.type==='motor6') h+=`<div class="row">${fld('pPower',T('mPower'),'number',c.power,'min="0.1" step="0.1"')}${self('pPoles',T('poles'),[[2,'2 (3000 rpm)'],[4,'4 (1500 rpm)'],[6,'6 (1000 rpm)'],[8,'8 (750 rpm)']],c.poles)}</div><div class="hint">${T('mHint',motorIn(c).toFixed(1))}</div>`;
  if (c.type==='fuse') h+=fld('pRating',T('fuseA'),'number',c.rating,'min="0.1" step="0.1"');
  if (isBrk(c.type)) h+=fld('pRating',T('mcbA'),'number',c.rating,'min="0.5" step="0.5"');
  if (c.type==='ol3') h+=`<div class="row">${fld('pIset',T('iset'),'number',c.iset,'min="0.1" step="0.1"')}${fld('pPreset',T('olT'),'number',c.preset,'min="0.5" step="0.5"')}</div>`;
  if (c.type==='timer'||c.type==='timer_off') h+=fld('pPreset',T('delay'),'number',c.preset,'min="0.1" step="0.1"');
  if (MANUAL_SW.includes(c.type)||isBrk(c.type)) h+=self('pOn',T('init'),[[0,T('openS')],[1,T('closedS')]],c.on?1:0);
  if (c.type==='softstart') h+=`<div class="row">${fld('vPower',T('vSize'),'number',c.power,'min="0.1" step="0.1"')}${fld('vIrated',T('vI'),'number',c.irated,'min="0.1" step="0.1"')}</div><div class="row">${fld('sRamp',T('ssRamp'),'number',c.ramp,'min="0.1" step="0.1"')}${fld('sDown',T('ssDown'),'number',c.rampDown,'min="0.1" step="0.1"')}</div>`;
  if (c.type==='plc') h+=`<div class="field"><label>${T('plcProg')}</label><textarea id="pProg" rows="6" style="width:100%;font:12px/1.5 monospace;padding:4px 8px;border:1px solid var(--line);border-radius:4px;direction:ltr">${(c.prog||'').replace(/</g,'&lt;')}</textarea></div><div class="hint">${T('plcHelp')}</div>${c.plcErr?`<div class="hint" style="color:var(--l1)">${T('plcErr')}${c.plcErr}</div>`:''}`;
  if (c.type==='vfd'){
    h+=`<div class="row">${fld('vPower',T('vSize'),'number',c.power,'min="0.1" step="0.1"')}${self('vVolt',T('vVolt'),[[400,'400 V 3-ph'],[230,'230 V 1-ph']],c.volt)}</div>`;
    h+=`<div class="row">${fld('vIrated',T('vI'),'number',c.irated,'min="0.1" step="0.1"')}${fld('vFmax',T('vFmax'),'number',c.fmax,'min="1" step="1"')}</div>`;
    h+=`<div class="row">${fld('vSetf',T('vSet'),'number',c.setf,'min="0" step="0.5"')}${fld('vAccel',T('vAcc'),'number',c.accel,'min="0.1" step="0.1"')}</div>`;
    h+=`<div class="row">${fld('vDecel',T('vDec'),'number',c.decel,'min="0.1" step="0.1"')}${fld('vMs1',T('vMs1'),'number',c.ms1,'min="0" step="0.5"')}</div>`;
    h+=`<div class="row">${fld('vMs2',T('vMs2'),'number',c.ms2,'min="0" step="0.5"')}${fld('vMs3',T('vMs3'),'number',c.ms3,'min="0" step="0.5"')}</div>`;
    h+=`<div class="hint" style="margin:4px 0">${T('vDI')}</div>`; for (let i=0;i<5;i++) h+=self('vX'+i,'X'+(i+1),XFN.map(f=>[f,f.replace('_',' ')]),c.xfn[i]);
    h+=`<div class="hint" style="margin:4px 0">${T('vRel')}</div><div class="row">${self('vR0',T('relay')+' 1',RFN.map(f=>[f,f.replace('_',' ')]),c.rfn[0])}${self('vR1',T('relay')+' 2',RFN.map(f=>[f,f.replace('_',' ')]),c.rfn[1])}</div>`;
  }
  h+=`<button id="rotBtn">${T('rotate')}</button> <button class="danger" id="delBtn">${T('del')}</button>`;
  el.innerHTML=h;
  const s=(id,fn)=>{ const e=el.querySelector('#'+id); if(e) e.onchange=ev=>{ pushHistory(); fn(ev.target.value); draw(); }; };
  const num=(id,prop,min)=>{ const e=el.querySelector('#'+id); if(e){ e.onfocus=()=>pushHistory(); e.oninput=ev=>{ c[prop]=Math.max(min,parseFloat(ev.target.value)||min); draw(); }; } };
  const lb=el.querySelector('#pLabel'); lb.onfocus=()=>pushHistory(); lb.oninput=e=>{ c.label=e.target.value.trim(); draw(); };
  const sb=el.querySelector('#pSub'); if (sb){ sb.onfocus=()=>pushHistory(); sb.oninput=e=>{ c.sub=e.target.value; draw(); }; }
  const tx=el.querySelector('#pText'); if (tx){ tx.onfocus=()=>pushHistory(); tx.oninput=e=>{ c.text=e.target.value; draw(); }; }
  const lk=el.querySelector('#linkBtn'); if (lk) lk.onclick=()=>{ linkFrom=linkFrom===c.id?null:c.id; renderProps(); setStatus(linkFrom!==null?T('linkHint'):T('ready')); };
  num('pDelay','delay',0); num('pRet','retDelay',0); s('pMode',v=>c.mode=v); num('sRamp','ramp',0.1); num('sDown','rampDown',0.1);
  const pg=el.querySelector('#pProg'); if (pg){ pg.onfocus=()=>pushHistory(); pg.oninput=e=>{ c.prog=e.target.value; const pr=plcParse(c.prog); c.plcErr=pr.errs.join(' ; '); }; pg.onblur=()=>renderProps(); }
  num('pPower','power',0.1); num('pRating','rating',0.1); num('pIset','iset',0.1); num('pPreset','preset',0.1);
  num('vPower','power',0.1); num('vIrated','irated',0.1); num('vFmax','fmax',1); num('vSetf','setf',0); num('vAccel','accel',0.1); num('vDecel','decel',0.1); num('vMs1','ms1',0); num('vMs2','ms2',0); num('vMs3','ms3',0);
  s('pColor',v=>c.color=v); s('pVrate',v=>c.vrate=+v); s('pVolts',v=>c.volts=+v); s('pPoles',v=>c.poles=+v); s('pOn',v=>c.on=v==='1'); s('vVolt',v=>c.volt=+v);
  for (let i=0;i<5;i++) s('vX'+i,v=>c.xfn[i]=v); s('vR0',v=>c.rfn[0]=v); s('vR1',v=>c.rfn[1]=v);
  el.querySelector('#rotBtn').onclick=()=>{ rotateComp(c); draw(); }; el.querySelector('#delBtn').onclick=deleteSel;
}
function renderRunPanel(){
  const el=document.getElementById('propsBody'); el.className='';
  const motors=doc.comps.filter(c=>c.type==='motor3'||c.type==='motor6'),ols=doc.comps.filter(c=>c.type==='ol3'),vfds=doc.comps.filter(c=>c.type==='vfd');
  if (!motors.length&&!vfds.length){ el.className='hint'; el.textContent=T('runPanel'); return; }
  el.innerHTML=vfds.map(v=>`<div class="field"><label>${v.label} — ${T('setSpeed')}: <b id="vs${v.id}">${v.setf}</b> Hz — ${T('output')} <b id="vf${v.id}">0.0</b> Hz, <b id="vc${v.id}">0.0</b> A</label><input type="range" min="0" max="${v.fmax}" step="0.5" value="${v.setf}" data-vfd="${v.id}"></div>`).join('')
    + motors.map(m=>`<div class="field"><label>${m.label} — ${T('torque')}: <b id="lp${m.id}">${m.loadPct}%</b> — ${T('current')}: <b id="cur${m.id}">0.0</b> A (${T('rated')} ${motorIn(m).toFixed(1)} A)</label><input type="range" min="0" max="250" step="5" value="${m.loadPct}" data-id="${m.id}"></div>`).join('')
    + ols.map(o=>`<div class="hint">${o.label}: ${T('setting')} ${o.iset} A — ${T('heating')} <b id="heat${o.id}">0%</b></div>`).join('');
  el.querySelectorAll('input[data-id]').forEach(inp=>inp.oninput=e=>{ const m=doc.comps.find(c=>c.id==inp.dataset.id); m.loadPct=parseInt(e.target.value); document.getElementById('lp'+m.id).textContent=m.loadPct+'%'; });
  el.querySelectorAll('input[data-vfd]').forEach(inp=>inp.oninput=e=>{ const v=doc.comps.find(c=>c.id==inp.dataset.vfd); v.setf=parseFloat(e.target.value); document.getElementById('vs'+v.id).textContent=v.setf; });
}
function updateRunPanel(){ for (const c of doc.comps){ let e; if ((c.type==='motor3'||c.type==='motor6')&&(e=document.getElementById('cur'+c.id))) e.textContent=motorCurrent(c).toFixed(1); if (c.type==='ol3'&&(e=document.getElementById('heat'+c.id))) e.textContent=c.tripped?T('tripped'):Math.round(100*c.heat/c.preset)+'%'; if (c.type==='vfd'){ if((e=document.getElementById('vf'+c.id))) e.textContent=Math.abs(c.freq).toFixed(1); if((e=document.getElementById('vc'+c.id))) e.textContent=(c.current||0).toFixed(1); } } }

// ---------- run loop ----------
function toggleRun(){
  running=!running; const b=document.getElementById('runBtn');
  if (running){
    sim=freshSim(); simTime=0; sparks=[]; mains.tripped=false; document.getElementById('log').innerHTML='';
    for (const c of doc.comps){ c.pressed=false; c.elapsed=0; c.done=false; c.stress=0; c.heat=0; c.current=0; if (c.type==='vfd'||c.type==='softstart'){ c.freq=0; c.target=0; c.level=0; c.running=false; c.powered=false; c.fault=null; c.rel=[false,false]; c.phlT=0; c.oplT=0; c.resetPrev=false; } if (c.type==='plc'){ c.plcQ=[false,false,false,false,false,false,false,false]; c.plcT=[]; c._progSrc=null; } if (TYPES[c.type].kind==='sensor') c.on=false; if (c.type==='ats'){ c.pos=0; c.target=0; c.moveT=0; c.waitT=0; c.pending=undefined; } }
    clearSel(); renderProps(); if (tool!=='meter'&&tool!=='clamp') setTool('select'); cv.className='run'; b.textContent=T('stop'); b.classList.add('running'); document.getElementById('resetBtn').hidden=false;
    log(T('simStart'),'good'); lastT=performance.now(); requestAnimationFrame(loop); setStatus(T('running'));
  } else {
    b.textContent=T('run'); b.classList.remove('running'); document.getElementById('resetBtn').hidden=true;
    for (const w of doc.wires) if(!w.hidden) w.cut=false; for (const c of doc.comps){ if (c.hidden) continue; c.blown=false; c.tripped=false; c.burnt=false; if(isBrk(c.type)||c.type==='rcd2'||c.type==='rcd4') c.on=true; if(c.type==='vfd'||c.type==='softstart'){ c.fault=null; c.running=false; c.freq=0; c.level=0; } if (c.type==='plc'){ c.plcQ=[false,false,false,false,false,false,false,false]; c.plcT=[]; } }
    sim=freshSim(); sparks=[]; cv.className='select'; document.getElementById('simMsg').textContent=''; setStatus(T('ready')); renderProps(); draw();
  }
}
function loop(t){
  if (!running) return; const dt=Math.max(0,Math.min(0.1,(t-lastT)/1000)); lastT=t; simulate(dt);
  const m=document.getElementById('simMsg');
  if (mains.tripped){ m.className='warn'; m.textContent=T('mainsTrip'); } else if (sim.shorts.length){ m.className='warn'; m.textContent=T('short'); } else if (sim.unstable){ m.className='warn'; m.textContent=T('unstable'); }
  else if (!doc.comps.some(c=>TYPES[c.type].kind==='source')){ m.className='warn'; m.textContent=T('noSrc'); } else { m.className='ok'; m.textContent=T('loads',[...sim.loadState.values()].filter(isOn).length); }
  draw(); requestAnimationFrame(loop);
}

// ---------- exercise mode ----------
function faultName(f){ if (!f) return ''; if (f.kind==='cut') return T('fCut'); const c=doc.comps.find(x=>x.id===f.id); return f.kind==='fuse'?T('fFuse',c.label):f.kind==='burnt'?T('fBurnt',c.label):T('fStuck',c.label); }
function startExercise(){
  if (ex.active){ endExercise(); return; }
  if (!doc.comps.length){ setStatus(T('exNeed')); return; }
  if (running) toggleRun();
  const opts=[];
  for (const w of doc.wires) opts.push({kind:'cut',id:w.id});
  for (const c of doc.comps){ if (c.type==='fuse') opts.push({kind:'fuse',id:c.id}); if (['coil','lamp','timer','buzzer','heater'].includes(c.type)) opts.push({kind:'burnt',id:c.id}); if (['k_no','pb_no','pb_nc','k_nc','ol','sw'].includes(c.type)) opts.push({kind:'stuck',id:c.id}); }
  if (!opts.length) return;
  const f=opts[Math.floor(Math.random()*opts.length)];
  if (f.kind==='cut'){ const w=doc.wires.find(x=>x.id===f.id); w.cut=true; w.hidden=true; }
  else { const c=doc.comps.find(x=>x.id===f.id); c.hidden=true; if (f.kind==='fuse') c.blown=true; else if (f.kind==='burnt') c.burnt=true; else c.stuck='open'; }
  ex={active:true,fault:f,guessing:false,done:false};
  document.getElementById('exPanel').hidden=false; document.getElementById('exPanel').innerHTML=`<div class="exbox">${T('exIntro')}</div>`;
  document.getElementById('exGuess').hidden=false; document.getElementById('exReveal').hidden=false; document.getElementById('exBtn').textContent=T('exStop');
  toggleRun();
}
function endExercise(){
  const f=ex.fault;
  if (f){ if (f.kind==='cut'){ const w=doc.wires.find(x=>x.id===f.id); if (w){ w.cut=false; w.hidden=false; } } else { const c=doc.comps.find(x=>x.id===f.id); if (c){ c.hidden=false; c.blown=false; c.burnt=false; c.stuck=null; } } }
  ex={active:false,fault:null,guessing:false,done:false};
  document.getElementById('exPanel').hidden=true; document.getElementById('exGuess').hidden=true; document.getElementById('exReveal').hidden=true; document.getElementById('exBtn').textContent=T('ex');
  if (running) toggleRun(); draw();
}
function exGuess(c,w){
  const f=ex.fault; const ok=(c&&f.kind!=='cut'&&c.id===f.id)||(w&&f.kind==='cut'&&w.id===f.id);
  const p=document.getElementById('exPanel');
  if (ok){ p.innerHTML=`<div class="exbox" style="background:#E3F4E8;border-color:var(--ok)">${T('exRight',faultName(f))}</div>`; ex.guessing=false; ex.done=true; revealFault(); }
  else { p.innerHTML=`<div class="exbox">${T('exIntro')}<br><b style="color:var(--l1)">${T('exWrong')}</b></div>`; ex.guessing=false; }
  setStatus(T('ready')); draw();
}
function revealFault(){ const f=ex.fault; if (!f) return; if (f.kind==='cut'){ const w=doc.wires.find(x=>x.id===f.id); if (w) w.hidden=false; } else { const c=doc.comps.find(x=>x.id===f.id); if (c){ c.hidden=false; if (f.kind==='stuck'){ c.stuck=null; c.burnt=true; } } } draw(); }
document.getElementById('exBtn').onclick=startExercise;
document.getElementById('exGuess').onclick=()=>{ if (!ex.active||ex.done) return; ex.guessing=true; setStatus(T('exGuessHint')); };
document.getElementById('exReveal').onclick=()=>{ if (!ex.active) return; document.getElementById('exPanel').innerHTML=`<div class="exbox">${T('exReveal',faultName(ex.fault))}</div>`; ex.done=true; ex.guessing=false; revealFault(); };

// ---------- header buttons / file ----------
document.getElementById('runBtn').onclick=toggleRun;
document.getElementById('resetBtn').onclick=resetProtection;
document.getElementById('undoBtn').onclick=undo; document.getElementById('redoBtn').onclick=redo;
document.getElementById('fitBtn').onclick=fitView; document.getElementById('pngBtn').onclick=exportPNG; document.getElementById('printBtn').onclick=printPDF;
document.getElementById('chkNum').onchange=e=>{ showNum=e.target.checked; draw(); };
document.getElementById('chkCol').onchange=e=>{ showCol=e.target.checked; draw(); };
document.getElementById('saveBtn').onclick=()=>{ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([serialize()],{type:'application/json'})); a.download='circuit.json'; a.click(); };
document.getElementById('loadBtn').onclick=()=>document.getElementById('fileIn').click();
document.getElementById('fileIn').onchange=e=>{ const f=e.target.files[0]; if(!f) return; f.text().then(txt=>{ try{ const d=JSON.parse(txt); if(!d.comps||!d.wires) throw 0; if(running) toggleRun(); pushHistory(); d.comps=d.comps.filter(c=>TYPES[c.type]).map(c=>({...defaults(c.type),...c,hidden:false,stuck:null})); d.wires=d.wires.map(w=>({w:2,color:'',bus:false,...w,hidden:false,cut:false})); doc=d; clearSel(); renderProps(); fitView(); setStatus(T('opened')); }catch{ setStatus(T('invalid')); } }); e.target.value=''; };
document.getElementById('clearBtn').onclick=()=>{ if(running) toggleRun(); if (doc.comps.length&&!confirm(T('clearQ'))) return; pushHistory(); doc={comps:[],wires:[],nextId:1}; clearSel(); renderProps(); draw(); };
document.getElementById('langBtn').onclick=()=>{ lang=lang==='en'?'ar':'en'; applyLang(); };
function applyLang(){
  document.documentElement.lang=lang; document.documentElement.dir=lang==='ar'?'rtl':'ltr';
  const set=(id,k)=>{ document.getElementById(id).textContent=T(k); };
  set('resetBtn','reset'); set('exBtn','ex'); set('fitBtn','fit'); set('pngBtn','png'); set('printBtn','print'); set('saveBtn','save'); set('loadBtn','open'); set('langBtn','lang'); document.getElementById('exGuess').textContent=T('guess'); document.getElementById('exReveal').textContent=T('reveal'); document.getElementById('clearBtn').textContent=T('new');
  document.getElementById('runBtn').textContent=running?T('stop'):T('run'); if (ex.active) document.getElementById('exBtn').textContent=T('exStop');
  document.getElementById('ttl').innerHTML=`${T('ttl')}<span id="sub">${T('sub')}</span>`; ['hProps','hLog','hKeys','lblNum','lblCol'].forEach(k=>set(k,k));
  document.getElementById('keys').innerHTML=T('keys'); const lg=document.getElementById('log'); if (!lg.children.length||lg.querySelector('.hint')) lg.innerHTML=`<div class="hint">${T('logHint')}</div>`;
  document.getElementById('exampleSel').innerHTML=`<option value="">${T('examples')}</option><option value="dol">${T('exDol')}</option><option value="sd">${T('exSD')}</option><option value="vfd">${T('exVfd')}</option><option value="tank">${T('exTank')}</option><option value="ats">${T('exAts')}</option>`;
  document.getElementById('legend').innerHTML=[['L1','L1'],['L2','L2'],['L3','L3'],['N','N'],['L1b','L1′'],['Nb','N′'],['PE','PE'],['U','U'],['V','V'],['W','W'],['DC+','DC+'],['DC-','DC−']].map(([k,n])=>`<span><i style="background:${k==='PE'?'linear-gradient(90deg,#2E7D32 50%,#FBC02D 50%)':C[k]}"></i>${n}</span>`).join('');
  buildPalette(); renderProps(); setTool(tool);
}

// ---------- mobile drawers ----------
const dim=document.getElementById('dim');
function openDrawer(id){ document.getElementById(id).classList.add('open'); dim.classList.add('show'); }
function closeDrawers(){ document.getElementById('palette').classList.remove('open'); document.getElementById('props').classList.remove('open'); dim.classList.remove('show'); }
document.getElementById('menuBtn').onclick=()=>openDrawer('palette');
document.getElementById('propBtn').onclick=()=>openDrawer('props');
document.getElementById('propsClose').onclick=closeDrawers; dim.onclick=closeDrawers;
document.getElementById('palette').addEventListener('click',e=>{ if (e.target.closest('.tool')&&window.innerWidth<=900) closeDrawers(); });
