/* ==========================================================================
   state.js — Document model and editor/simulation state, defaults, geometry helpers
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
// ---------- state ----------
let doc={comps:[],wires:[],nextId:1};
let tool='select',rotGhost=0,sel={comps:new Set(),wires:new Set()},marquee=null,mouse={x:0,y:0,gx:0,gy:0},wireStart=null,wireFlip=false,drag=null;
let view={x:40,y:40,z:1};
let running=false,lastT=0,simTime=0,sim=freshSim(),mains={tripped:false},sparks=[];
let meter={a:null,b:null,clamp:null,clampI:0,off:{x:10,y:8},box:null,cbox:null}, showNum=false, showCol=true;
let ex={active:false,fault:null,guessing:false,done:false};
let history=[],future=[],clipboard=null,linkFrom=null;
function freshSim(){ return {pot:new Map(),shorts:[],unstable:false,loadState:new Map(),r:null}; }
const key=(x,y)=>x+','+y;
const clearSel=()=>{ sel={comps:new Set(),wires:new Set()}; };
const selCount=()=>sel.comps.size+sel.wires.size;
const cloneWires=()=>doc.wires.map(w=>({...w}));
function nextLabel(prefix){ const used=new Set(doc.comps.map(c=>c.label)); let n=1; while(used.has(prefix+n)) n++; return prefix+n; }
function defaults(type){
  const t=TYPES[type];
  const d={preset:type==='ol3'?5:3,color:'#FFD23F',power:(t.kind==='load3'||t.kind==='load6')?2.2:(LOAD_W[type]||10),poles:4,loadPct:100,iset:5,rating:type==='mcb3'?16:type==='mccb3'||type==='mccb4'?100:2,vrate:230,volts:24,
    sub:type==='box'?'Battery / inverter':'',text:type==='note'?'Note':'',links:[],mode:'auto',pos:0,target:0,moveT:0,waitT:0,delay:3,retDelay:5,prog:'Q1 = I1 & !I2 | Q1 & !I2\nQ2 = T1\nT1 = TON(Q1, 3)',plcQ:[false,false,false,false,false,false,false,false],plcT:[],plcErr:'',bypass:false,
    pressed:false,on:isBrk(type)||type==='rcd2'||type==='rcd4',tripped:false,blown:false,burnt:false,elapsed:0,done:false,stress:0,heat:0,current:0,stuck:null,hidden:false,offT:0};
  if (type==='softstart') Object.assign(d,{power:2.2,volt:400,irated:5.5,ramp:3,rampDown:2,freq:0,target:0,running:false,powered:false,fault:null,phlT:0,oplT:0,rel:[false,false],resetPrev:false,xfn:['RUN','RESET','NONE','NONE','NONE'],rfn:['RUN','NONE'],level:0});
  if (type==='vfd') Object.assign(d,{power:2.2,volt:400,irated:5.5,fmax:50,setf:50,ms1:10,ms2:25,ms3:40,accel:3,decel:3,xfn:['FWD','REV','MS1','MS2','RESET'],rfn:['RUN','FAULT'],freq:0,target:0,running:false,powered:false,fault:null,phlT:0,oplT:0,rel:[false,false],resetPrev:false});
  return d;
}
function addComp(type,x,y,rot,label){ const t=TYPES[type]; const c={id:doc.nextId++,type,x,y,rot:rot||0,label:label||(t.src?t.src:t.prefix?nextLabel(t.prefix):''),...defaults(type)}; doc.comps.push(c); return c; }
let wireStyle={w:2,color:'',bus:false};
function addWire(ax,ay,bx,by,style){ if(ax===bx&&ay===by) return; const st=style||wireStyle; doc.wires.push({id:doc.nextId++,ax,ay,bx,by,cut:false,hidden:false,w:st.w||2,color:st.color||'',bus:!!st.bus}); }
function rotOff(dx,dy,rot){ let r=rot%4; while(r-->0){ const t=dx; dx=-dy; dy=t; } return [dx,dy]; }
function terminals(c){ return TYPES[c.type].terms.map(([dx,dy])=>{ const [x,y]=rotOff(dx,dy,c.rot); return {x:c.x+x,y:c.y+y}; }); }
function rectBox(c,x0,y0,x1,y1){ const pts=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([dx,dy])=>rotOff(dx,dy,c.rot)); const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]); const a=Math.min(...xs),b=Math.min(...ys); return {x:c.x+a,y:c.y+b,w:Math.max(...xs)-a,h:Math.max(...ys)-b}; }
function bbox(c){
  const t=TYPES[c.type];
  if (c.type==='dcps') return rectBox(c,-1.6,-1.2,1.6,2.2);
  if (t.kind==='source') return rectBox(c,-1,-2.2,1,0.2);
  if (t.kind==='sensor') return rectBox(c,-2.6,-1.6,2.6,2.2);
  if (t.kind==='vfd') return rectBox(c,-4.2,-5.2,4.2,5.2);
  if (c.type==='box') return rectBox(c,-3.2,-4,3.2,4);
  if (c.type==='ats') return rectBox(c,-8.2,-5.2,8.2,5.2);
  if (c.type==='note'){ const w=c.w||4,h=c.h||1.2; return {x:c.x-w/2,y:c.y-h/2,w,h}; }
  if (t.kind==='load6') return rectBox(c,-2.6,-2,2.6,2);
  if (c.type==='mccb4'||c.type==='rcd4') return rectBox(c,-3.6,-2,3.6,2.3);
  if (c.type==='rcd2') return rectBox(c,-2,-2,2,2.3);
  if (c.type==='softstart') return rectBox(c,-4.2,-5.2,4.2,5.2);
  if (c.type==='plc') return rectBox(c,-5.2,-9,5.2,5);
  if (c.type==='meterV'||c.type==='meterA') return rectBox(c,-2,-1.6,2,1.2);
  if (t.kind==='load3'||t.terms.length===6) return rectBox(c,-2.6,-2,2.6,2.3);
  return rectBox(c,-2,-1.6,2,0.8);
}
