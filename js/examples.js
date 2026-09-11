/* ==========================================================================
   examples.js — Built-in example circuits and app start-up
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
// ---------- examples ----------
function powerColumn(motorType,extraGap){
  addComp('L1',40,3); addComp('L2',42,3); addComp('L3',44,3);
  const q=addComp('mcb3',42,6,0,'Q1'); q.rating=10; addComp('k3',42,12,0,'K1'); const ol=addComp('ol3',42,17,0,'F1'); ol.iset=4.6;
  const mo=addComp(motorType,42,motorType==='motor6'?24:22,0,'M1'); mo.power=2.2;
  for (const x of [40,42,44]){ addWire(x,3,x,4); addWire(x,8,x,10); addWire(x,14,x,15); addWire(x,19,x,motorType==='motor6'?22:20); }
  return mo;
}
function exampleDOL(){
  powerColumn('motor3');
  addWire(40,9,36,9); addWire(36,9,36,22); addComp('N',5,3); addWire(5,3,5,22);
  const f2=addComp('fuse',33,10,0,'F2'); f2.rating=2; addComp('ol',28,10,0,'F1'); addComp('pb_nc',23,10,0,'S0'); addComp('t_nc',18,10,0,'T1'); addComp('pb_no',13,10,0,'S1'); addComp('coil',7,10,0,'K1');
  addWire(36,10,35,10); addWire(31,10,30,10); addWire(26,10,25,10); addWire(21,10,20,10); addWire(16,10,15,10); addWire(11,10,9,10);
  addComp('k_no',13,13,0,'K1'); addWire(11,10,11,13); addWire(15,10,15,13);
  addComp('k_no',33,16,0,'K1'); const h1=addComp('lamp',7,16,0,'H1'); h1.color='#43A047'; addWire(36,16,35,16); addWire(31,16,9,16);
  addComp('k_no',33,19,0,'K1'); const tm=addComp('timer',7,19,0,'T1'); tm.preset=8; addWire(36,19,35,19); addWire(31,19,9,19);
  addComp('t_no',33,22,0,'T1'); const h2=addComp('lamp',7,22,0,'H2'); h2.color='#E53935'; addWire(36,22,35,22); addWire(31,22,9,22);
  setStatus(T('s_dol'));
}
function exampleSD(){
  powerColumn('motor6');
  // star contactor K2 below motor, bottoms bridged
  addComp('k3',42,30,0,'K2'); for (const x of [40,42,44]) addWire(x,26,x,28); addWire(40,32,44,32);
  // delta contactor K3 to the right: L1->W2, L2->U2, L3->V2
  addComp('k3',50,30,0,'K3');
  addWire(40,20,48,20); addWire(48,20,48,28); addWire(42,21,50,21); addWire(50,21,50,28); addWire(44,22,52,22); addWire(52,22,52,28);
  addWire(48,32,48,34); addWire(48,34,38,34); addWire(38,34,38,26); addWire(38,26,40,26);
  addWire(50,32,50,35); addWire(50,35,37,35); addWire(37,35,37,27); addWire(37,27,42,27);
  addWire(52,32,52,33); addWire(52,33,46,33); addWire(46,33,46,27); addWire(46,27,44,27);
  // control
  addWire(40,9,30,9); addWire(30,9,30,25); addComp('N',2,3); addWire(2,3,2,25);
  const f2=addComp('fuse',27,10,0,'F2'); f2.rating=2; addComp('ol',22,10,0,'F1'); addComp('pb_nc',17,10,0,'S0'); addComp('pb_no',12,10,0,'S1'); addComp('coil',6,10,0,'K1');
  addWire(30,10,29,10); addWire(25,10,24,10); addWire(20,10,19,10); addWire(15,10,14,10); addWire(10,10,8,10); addWire(4,10,2,10);
  addComp('k_no',12,13,0,'K1'); addWire(14,10,14,13); addWire(10,10,10,13);
  addComp('k_no',27,16,0,'K1'); const tm=addComp('timer',6,16,0,'T1'); tm.preset=5; addWire(30,16,29,16); addWire(25,16,8,16); addWire(4,16,2,16);
  addComp('k_no',27,19,0,'K1'); addComp('t_nc',22,19,0,'T1'); addComp('k_nc',17,19,0,'K3'); addComp('coil',6,19,0,'K2'); addWire(30,19,29,19); addWire(25,19,24,19); addWire(20,19,19,19); addWire(15,19,8,19); addWire(4,19,2,19);
  addComp('k_no',27,22,0,'K1'); addComp('t_no',22,22,0,'T1'); addComp('k_nc',17,22,0,'K2'); addComp('coil',6,22,0,'K3'); addWire(30,22,29,22); addWire(25,22,24,22); addWire(20,22,19,22); addWire(15,22,8,22); addWire(4,22,2,22);
  addComp('k_no',27,25,0,'K1'); const h1=addComp('lamp',6,25,0,'H1'); h1.color='#43A047'; addWire(30,25,29,25); addWire(25,25,8,25); addWire(4,25,2,25);
  setStatus(T('s_sd'));
}
function exampleVFD(){
  addComp('L1',6,3); addComp('L2',8,3); addComp('L3',10,3);
  const q=addComp('mcb3',8,6,0,'Q1'); q.rating=10;
  const v=addComp('vfd',8,16,0,'U1'); v.xfn=['FWD','REV','MS1','MS2','RESET']; v.rfn=['RUN','FAULT']; v.setf=50; v.ms1=15; v.ms2=30; v.ms3=45;
  const mo=addComp('motor3',8,26,0,'M1'); mo.power=2.2;
  for (const x of [6,8,10]){ addWire(x,3,x,4); addWire(x,8,x,11); addWire(x,21,x,24); }
  const ps=addComp('dcps',24,24,2,'G1'); ps.volts=24;
  addWire(25,22,25,12); addWire(25,12,12,12); addWire(25,18,12,18); addWire(23,22,23,14); addWire(23,22,23,30);
  const h1=addComp('lamp',18,14,0,'H1'); h1.vrate=24; h1.color='#43A047'; addWire(12,14,16,14); addWire(20,14,23,14);
  const h2=addComp('lamp',18,16,0,'H2'); h2.vrate=24; h2.color='#E53935'; addWire(12,16,16,16); addWire(20,16,23,16);
  [['sw','S1'],['sw','S2'],['sw','S3'],['sw','S4'],['pb_no','S5']].forEach(([t,l],i)=>{ const y=12+i; addComp(t,-3,y,0,l); addWire(-1,y,4,y); addWire(-5,y,-7,y); });
  addWire(-7,12,-7,30); addWire(-7,30,23,30); addWire(4,18,2,18); addWire(2,18,2,30);
  setStatus(T('s_vfd'));
}
function exampleTank(){
  powerColumn('motor3');
  const ps=addComp('dcps',17,3,0,'G1'); ps.volts=24;
  addWire(16,5,16,6); addWire(16,6,4,6); addWire(4,6,4,20); addWire(18,5,18,6); addWire(18,6,30,6); addWire(30,6,30,20);
  addComp('float_no',8,9,0,'B1'); addComp('press_nc',13,9,0,'B2'); addComp('ol',18,9,0,'F1'); const k=addComp('coil',27,9,0,'K1'); k.vrate=24;
  addWire(4,9,6,9); addWire(10,9,11,9); addWire(15,9,16,9); addWire(20,9,25,9); addWire(29,9,30,9);
  addComp('k_no',8,12,0,'K1'); addWire(6,9,6,12); addWire(10,9,10,12);
  addComp('k_no',8,15,0,'K1'); const h1=addComp('lamp',27,15,0,'H1'); h1.vrate=24; h1.color='#43A047'; addWire(4,15,6,15); addWire(10,15,25,15); addWire(29,15,30,15);
  addComp('prox_pnp',12,16,0,'B3'); addWire(10,18,10,19); addWire(10,19,4,19); addWire(14,18,14,19); addWire(14,19,30,19);
  const h2=addComp('lamp',27,20,0,'H2'); h2.vrate=24; h2.color='#1E88E5'; addWire(12,18,12,20); addWire(12,20,25,20); addWire(29,20,30,20);
  setStatus(T('s_tank'));
}
function exampleATS(){
  addComp('L1',3,2); addComp('L2',5,2); addComp('L3',7,2); addComp('N',9,2);
  addComp('L1b',11,2); addComp('L2b',13,2); addComp('L3b',15,2); addComp('Nb',17,2);
  const a=addComp('ats',10,10,0,'Q1'); a.mode='auto'; a.delay=3; a.retDelay=5;
  [3,5,7,9,11,13,15,17].forEach(x=>addWire(x,2,x,5));
  addComp('motor3',9,20,0,'M1'); addWire(7,15,7,18); addWire(9,15,9,18); addWire(11,15,11,18);
  const h=addComp('lamp',18,20,0,'H1'); h.color='#43A047';
  addWire(13,15,13,20); addWire(13,20,16,20); addWire(20,20,20,24); addWire(20,24,5,24); addWire(5,24,5,17); addWire(5,17,7,17);
  setStatus(T('s_ats'));
}
document.getElementById('exampleSel').onchange=e=>{ const v=e.target.value; e.target.value=''; if(!v) return; if (ex.active) endExercise(); if(running) toggleRun(); pushHistory(); doc={comps:[],wires:[],nextId:1}; meter={a:null,b:null,clamp:null,clampI:0}; ({dol:exampleDOL,sd:exampleSD,vfd:exampleVFD,tank:exampleTank,ats:exampleATS})[v](); clearSel(); renderProps(); fitView(); };

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(()=>{});
applyLang(); resize(); setTool('select');
try{ const sv=localStorage.getItem('circuitsim.autosave'); if (sv){ const d=JSON.parse(sv); if (d.comps&&d.comps.length){ d.comps=d.comps.filter(c=>TYPES[c.type]).map(c=>({...defaults(c.type),...c,hidden:false,stuck:null})); d.wires=(d.wires||[]).map(w=>({w:2,color:'',bus:false,...w,hidden:false,cut:false})); doc=d; fitView(); setStatus(T('restored')); } } }catch(e){}
