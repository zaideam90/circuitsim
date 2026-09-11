/* ==========================================================================
   catalog.js — Component catalogue: terminals, contact pairs, icons, IEC numbers, palette groups
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
// ---------- catalogue ----------
const T2=[[-2,0],[2,0]], T3=[[-2,-2],[0,-2],[2,-2],[-2,2],[0,2],[2,2]], P3=[[0,3],[1,4],[2,5]];
const VFD_T=[[-2,-5],[0,-5],[2,-5],[-2,5],[0,5],[2,5],[-4,-4],[-4,-3],[-4,-2],[-4,-1],[-4,0],[-4,2],[4,-4],[4,-3],[4,-2],[4,0],[4,1],[4,2]];
const VFD_NAMES=['R','S','T','U','V','W','X1','X2','X3','X4','X5','COM','RA','RB','RC','RA','RB','RC'];
const XFN=['NONE','FWD','REV','JOG','MS1','MS2','RESET','EXT_FAULT','COAST'], RFN=['NONE','RUN','AT_SPEED','FAULT','READY'];
const src=(n,en,ar)=>({en,ar,kind:'source',src:n,terms:[[0,0]],icon:'<circle cx="22" cy="10" r="6"/><path d="M22 16v6"/>'});
const ctc=(en,ar,prefix,icon,extra)=>({en,ar,kind:'contact',prefix,terms:T2,pairs:[[0,1]],icon,...(extra||{})});
const ld=(en,ar,prefix,icon)=>({en,ar,kind:'load',prefix,terms:T2,icon});
const NOI='<path d="M2 14h12M30 14h12M14 14l14-7"/>', NCI='<path d="M2 14h12M30 14h12M14 14h17M31 14v-8"/>';
const TYPES={
  L1b:src('L1b',"Generator L1'","مولدة L1'"),L2b:src('L2b',"Generator L2'","مولدة L2'"),L3b:src('L3b',"Generator L3'","مولدة L3'"),Nb:src('Nb',"Generator N'","مولدة N'"),
  L1:src('L1','Phase source L1','مصدر الطور L1'),L2:src('L2','Phase source L2','مصدر الطور L2'),L3:src('L3','Phase source L3','مصدر الطور L3'),N:src('N','Neutral N','المحايد N'),PE:{en:'Earth PE',ar:'الأرضي PE',kind:'source',src:'PE',terms:[[0,0]],icon:'<path d="M22 3v9M14 12h16M17 16h10M20 20h4"/>'},
  dcps:{en:'DC power supply',ar:'مصدر تيار مستمر',kind:'source',prefix:'G',terms:[[-1,2],[1,2]],icon:'<rect x="10" y="3" width="24" height="12"/><path d="M14 15v6M30 15v6M20 8h4M22 6v4M28 9h3"/>'},
  fuse:ctc('Fuse (single)','فيوز (أحادي)','F','<path d="M2 12h40"/><rect x="12" y="7" width="20" height="10"/>',{num:['1','2']}),
  pb_no:ctc('Start push button NO','ضاغط تشغيل NO','S','<path d="M2 14h12M30 14h12M14 14l14-7M21 10v-6M16 4h10"/>',{num:['13','14']}),
  pb_nc:ctc('Stop push button NC','ضاغط إيقاف NC','S','<path d="M2 14h12M30 14h12M14 14h17M31 14v-8M22 14v-6M17 8h10"/>',{num:['21','22']}),
  sw:ctc('Toggle switch','مفتاح تثبيت','Q','<path d="M2 14h12M30 14h12M14 14l14-7"/><circle cx="14" cy="14" r="2"/>',{num:['13','14']}),
  k_no:ctc('Auxiliary contact NO','تلامس مساعد NO','K',NOI,{num:['13','14']}),
  k_nc:ctc('Auxiliary contact NC','تلامس مساعد NC','K',NCI,{num:['21','22']}),
  t_no:ctc('Timer contact NO','تلامس مؤقت NO','T',NOI+'<path d="M19 7a5 5 0 0 1 8 0"/>',{num:['17','18']}),
  t_nc:ctc('Timer contact NC','تلامس مؤقت NC','T',NCI+'<path d="M18 5a5 5 0 0 1 8 0"/>',{num:['15','16']}),
  ol:ctc('OL auxiliary contact NC','تلامس OL مساعد NC','F',NCI+'<path d="M18 8h8v-5h-8z"/>',{num:['95','96']}),
  limit_no:ctc('Limit switch NO','مفتاح حدي NO','B',NOI+'<path d="M8 20l6-6"/><path d="M4 20h6" />',{num:['13','14']}),
  limit_nc:ctc('Limit switch NC','مفتاح حدي NC','B',NCI+'<path d="M8 20l6-6M4 20h6"/>',{num:['21','22']}),
  float_no:ctc('Float switch NO','عوامة NO','B',NOI+'<circle cx="21" cy="4" r="3"/>',{num:['13','14']}),
  float_nc:ctc('Float switch NC','عوامة NC','B',NCI+'<circle cx="21" cy="3" r="3"/>',{num:['21','22']}),
  press_no:ctc('Pressure switch NO','مفتاح ضغط NO','B',NOI+'<path d="M17 4h8M21 4v4"/>',{num:['13','14']}),
  press_nc:ctc('Pressure switch NC','مفتاح ضغط NC','B',NCI+'<path d="M17 2h8M21 2v4"/>',{num:['21','22']}),
  thermo_no:ctc('Thermostat NO','ثرموستات NO','B',NOI+'<path d="M19 3h4l-4 3h4"/>',{num:['13','14']}),
  thermo_nc:ctc('Thermostat NC','ثرموستات NC','B',NCI+'<path d="M19 1h4l-4 3h4"/>',{num:['21','22']}),
  prox_npn:{en:'Proximity sensor NPN',ar:'حساس تقارب NPN',kind:'sensor',prefix:'B',terms:[[-2,2],[0,2],[2,2]],pairs:[[1,2]],icon:'<rect x="10" y="3" width="24" height="12"/><path d="M14 15v6M22 15v6M30 15v6M16 9h4M27 9h4"/>',num:['+','OUT','−']},
  prox_pnp:{en:'Proximity sensor PNP',ar:'حساس تقارب PNP',kind:'sensor',prefix:'B',terms:[[-2,2],[0,2],[2,2]],pairs:[[0,1]],icon:'<rect x="10" y="3" width="24" height="12"/><path d="M14 15v6M22 15v6M30 15v6M16 9h4M27 9h4"/>',num:['+','OUT','−']},
  mcb3:{en:'Circuit breaker (3-pole)',ar:'قاطع 3 أقطاب',kind:'contact',prefix:'Q',terms:T3,pairs:P3,icon:'<path d="M12 2v6l4 8M12 16v6M22 2v6l4 8M22 16v6M32 2v6l4 8M32 16v6"/><path d="M10 12h26" stroke-dasharray="3 2"/>',num:['1','3','5','2','4','6']},
  k3:{en:'Contactor main contacts (3-pole)',ar:'تلامسات قدرة K (3 أقطاب)',kind:'contact',prefix:'K',terms:T3,pairs:P3,icon:'<path d="M12 2v6l4 8M12 16v6M22 2v6l4 8M22 16v6M32 2v6l4 8M32 16v6"/><path d="M10 12h26" stroke-dasharray="3 2"/>',num:['1','3','5','2','4','6']},
  ol3:{en:'Overload relay OL (3-pole)',ar:'حماية حرارية OL (3 أقطاب)',kind:'contact',prefix:'F',terms:T3,pairs:P3,icon:'<path d="M12 2v20M22 2v20M32 2v20"/><rect x="9" y="8" width="6" height="8"/><rect x="19" y="8" width="6" height="8"/><rect x="29" y="8" width="6" height="8"/>',num:['1','3','5','2','4','6']},
  vfd:{en:'AC drive (VFD)',ar:'درايف AC (VFD)',kind:'vfd',prefix:'U',terms:VFD_T,pairs:[[12,14],[13,14],[15,17],[16,17]],icon:'<rect x="8" y="3" width="28" height="18"/><path d="M12 8h6M26 8h6M12 14c2-4 4-4 6 0s4 4 6 0"/>'},
  motor3:{en:'3-phase motor',ar:'محرك 3 فاز',kind:'load3',prefix:'M',terms:[[-2,-2],[0,-2],[2,-2]],icon:'<path d="M12 1v7M22 1v7M32 1v7"/><circle cx="22" cy="15" r="7.5"/><path d="M19 18v-6l3 4 3-4v6"/>',num:['U1','V1','W1']},
  motor6:{en:'3-phase motor, 6 terminals (star/delta)',ar:'محرك 3 فاز 6 أطراف (ستار/دلتا)',kind:'load6',prefix:'M',terms:[[-2,-2],[0,-2],[2,-2],[-2,2],[0,2],[2,2]],icon:'<path d="M12 1v5M22 1v5M32 1v5M12 18v5M22 18v5M32 18v5"/><circle cx="22" cy="12" r="6"/>',num:['U1','V1','W1','W2','U2','V2']},
  mccb3:{en:'MCCB (3-pole)',ar:'قاطع MCCB (3 أقطاب)',kind:'contact',prefix:'Q',terms:T3,pairs:P3,icon:'<rect x="8" y="4" width="28" height="16"/><path d="M12 1v3M22 1v3M32 1v3M12 20v3M22 20v3M32 20v3M18 12h8"/>',num:['1','3','5','2','4','6']},
  mccb4:{en:'MCCB (4-pole)',ar:'قاطع MCCB (4 أقطاب)',kind:'contact',prefix:'Q',terms:[[-3,-2],[-1,-2],[1,-2],[3,-2],[-3,2],[-1,2],[1,2],[3,2]],pairs:[[0,4],[1,5],[2,6],[3,7]],icon:'<rect x="6" y="4" width="32" height="16"/><path d="M10 1v3M18 1v3M26 1v3M34 1v3M10 20v3M18 20v3M26 20v3M34 20v3M18 12h8"/>',num:['1','3','5','N','2','4','6','N']},
  rcd2:{en:'RCD 30 mA (2-pole)',ar:'قاطع تسرب أرضي RCD (2 قطب)',kind:'contact',prefix:'F',terms:[[-1,-2],[1,-2],[-1,2],[1,2]],pairs:[[0,2],[1,3]],icon:'<rect x="8" y="4" width="28" height="16"/><path d="M16 1v3M28 1v3M16 20v3M28 20v3"/><circle cx="22" cy="12" r="4"/>',num:['1','N','2','N']},
  rcd4:{en:'RCD 30 mA (4-pole)',ar:'قاطع تسرب أرضي RCD (4 أقطاب)',kind:'contact',prefix:'F',terms:[[-3,-2],[-1,-2],[1,-2],[3,-2],[-3,2],[-1,2],[1,2],[3,2]],pairs:[[0,4],[1,5],[2,6],[3,7]],icon:'<rect x="6" y="4" width="32" height="16"/><path d="M10 1v3M18 1v3M26 1v3M34 1v3M10 20v3M18 20v3M26 20v3M34 20v3"/><circle cx="22" cy="12" r="4"/>',num:['1','3','5','N','2','4','6','N']},
  softstart:{en:'Soft starter',ar:'سوفت ستارتر',kind:'vfd',prefix:'U',terms:[[-2,-5],[0,-5],[2,-5],[-2,5],[0,5],[2,5],[-4,-2],[-4,0],[-4,2],[4,-2],[4,0]],pairs:[[9,10]],icon:'<rect x="8" y="3" width="28" height="18"/><path d="M12 17c6 0 10-10 20-10"/>'},
  meterV:{en:'Panel voltmeter',ar:'فولتميتر لوحة',kind:'meter',prefix:'P',terms:T2,icon:'<circle cx="22" cy="11" r="8"/><path d="M2 11h12M30 11h12M19 8l3 6 3-6"/>',num:['','']},
  meterA:{en:'Panel ammeter (in series)',ar:'أمبيرميتر لوحة (على التوالي)',kind:'contact',prefix:'P',terms:T2,pairs:[[0,1]],icon:'<circle cx="22" cy="11" r="8"/><path d="M2 11h12M30 11h12M19 14l3-6 3 6M20 12h4"/>',num:['','']},
  plc:{en:'PLC block (8 in / 8 relay out)',ar:'بلوك PLC (8 مداخل / 8 مخارج رلي)',kind:'plc',prefix:'A',terms:[[-5,-6],[-5,-5],[-5,-4],[-5,-3],[-5,-2],[-5,-1],[-5,0],[-5,1],[-5,3],[5,-8],[5,-6],[5,-5],[5,-4],[5,-3],[5,-2],[5,-1],[5,0],[5,1]],pairs:[[9,10],[9,11],[9,12],[9,13],[9,14],[9,15],[9,16],[9,17]],icon:'<rect x="8" y="2" width="28" height="20"/><path d="M2 7h6M2 12h6M2 17h6M36 7h6M36 12h6M36 17h6M14 8h6M24 8h6M14 16h6M24 16h6"/>'},
  ats:{en:'Motorised changeover (ATS, 4-pole)',ar:'مبدّل آلي ATS (4 أقطاب)',kind:'contact',prefix:'Q',terms:[[-7,-5],[-5,-5],[-3,-5],[-1,-5],[1,-5],[3,-5],[5,-5],[7,-5],[-3,5],[-1,5],[1,5],[3,5],[-8,-2],[-8,0],[-8,2],[8,-3],[8,-2],[8,1],[8,2]],pairs:[[0,8],[1,9],[2,10],[3,11],[4,8],[5,9],[6,10],[7,11],[15,16],[17,18]],icon:'<path d="M6 3v6M14 3v6M30 3v6M38 3v6M22 21v-6M22 15l-8-6M10 12h6M28 12h6"/>',num:['','','','','','','','','','','','','I','II','COM','','','','']},
  box:{en:'Custom block (4 in / 4 out)',ar:'صندوق مخصص (4 دخول / 4 خروج)',kind:'contact',prefix:'X',terms:[[-3,-3],[-3,-1],[-3,1],[-3,3],[3,-3],[3,-1],[3,1],[3,3]],pairs:[[0,4],[1,5],[2,6],[3,7]],icon:'<rect x="12" y="2" width="20" height="20"/><path d="M4 6h8M4 11h8M4 16h8M32 6h8M32 11h8M32 16h8"/>',num:['1','2','3','4','1','2','3','4']},
  note:{en:'Text note',ar:'ملاحظة نصية',kind:'note',prefix:'',terms:[],icon:'<path d="M6 5h32M6 11h24M6 17h30"/>'},
  coil:ld('Contactor coil','ملف كونتاكتور','K','<path d="M2 11h10M32 11h10"/><rect x="12" y="4" width="20" height="14"/>'),
  timer:ld('On-delay timer','مؤقت تأخير تشغيل','T','<path d="M2 11h10M32 11h10"/><rect x="12" y="4" width="20" height="14"/><path d="M18 7h8l-8 8h8"/>'),
  timer_off:ld('Off-delay timer','مؤقت تأخير إطفاء','T','<path d="M2 11h10M32 11h10"/><rect x="12" y="4" width="20" height="14"/><path d="M18 15h8l-8-8h8"/>'),
  lamp:ld('Indicator lamp','مصباح إشارة','H','<path d="M2 11h13M29 11h13"/><circle cx="22" cy="11" r="7"/><path d="M17 6l10 10M27 6l-10 10"/>'),
  motor1:ld('Single-phase motor','محرك أحادي الطور','M','<path d="M2 11h12M32 11h10"/><circle cx="22" cy="11" r="9"/><path d="M18 15v-8l4 5 4-5v8"/>'),
  buzzer:ld('Buzzer','جرس / صفارة','P','<path d="M2 11h13M29 11h13"/><path d="M15 15a7 7 0 0 1 14 0z"/>'),
  heater:ld('Heater','سخّان','E','<path d="M2 11h10M32 11h10"/><rect x="12" y="5" width="20" height="12"/><path d="M14 11l3-4 3 8 3-8 3 8 3-8 3 4"/>'),
};
TYPES.coil.num=['A1','A2']; TYPES.timer.num=['A1','A2']; TYPES.timer_off.num=['A1','A2']; TYPES.lamp.num=['X1','X2']; TYPES.buzzer.num=['X1','X2']; TYPES.heater.num=['1','2']; TYPES.motor1.num=['U1','U2']; TYPES.dcps.num=['+','−'];
const PALETTE=[['gSources',['L1','L2','L3','N','PE','dcps','L1b','L2b','L3b','Nb']],['gControl',['fuse','pb_no','pb_nc','sw','k_no','k_nc','t_no','t_nc','ol']],['gSensors',['limit_no','limit_nc','float_no','float_nc','press_no','press_nc','thermo_no','thermo_nc','prox_npn','prox_pnp']],['gPower',['mcb3','mccb3','mccb4','k3','ol3','rcd2','rcd4','ats','vfd','softstart','motor3','motor6']],['gLoads',['coil','timer','timer_off','lamp','motor1','buzzer','heater']],['gMisc',['plc','meterV','meterA','box','note']]];
const LOAD_W={coil:10,timer:3,timer_off:3,lamp:5,motor1:750,buzzer:3,heater:2000};
const tname=t=>TYPES[t][lang]||TYPES[t].en;
