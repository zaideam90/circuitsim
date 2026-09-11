/* ==========================================================================
   core.js — Globals: canvas, colour table, shared constants
   Loaded as a classic script; top-level declarations are shared across files.
   Load order: core → i18n → catalog → state → engine → render → editor → ui → examples
   ========================================================================== */
'use strict';
const G=20;
const cv=document.getElementById('cv'), stage=document.getElementById('stage'); let ctx=cv.getContext('2d');
const C={L1b:'#F08A84',L2b:'#D9B45A',L3b:'#A08BE0',Nb:'#7FA6DA',PE:'#2E7D32',PEy:'#FBC02D',paper:'#ECEEEA',ink:'#1E2A32',L1:'#D8322A',L2:'#B8860B',L3:'#5F3DC4',N:'#2A64B0',U:'#EF6C00',V:'#7CB342',W:'#00ACC1','DC+':'#D81B60','DC-':'#455A64',dead:'#8A9299',sel:'#E9A400',grid:'#C5CAC4',white:'#FFFFFF',burnt:'#3A3A3A',short:'#E9A400',ok:'#2E7D4F'};
const NC_TYPES=['pb_nc','k_nc','t_nc','ol','limit_nc','float_nc','press_nc','thermo_nc'];
const MANUAL_SW=['sw','limit_no','limit_nc','float_no','float_nc','press_no','press_nc','thermo_no','thermo_nc'];
