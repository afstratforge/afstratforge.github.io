const $=selector=>document.querySelector(selector);
const els={
  source:$('#sourceText'),preview:$('#previewText'),box:$('#fitBox'),paper:$('#paper'),
  shell:document.querySelector('.paper-shell'),count:$('#charCount'),
  estimate:$('#lineEstimate'),hint:$('#hint'),toast:$('#toast'),
  measurer:$('#measureBox'),search:$('#acronymSearch'),
  results:$('#acronymResults'),resultsMeta:$('#resultsMeta'),dodSearch:$('#dodAcronymSearch'),
  dodResults:$('#dodAcronymResults'),dodResultsMeta:$('#dodResultsMeta')
};

const FORM_WIDTH_MM=202.321;
const PAPER_WIDTH_PX=202.321*96/25.4;
const PAPER_HEIGHT_PX=192;
const PREVIEW_LINE_LIMIT=2;
const NARROW_SPACE='\u2006';
const WIDE_SPACE='\u2004';
const FIELD_WIDTH_PX=FORM_WIDTH_MM*96/25.4;
const RULES_KEY='tighttype-abbreviation-rules';
const DEFAULT_RULES=[{from:'and',to:'&'}];
let rules=DEFAULT_RULES.map(rule=>({...rule}));
try{const stored=JSON.parse(localStorage.getItem(RULES_KEY)||'null');if(Array.isArray(stored))rules=stored.filter(rule=>rule&&typeof rule.from==='string'&&typeof rule.to==='string')}catch{}
function escapeRegex(value){return value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}
function applyRules(value){let output=cleanText(value);[...rules].sort((a,b)=>b.from.length-a.from.length).forEach(rule=>{output=output.replace(new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(rule.from)}(?=$|[^A-Za-z0-9])`,'gi'),(_,before)=>before+rule.to)});return output}
function renderRules(){const list=$('#ruleList');list.replaceChildren();rules.forEach((rule,index)=>{const chip=document.createElement('div');chip.className='rule-chip';const text=document.createElement('span');text.textContent=`${rule.from} → ${rule.to}`;const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`Remove ${rule.from} rule`);remove.addEventListener('click',()=>confirmAction(remove,'Confirm',()=>{rules.splice(index,1);saveRules()}));chip.append(text,remove);list.append(chip)})}
function saveRules(){try{localStorage.setItem(RULES_KEY,JSON.stringify(rules))}catch{}renderRules();render();persistWorkspaceDraft()}
function makeId(){return globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function'?globalThis.crypto.randomUUID():`tt-${Date.now()}-${Math.random().toString(36).slice(2)}`}

const tabs=[...document.querySelectorAll('.tool-tab')];
function selectTab(tab){
  tabs.forEach(item=>{
    const selected=item===tab;
    item.classList.toggle('active',selected);
    item.setAttribute('aria-selected',selected);
    item.tabIndex=selected?0:-1;
    document.getElementById(item.getAttribute('aria-controls')).hidden=!selected;
  });
  if(tab.id==='tab-1206')requestAnimationFrame(syncPaperScale);
}
tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>selectTab(tab));
  tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
    selectTab(tabs[next]);tabs[next].focus();
  });
});

const ACRONYMS=[
  ['ABM','AIR BATTLE MANAGER'],['ACE','AGILE COMBAT EMPLOYMENT'],['AD','ACTIVE DUTY'],
  ['ADCON','ADMINISTRATIVE CONTROL'],['AFE','AIRCREW FLIGHT EQUIPMENT'],['AFFORGEN','AIR FORCE FORCE GENERATION'],
  ['AFI','AIR FORCE INSTRUCTION'],['AFMAN','AIR FORCE MANUAL'],['AFSC','AIR FORCE SPECIALTY CODE'],
  ['AFSO21','AIR FORCE SMART OPERATIONS FOR THE 21ST CENTURY'],['AGE','AEROSPACE GROUND EQUIPMENT'],
  ['AGR','ACTIVE GUARD RESERVE'],['AI','ARTIFICIAL INTELLIGENCE'],['ALQ','AIRMAN LEADERSHIP QUALITY'],
  ['ALS','AIRMAN LEADERSHIP SCHOOL'],['AOC','AIR OPERATIONS CENTER'],['AOR','AREA OF RESPONSIBILITY'],
  ['APF','APPROPRIATED FUNDS'],['ART','AIR RESERVE TECHNICIAN'],['AT','ANNUAL TOUR'],
  ['ATC','AIR TRAFFIC CONTROL'],['ATO','AIR TASKING ORDER'],['BMT','BASIC MILITARY TRAINING'],
  ['BNR','BY NAME REQUEST'],['BTZ','BELOW-THE-ZONE'],['C2','COMMAND AND CONTROL'],
  ['C4ISR','COMMAND, CONTROL, COMMUNICATIONS, COMPUTERS, INTELLIGENCE, SURVEILLANCE AND RECONNAISSANCE'],
  ['CAOC','COMBINED AIR OPERATIONS CENTER'],['CAS','CLOSE AIR SUPPORT'],['CAT','CRISIS ACTION TEAM'],
  ['CATM','COMBAT ARMS TRAINING AND MAINTENANCE'],['CBRN','CHEMICAL, BIOLOGICAL, RADIOLOGICAL, NUCLEAR'],
  ['CBT','COMPUTER BASED TRAINING'],['CCAF','COMMUNITY COLLEGE OF THE AIR FORCE'],
  ['CCIP',"COMMANDER'S INSPECTION PROGRAM"],['CDI','COMMANDER DIRECTED INVESTIGATION'],
  ['CFETP','CAREER FIELD EDUCATION AND TRAINING PLAN'],['CFM','CAREER FIELD MANAGER'],
  ['CLA','CHIEF MASTER SERGEANT LEADERSHIP ACADEMY'],['CLC','CHIEF MASTER SERGEANT LEADERSHIP COURSE'],
  ['COA','COURSE OF ACTION'],['CODEL','CONGRESSIONAL DELEGATION'],['CONOPS','CONCEPT OF OPERATIONS'],
  ['CONUS','CONTINENTAL UNITED STATES'],['COOP','CONTINUITY OF OPERATIONS'],
  ['CPI','CONTINUOUS PROCESS IMPROVEMENT'],['CPR','CARDIOPULMONARY RESUSCITATION'],
  ['CSAR','COMBAT SEARCH AND RESCUE'],['CUI','CONTROLLED UNCLASSIFIED INFORMATION'],
  ['DAFI','DEPARTMENT OF THE AIR FORCE INSTRUCTION'],['DAFMAN','DEPARTMENT OF THE AIR FORCE MANUAL'],
  ['DEOCS','DEFENSE EQUAL OPPORTUNITY CLIMATE SURVEY'],['DG','DISTINGUISHED GRADUATE'],
  ['DHA','DEFENSE HEALTH AGENCY'],['DSG','DRILL STATUS GUARDSMAN'],['DV','DISTINGUISHED VISITOR'],
  ['EKIA','ENEMY KILLED IN ACTION'],['EOC','EMERGENCY OPERATIONS CENTER'],
  ['EOD','EXPLOSIVE ORDNANCE DISPOSAL'],['EOY','END OF YEAR'],['EPB','ENLISTED PERFORMANCE BRIEF'],
  ['EW','ELECTRONIC WARFARE'],['FAM','FUNCTIONAL AREA MANAGER'],['FHP','FLYING HOUR PROGRAM'],
  ['FMC','FULLY MISSION CAPABLE'],['FOB','FORWARD OPERATING BASE'],['FOC','FULL OPERATIONAL CAPABILITY'],
  ['FOL','FORWARD OPERATING LOCATION'],['FPCON','FORCE PROTECTION CONDITIONS'],
  ['FTEC','FIRST TERM ENLISTED COURSE'],['FTU','FORMAL TRAINING UNIT'],['GPA','GRADE POINT AVERAGE'],
  ['GPS','GLOBAL POSITIONING SYSTEM'],['GSU','GEOGRAPHICALLY SEPARATED UNIT'],
  ['GTC','GOVERNMENT TRAVEL CARD'],['IDT','INACTIVE DUTY TRAINING'],
  ['IDE','INTERMEDIATE DEVELOPMENTAL EDUCATION'],['IED','IMPROVISED EXPLOSIVE DEVICE'],
  ['IMA','INDIVIDUAL MOBILIZATION AUGMENTEE'],['IOC','INITIAL OPERATIONAL CAPABILITY'],
  ['IP','INSTRUCTOR PILOT'],['ISR','INTELLIGENCE, SURVEILLANCE, AND RECONNAISSANCE'],
  ['IT','INFORMATION TECHNOLOGY'],['JADC2','JOINT ALL DOMAIN COMMAND AND CONTROL'],
  ['JROTC','JUNIOR RESERVE OFFICER TRAINING CORPS'],['KIA','KILLED IN ACTION'],['LOE','LINE OF EFFORT'],
  ['MCA','MULTI-CAPABLE AIRMEN'],['MDS','MISSION DESIGN SERIES'],['MILCON','MILITARY CONSTRUCTION'],
  ['MILPDS','MILITARY PERSONNEL DATA SYSTEM'],['MOA','MEMORANDUM OF AGREEMENT'],
  ['MOU','MEMORANDUM OF UNDERSTANDING'],['MTF','MEDICAL TREATMENT FACILITY'],
  ['MWR','MORALE, WELFARE, AND RECREATION'],['MX','MAINTENANCE'],
  ['NC3','NUCLEAR COMMAND, CONTROL, AND COMMUNICATIONS'],['NCOA','NONCOMMISSIONED OFFICER ACADEMY'],
  ['NCR','NATIONAL CAPITAL REGION'],['NDAA','NATIONAL DEFENSE AUTHORIZATION ACT'],
  ['NDS','NATIONAL DEFENSE STRATEGY'],['NEO','NONCOMBATANT EVACUATION OPERATION'],
  ['NIPR','NON-SECURE INTERNET PROTOCOL ROUTER'],['NMC','NON MISSION CAPABLE'],
  ['O&M','OPERATIONS AND MAINTENANCE'],['OCO','OVERSEAS CONTINGENCY OPERATIONS'],
  ['OCONUS','OUTSIDE CONTINENTAL UNITED STATES'],['OJT','ON THE JOB TRAINING'],
  ['OPLAN','OPERATIONS PLAN'],['OPSEC','OPERATIONAL SECURITY'],['OTS','OFFICER TRAINING SCHOOL'],
  ['PCS','PERMANENT CHANGE OF STATION'],['PDE','PRIMARY DEVELOPMENTAL EDUCATION'],
  ['PFA','PHYSICAL FITNESS ASSESSMENT'],['PME','PROFESSIONAL MILITARY EDUCATION'],
  ['POC','POINT OF CONTACT'],['PT','PHYSICAL TRAINING'],['QA','QUALITY ASSURANCE'],
  ['QoL','QUALITY OF LIFE'],['ROE','RULES OF ENGAGEMENT'],['ROTC','RESERVE OFFICER TRAINING CORPS'],
  ['RPA','REMOTELY PILOTED AIRCRAFT'],['SAPR','SEXUAL ASSAULT PREVENTION AND RESPONSE'],
  ['SCIF','SENSITIVE COMPARTMENTED INFORMATION FACILITY'],['SDE','SENIOR DEVELOPMENTAL EDUCATION'],
  ['SERE','SURVIVAL, EVASION, RESISTANCE, ESCAPE'],['SIPR','SECRET INTERNET PROTOCOL ROUTER'],
  ['SME','SUBJECT MATTER EXPERT'],['SNCOA','SENIOR NONCOMMISSIONED OFFICER ACADEMY'],
  ['SOF','SPECIAL OPERATIONS FORCES'],['SOP','STANDARD OPERATING PROCEDURE'],
  ['SOS','SQUADRON OFFICER SCHOOL'],['STEM','SCIENCE, TECHNOLOGY, ENGINEERING, AND MATHEMATICS'],
  ['TACP','TACTICAL AIR CONTROL PARTY'],['TCCC','TACTICAL COMBAT CASUALTY CARE'],
  ['TDY','TEMPORARY DUTY'],['TFI','TOTAL FORCE INTEGRATION'],['TR','TRADITIONAL RESERVIST'],
  ['TS','TOP SECRET'],['TTP','TACTICS, TECHNIQUES, AND PROCEDURES'],['UCI','UNIT COMPLIANCE INSPECTION'],
  ['UCMJ','UNIFORM CODE OF MILITARY JUSTICE'],['UEI','UNIT EFFECTIVENESS INSPECTION'],
  ['UTA','UNIT TRAINING ASSEMBLY'],['UTC','UNIT TYPE CODE'],['UXO','UNEXPLODED ORDNANCE'],
  ['WRM','WAR RESERVE MATERIEL'],['XAB','EXPEDITIONARY AIRBASE']
];

let DOD_ACRONYMS=[
  ['A2/AD','ANTI-ACCESS/AREA DENIAL'],['AA','ASSEMBLY AREA'],['AAR','AFTER ACTION REVIEW'],['ABCT','ARMORED BRIGADE COMBAT TEAM'],
  ['AC','ACTIVE COMPONENT'],['ACA','AIRSPACE CONTROL AUTHORITY'],['ACC','AIR COMPONENT COMMANDER'],['ACE','ALLIED COMMAND EUROPE'],
  ['ACO','AIRSPACE CONTROL ORDER'],['ACP','AIRSPACE CONTROL PLAN'],['ADCON','ADMINISTRATIVE CONTROL'],['ADP','AUTOMATED DATA PROCESSING'],
  ['AFCENT','UNITED STATES AIR FORCES CENTRAL'],['AFRICOM','UNITED STATES AFRICA COMMAND'],['AHA','AMMUNITION HOLDING AREA'],['AO','AREA OF OPERATIONS'],
  ['AOR','AREA OF RESPONSIBILITY'],['APOD','AERIAL PORT OF DEBARKATION'],['APOE','AERIAL PORT OF EMBARKATION'],['ASCOPE','AREAS, STRUCTURES, CAPABILITIES, ORGANIZATIONS, PEOPLE, AND EVENTS'],
  ['ASW','ANTISUBMARINE WARFARE'],['AT/FP','ANTITERRORISM/FORCE PROTECTION'],['ATO','AIR TASKING ORDER'],['BDA','BATTLE DAMAGE ASSESSMENT'],
  ['BCT','BRIGADE COMBAT TEAM'],['BLOS','BEYOND LINE OF SIGHT'],['C2','COMMAND AND CONTROL'],['C2ISR','COMMAND AND CONTROL, INTELLIGENCE, SURVEILLANCE, AND RECONNAISSANCE'],
  ['C4ISR','COMMAND, CONTROL, COMMUNICATIONS, COMPUTERS, INTELLIGENCE, SURVEILLANCE, AND RECONNAISSANCE'],['CA','CIVIL AFFAIRS'],['CAOC','COMBINED AIR OPERATIONS CENTER'],['CAP','CRISIS ACTION PLANNING'],
  ['CAS','CLOSE AIR SUPPORT'],['CASEVAC','CASUALTY EVACUATION'],['CCDR','COMBATANT COMMANDER'],['CCIR','COMMANDER’S CRITICAL INFORMATION REQUIREMENT'],
  ['CENTCOM','UNITED STATES CENTRAL COMMAND'],['CFLCC','COALITION FORCES LAND COMPONENT COMMANDER'],['CINC','COMMANDER IN CHIEF'],['CJCS','CHAIRMAN OF THE JOINT CHIEFS OF STAFF'],
  ['CJTF','COMMANDER, JOINT TASK FORCE'],['COA','COURSE OF ACTION'],['COCOM','COMBATANT COMMAND'],['COG','CENTER OF GRAVITY'],
  ['COMSEC','COMMUNICATIONS SECURITY'],['CONOPS','CONCEPT OF OPERATIONS'],['CONPLAN','CONCEPT PLAN'],['CONUS','CONTINENTAL UNITED STATES'],
  ['COP','COMMON OPERATIONAL PICTURE'],['COOP','CONTINUITY OF OPERATIONS'],['COTS','COMMERCIAL OFF-THE-SHELF'],['CP','COMMAND POST'],
  ['CRAF','CIVIL RESERVE AIR FLEET'],['CSAR','COMBAT SEARCH AND RESCUE'],['CT','COUNTERTERRORISM'],['CUI','CONTROLLED UNCLASSIFIED INFORMATION'],
  ['DCA','DEFENSIVE COUNTERAIR'],['DCIP','DEFENSE CRITICAL INFRASTRUCTURE PROGRAM'],['DCO','DEFENSIVE CYBERSPACE OPERATIONS'],['DCSA','DEFENSE COUNTERINTELLIGENCE AND SECURITY AGENCY'],
  ['DHA','DEFENSE HEALTH AGENCY'],['DHS','DEPARTMENT OF HOMELAND SECURITY'],['DIA','DEFENSE INTELLIGENCE AGENCY'],['DISA','DEFENSE INFORMATION SYSTEMS AGENCY'],
  ['DLA','DEFENSE LOGISTICS AGENCY'],['DOD','DEPARTMENT OF DEFENSE'],['DODD','DEPARTMENT OF DEFENSE DIRECTIVE'],['DODI','DEPARTMENT OF DEFENSE INSTRUCTION'],
  ['DOS','DEPARTMENT OF STATE'],['DSCA','DEFENSE SECURITY COOPERATION AGENCY'],['DSCA','DEFENSE SUPPORT OF CIVIL AUTHORITIES'],['DTG','DATE-TIME GROUP'],
  ['EA','ELECTRONIC ATTACK'],['EEFI','ESSENTIAL ELEMENT OF FRIENDLY INFORMATION'],['EMCON','EMISSION CONTROL'],['EMS','ELECTROMAGNETIC SPECTRUM'],
  ['EOD','EXPLOSIVE ORDNANCE DISPOSAL'],['EUCOM','UNITED STATES EUROPEAN COMMAND'],['EW','ELECTRONIC WARFARE'],['EXORD','EXECUTE ORDER'],
  ['FDO','FLEXIBLE DETERRENT OPTION'],['FEBA','FORWARD EDGE OF THE BATTLE AREA'],['FEMA','FEDERAL EMERGENCY MANAGEMENT AGENCY'],['FHA','FOREIGN HUMANITARIAN ASSISTANCE'],
  ['FID','FOREIGN INTERNAL DEFENSE'],['FISINT','FOREIGN INSTRUMENTATION SIGNALS INTELLIGENCE'],['FLOT','FORWARD LINE OF OWN TROOPS'],['FOB','FORWARD OPERATING BASE'],
  ['FOC','FULL OPERATIONAL CAPABILITY'],['FOL','FORWARD OPERATING LOCATION'],['FON','FREEDOM OF NAVIGATION'],['FP','FORCE PROTECTION'],
  ['FPCON','FORCE PROTECTION CONDITION'],['FRAGO','FRAGMENTARY ORDER'],['GCC','GEOGRAPHIC COMBATANT COMMANDER'],['GEOINT','GEOSPATIAL INTELLIGENCE'],
  ['GFM','GLOBAL FORCE MANAGEMENT'],['GLOC','GROUND LINE OF COMMUNICATIONS'],['HADR','HUMANITARIAN ASSISTANCE AND DISASTER RELIEF'],['HARM','HIGH-SPEED ANTIRADIATION MISSILE'],
  ['HCA','HUMANITARIAN AND CIVIC ASSISTANCE'],['HUMINT','HUMAN INTELLIGENCE'],['HVT','HIGH-VALUE TARGET'],['IA','INFORMATION ASSURANCE'],
  ['IAMD','INTEGRATED AIR AND MISSILE DEFENSE'],['IC','INTELLIGENCE COMMUNITY'],['IED','IMPROVISED EXPLOSIVE DEVICE'],['IFF','IDENTIFICATION, FRIEND OR FOE'],
  ['IGO','INTERGOVERNMENTAL ORGANIZATION'],['IMINT','IMAGERY INTELLIGENCE'],['INDOPACOM','UNITED STATES INDO-PACIFIC COMMAND'],['IO','INFORMATION OPERATIONS'],
  ['IOC','INITIAL OPERATIONAL CAPABILITY'],['IPB','INTELLIGENCE PREPARATION OF THE BATTLESPACE'],['IR','INFORMATION REQUIREMENT'],['ISR','INTELLIGENCE, SURVEILLANCE, AND RECONNAISSANCE'],
  ['J-1','MANPOWER AND PERSONNEL DIRECTORATE OF A JOINT STAFF'],['J-2','INTELLIGENCE DIRECTORATE OF A JOINT STAFF'],['J-3','OPERATIONS DIRECTORATE OF A JOINT STAFF'],['J-4','LOGISTICS DIRECTORATE OF A JOINT STAFF'],
  ['J-5','PLANS DIRECTORATE OF A JOINT STAFF'],['J-6','COMMUNICATIONS SYSTEM DIRECTORATE OF A JOINT STAFF'],['J-7','TRAINING DIRECTORATE OF A JOINT STAFF'],['J-8','FORCE STRUCTURE, RESOURCE, AND ASSESSMENT DIRECTORATE OF A JOINT STAFF'],
  ['JADC2','JOINT ALL-DOMAIN COMMAND AND CONTROL'],['JAOC','JOINT AIR OPERATIONS CENTER'],['JFACC','JOINT FORCE AIR COMPONENT COMMANDER'],['JFC','JOINT FORCE COMMANDER'],
  ['JFLCC','JOINT FORCE LAND COMPONENT COMMANDER'],['JFMCC','JOINT FORCE MARITIME COMPONENT COMMANDER'],['JFSOCC','JOINT FORCE SPECIAL OPERATIONS COMPONENT COMMANDER'],['JIPOE','JOINT INTELLIGENCE PREPARATION OF THE OPERATIONAL ENVIRONMENT'],
  ['JLOTS','JOINT LOGISTICS OVER-THE-SHORE'],['JOA','JOINT OPERATIONS AREA'],['JP','JOINT PUBLICATION'],['JPP','JOINT PLANNING PROCESS'],
  ['JRSOI','JOINT RECEPTION, STAGING, ONWARD MOVEMENT, AND INTEGRATION'],['JTF','JOINT TASK FORCE'],['LNO','LIAISON OFFICER'],['LOC','LINE OF COMMUNICATIONS'],
  ['LOGCAP','LOGISTICS CIVIL AUGMENTATION PROGRAM'],['LOS','LINE OF SIGHT'],['LZ','LANDING ZONE'],['MARFOR','MARINE CORPS FORCES'],
  ['MCOO','MODIFIED COMBINED OBSTACLE OVERLAY'],['MDCOA','MOST DANGEROUS COURSE OF ACTION'],['MEDEVAC','MEDICAL EVACUATION'],['METL','MISSION-ESSENTIAL TASK LIST'],
  ['METT-TC','MISSION, ENEMY, TERRAIN AND WEATHER, TROOPS AND SUPPORT AVAILABLE, TIME AVAILABLE, AND CIVIL CONSIDERATIONS'],['MISO','MILITARY INFORMATION SUPPORT OPERATIONS'],['MOA','MEMORANDUM OF AGREEMENT'],['MOU','MEMORANDUM OF UNDERSTANDING'],
  ['MPA','MAJOR PERFORMANCE AREA'],['MPE','MISSION PARTNER ENVIRONMENT'],['NATO','NORTH ATLANTIC TREATY ORGANIZATION'],['NCO','NONCOMMISSIONED OFFICER'],
  ['NEO','NONCOMBATANT EVACUATION OPERATION'],['NGO','NONGOVERNMENTAL ORGANIZATION'],['NIPRNET','NON-CLASSIFIED INTERNET PROTOCOL ROUTER NETWORK'],['NORTHCOM','UNITED STATES NORTHERN COMMAND'],
  ['NSA','NATIONAL SECURITY AGENCY'],['NSC','NATIONAL SECURITY COUNCIL'],['OCONUS','OUTSIDE THE CONTINENTAL UNITED STATES'],['OCO','OFFENSIVE CYBERSPACE OPERATIONS'],
  ['OGA','OTHER GOVERNMENT AGENCY'],['OPCON','OPERATIONAL CONTROL'],['OPLAN','OPERATION PLAN'],['OPORD','OPERATION ORDER'],
  ['OPSEC','OPERATIONS SECURITY'],['OSINT','OPEN-SOURCE INTELLIGENCE'],['PIR','PRIORITY INTELLIGENCE REQUIREMENT'],['PNT','POSITIONING, NAVIGATION, AND TIMING'],
  ['POA&M','PLAN OF ACTION AND MILESTONES'],['POC','POINT OF CONTACT'],['PR','PERSONNEL RECOVERY'],['PSYOP','PSYCHOLOGICAL OPERATIONS'],
  ['QRF','QUICK REACTION FORCE'],['RFI','REQUEST FOR INFORMATION'],['ROE','RULES OF ENGAGEMENT'],['RSOI','RECEPTION, STAGING, ONWARD MOVEMENT, AND INTEGRATION'],
  ['SA','SITUATIONAL AWARENESS'],['SACEUR','SUPREME ALLIED COMMANDER EUROPE'],['SAR','SEARCH AND RESCUE'],['SC','SECURITY COOPERATION'],
  ['SCIF','SENSITIVE COMPARTMENTED INFORMATION FACILITY'],['SEAD','SUPPRESSION OF ENEMY AIR DEFENSES'],['SIGINT','SIGNALS INTELLIGENCE'],['SIPRNET','SECRET INTERNET PROTOCOL ROUTER NETWORK'],
  ['SOF','SPECIAL OPERATIONS FORCES'],['SOFA','STATUS-OF-FORCES AGREEMENT'],['SOUTHCOM','UNITED STATES SOUTHERN COMMAND'],['SPACECOM','UNITED STATES SPACE COMMAND'],
  ['SPOD','SEAPORT OF DEBARKATION'],['SPOE','SEAPORT OF EMBARKATION'],['STRATCOM','UNITED STATES STRATEGIC COMMAND'],['TACON','TACTICAL CONTROL'],
  ['TACSAT','TACTICAL SATELLITE'],['TBI','TRAUMATIC BRAIN INJURY'],['TTP','TACTICS, TECHNIQUES, AND PROCEDURES'],['TRANSCOM','UNITED STATES TRANSPORTATION COMMAND'],
  ['UAS','UNMANNED AIRCRAFT SYSTEM'],['UCMJ','UNIFORM CODE OF MILITARY JUSTICE'],['USG','UNITED STATES GOVERNMENT'],['UXO','UNEXPLODED ORDNANCE'],
  ['WARNORD','WARNING ORDER'],['WMD','WEAPON OF MASS DESTRUCTION'],['WPS','WEAPONEERING SYSTEM'],['XO','EXECUTIVE OFFICER']
];

let currentOutput='';

function syncPaperScale(){
  document.querySelectorAll('.paper-shell').forEach(shell=>{
    const paper=shell.querySelector('.paper');
    const scale=Math.min(1,Math.max(.1,shell.clientWidth/PAPER_WIDTH_PX));
    paper.style.setProperty('--paper-scale',scale);
    shell.style.height=`${Math.ceil(PAPER_HEIGHT_PX*scale)}px`;
  });
}

function cleanText(value){return value.replace(/\r\n?/g,'\n').replace(/[ \t]+/g,' ').split('\n').map(line=>line.trim()).join('\n').trim()}

// Copy the rendered line breaks as well as the user's explicit newlines.
function copyTextWithLineBreaks(text){
  if(!text)return '';
  els.measurer.textContent=text;
  const node=els.measurer.firstChild,range=document.createRange();
  const lineHeight=parseFloat(getComputedStyle(els.measurer).lineHeight)||19.2;
  let output='',offset=0,previousTop=null;
  for(const character of text){
    if(character==='\n'){output+='\n';previousTop=null}
    else{
      range.setStart(node,offset);range.setEnd(node,offset+character.length);
      const rect=range.getClientRects()[0];
      if(rect){
        if(previousTop!==null&&rect.top-previousTop>lineHeight/2)output+='\n';
        previousTop=rect.top;
      }
      output+=character;
    }
    offset+=character.length;
  }
  return output;
}

const widthCanvas=document.createElement('canvas');
const widthContext=widthCanvas.getContext('2d');
widthContext.font='12pt "Times New Roman"';
function lineWidth(text){return widthContext.measureText(text).width}
function spacingOrder(text){
  const chars=[...text],eligible=[];
  for(let i=0;i<chars.length;i++){
    if(chars[i]!==' ')continue;
    if(i===1&&'–—-'.includes(chars[0]))continue;
    eligible.push(i);
  }
  if(eligible.length<3)return eligible;
  const ordered=[],used=new Set(),step=Math.max(1,Math.floor(eligible.length*.618));
  let cursor=Math.floor(eligible.length/2);
  while(ordered.length<eligible.length){
    while(used.has(cursor))cursor=(cursor+1)%eligible.length;
    used.add(cursor);ordered.push(eligible[cursor]);cursor=(cursor+step)%eligible.length;
  }
  return ordered;
}

function spaceVersion(text,order,count,space){const chars=[...text];for(let i=0;i<count;i++)chars[order[i]]=space;return chars.join('')}
function optimizeLine(text){
  const order=spacingOrder(text),width=lineWidth(text);
  if(width>FIELD_WIDTH_PX){
    const compressed=spaceVersion(text,order,order.length,NARROW_SPACE);
    if(lineWidth(compressed)>FIELD_WIDTH_PX)return {text:compressed,fits:false,narrow:order.length,wide:0};
    let low=1,high=order.length;
    while(low<high){const mid=Math.floor((low+high)/2);if(lineWidth(spaceVersion(text,order,mid,NARROW_SPACE))<=FIELD_WIDTH_PX)high=mid;else low=mid+1}
    return {text:spaceVersion(text,order,low,NARROW_SPACE),fits:true,narrow:low,wide:0};
  }
  if(!order.length)return {text,fits:true,narrow:0,wide:0};
  const expanded=spaceVersion(text,order,order.length,WIDE_SPACE);
  if(lineWidth(expanded)<=FIELD_WIDTH_PX)return {text:expanded,fits:true,narrow:0,wide:order.length};
  let low=0,high=order.length;
  while(low<high){const mid=Math.ceil((low+high)/2);if(lineWidth(spaceVersion(text,order,mid,WIDE_SPACE))<=FIELD_WIDTH_PX)low=mid;else high=mid-1}
  return {text:spaceVersion(text,order,low,WIDE_SPACE),fits:true,narrow:0,wide:low};
}
function optimizeSpaces(text){
  const rows=text?text.split('\n'):[],optimized=rows.map(optimizeLine),fits=optimized.every(row=>row.fits);
  return {text:optimized.map(row=>row.text).join('\n'),result:{lines:rows.length,fits},narrow:optimized.reduce((sum,row)=>sum+row.narrow,0),wide:optimized.reduce((sum,row)=>sum+row.wide,0)};
}

function render(){
  const optimized=optimizeSpaces(applyRules(els.source.value));
  currentOutput=optimized.text;
  const result=optimized.result;
  els.preview.textContent=currentOutput;
  els.measurer.textContent=currentOutput||' ';
  const lineHeight=parseFloat(getComputedStyle(els.measurer).lineHeight)||19.2;
  const renderedLines=Math.max(0,Math.round(els.measurer.scrollHeight/lineHeight));
  els.count.textContent=`${cleanText(els.source.value).length} characters`;
  els.estimate.textContent=`${renderedLines} preview line${renderedLines===1?'':'s'}`;
  els.box.classList.toggle('over',renderedLines>PREVIEW_LINE_LIMIT);
  els.hint.textContent=renderedLines>PREVIEW_LINE_LIMIT
    ?`Red output exceeds ${PREVIEW_LINE_LIMIT} lines. Shorten the text.`
    :result.fits
      ?`Fits ${FORM_WIDTH_MM} mm · ${optimized.narrow} U+2006 narrowed · ${optimized.wide} U+2004 widened.`
      :`One line still exceeds ${FORM_WIDTH_MM} mm after every safe space was changed to U+2006.`;
}

function renderAcronymTable(entries,query,results,meta,emptyMessage,metaText,displayLimit=Infinity){
  const term=query.trim().toLowerCase();
  const matches=entries.filter(([short,definition])=>!term||short.toLowerCase().includes(term)||definition.toLowerCase().includes(term));
  results.replaceChildren();
  matches.slice(0,displayLimit).forEach(([short,definition])=>{
    const row=document.createElement('tr');
    const acronym=document.createElement('td');acronym.textContent=short;
    const meaning=document.createElement('td');meaning.textContent=definition;
    row.append(acronym,meaning);results.append(row);
  });
  if(!matches.length){
    const row=document.createElement('tr'),cell=document.createElement('td');
    cell.colSpan=2;cell.className='no-results';cell.textContent=emptyMessage;
    row.append(cell);results.append(row);
  }
  meta.textContent=metaText(matches.length,entries.length);
}
function renderAcronyms(query=''){renderAcronymTable(ACRONYMS,query,els.results,els.resultsMeta,'No approved acronyms match that search.',(shown,total)=>`AFPC update: 28 Oct 2024 · ${shown} of ${total} approved entries`)}
function renderDodAcronyms(query=''){renderAcronymTable(DOD_ACRONYMS,query,els.dodResults,els.dodResultsMeta,'No DoD acronyms match that search.',(shown,total)=>`${shown} matches in ${total} DoD Dictionary entries · showing ${Math.min(shown,250)}`,250)}
async function loadDodAcronyms(){
  try{
    const response=await fetch('./dod-acronyms.json?v=1.0.5');if(!response.ok)throw new Error('unavailable');
    const entries=await response.json();if(!Array.isArray(entries)||!entries.length)throw new Error('invalid');
    DOD_ACRONYMS=entries.filter(entry=>Array.isArray(entry)&&typeof entry[0]==='string'&&typeof entry[1]==='string');renderDodAcronyms(els.dodSearch.value);
  }catch{els.dodResultsMeta.textContent=`Offline reference subset · ${DOD_ACRONYMS.length} entries`}
}

// A collapsible reference drawer stays available in both work areas.
const drawer=$('#utilityDrawer');
function setDrawer(open){drawer.classList.toggle('collapsed',!open);document.body.classList.toggle('drawer-open',open);$('#drawerToggle').setAttribute('aria-expanded',String(open));$('#drawerToggle').setAttribute('aria-label',`${open?'Close':'Open'} tools and resize`);$('#drawerToggleLabel').textContent=`${open?'CLOSE':'OPEN'} TOOLS & RESIZE`;$('#drawerBody').inert=!open;requestAnimationFrame(syncPaperScale)}
const drawerToggle=$('#drawerToggle'),DRAWER_WIDTH_KEY='bullet-shitter-tools-width-v1';
let drawerDrag=null,suppressDrawerClick=false;
function resizeDrawer(width){
  const maximum=window.innerWidth,minimum=Math.min(320,maximum);
  const next=Math.max(minimum,Math.min(maximum,width));
  document.documentElement.style.setProperty('--drawer-width',`${next}px`);
  requestAnimationFrame(syncPaperScale);
  return next;
}
try{const savedWidth=Number(localStorage.getItem(DRAWER_WIDTH_KEY));if(savedWidth>0)resizeDrawer(savedWidth)}catch{}
drawerToggle.addEventListener('click',()=>{if(suppressDrawerClick){suppressDrawerClick=false;return}setDrawer(drawer.classList.contains('collapsed'))});
drawerToggle.addEventListener('pointerdown',event=>{
  if(event.button!==0)return;
  suppressDrawerClick=false;
  drawerDrag={x:event.clientX,width:drawer.getBoundingClientRect().width,collapsed:drawer.classList.contains('collapsed'),moved:false};
  drawerToggle.setPointerCapture(event.pointerId);
});
drawerToggle.addEventListener('pointermove',event=>{
  if(!drawerDrag)return;
  const delta=drawerDrag.x-event.clientX;
  if(!drawerDrag.moved&&Math.abs(delta)<5)return;
  drawerDrag.moved=true;document.body.classList.add('drawer-resizing');setDrawer(true);
  resizeDrawer(drawerDrag.collapsed?window.innerWidth-event.clientX+drawerToggle.offsetWidth/2:drawerDrag.width+delta);
});
function finishDrawerResize(event){
  if(!drawerDrag)return;
  suppressDrawerClick=drawerDrag.moved;
  if(drawerDrag.moved)try{localStorage.setItem(DRAWER_WIDTH_KEY,String(drawer.getBoundingClientRect().width))}catch{}
  drawerDrag=null;document.body.classList.remove('drawer-resizing');
  if(drawerToggle.hasPointerCapture(event.pointerId))drawerToggle.releasePointerCapture(event.pointerId);
}
drawerToggle.addEventListener('pointerup',finishDrawerResize);
drawerToggle.addEventListener('pointercancel',finishDrawerResize);
drawerToggle.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
  event.preventDefault();setDrawer(true);
  const width=resizeDrawer(drawer.getBoundingClientRect().width+(event.key==='ArrowLeft'?40:-40));
  try{localStorage.setItem(DRAWER_WIDTH_KEY,String(width))}catch{}
});
window.addEventListener('resize',()=>{if(document.documentElement.style.getPropertyValue('--drawer-width'))resizeDrawer(drawer.getBoundingClientRect().width)});
$('#drawerClose').addEventListener('click',()=>setDrawer(false));
const drawerTabs=[...document.querySelectorAll('.drawer-tab')];
function selectDrawerTab(tab){
  drawerTabs.forEach(item=>{const selected=item===tab;item.classList.toggle('active',selected);item.setAttribute('aria-selected',String(selected));document.getElementById(item.getAttribute('aria-controls')).hidden=!selected});
}
drawerTabs.forEach(tab=>tab.addEventListener('click',()=>selectDrawerTab(tab)));
let alqZoom=100;
function setAlqZoom(value){alqZoom=Math.max(100,Math.min(400,value));$('#alqPages').style.width=`${alqZoom}%`;$('#alqZoomLabel').textContent=`${alqZoom}%`;$('#alqZoomOut').disabled=alqZoom===100;$('#alqZoomIn').disabled=alqZoom===400}
$('#alqZoomIn').addEventListener('click',()=>setAlqZoom(alqZoom+25));$('#alqZoomOut').addEventListener('click',()=>setAlqZoom(alqZoom-25));$('#alqFit').addEventListener('click',()=>setAlqZoom(100));setAlqZoom(100);
setDrawer(true);

const APPEARANCE_KEY='bullet-shitter-appearance-v1';
const DEFAULT_APPEARANCE={background:'#101215',accent:'#58a6ff'};
let appearance={...DEFAULT_APPEARANCE};
function validColor(value){return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)}
function restoreAppearance(stored){
  if(!stored||typeof stored!=='object')return;
  if(validColor(stored.background))appearance.background=stored.background;
  if(validColor(stored.accent))appearance.accent=stored.accent;
}
try{restoreAppearance(JSON.parse(localStorage.getItem(APPEARANCE_KEY)||'{}'))}catch{}
function colorLuminance(hex){const channels=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*channels[0]+.7152*channels[1]+.0722*channels[2]}
function readableInk(hex){const luminance=colorLuminance(hex);return (luminance+.05)/.05>=1.05/(luminance+.05)?'#111111':'#f5f7fa'}
function applyAppearance(sync=true){
  const dark=readableInk(appearance.background)==='#f5f7fa';
  appearance.theme=dark?'dark':'light';document.body.dataset.theme=appearance.theme;
  const style=document.documentElement.style;
  style.setProperty('--sf-background',appearance.background);style.setProperty('--sf-accent',appearance.accent);
  style.setProperty('--sf-ink',readableInk(appearance.background));style.setProperty('--sf-accent-ink',readableInk(appearance.accent));
  style.setProperty('--sf-surface-mix',dark?'white':'black');
  document.documentElement.style.removeProperty('filter');
  $('#backgroundColor').value=appearance.background;$('#accentColor').value=appearance.accent;
  try{localStorage.setItem(APPEARANCE_KEY,JSON.stringify(appearance))}catch{}
  if(sync)schedulePreferenceSync();
}
$('#backgroundColor').addEventListener('input',event=>{appearance.background=event.target.value;applyAppearance()});
$('#accentColor').addEventListener('input',event=>{appearance.accent=event.target.value;applyAppearance()});
$('#resetSettings').addEventListener('click',()=>confirmAction($('#resetSettings'),'Confirm reset',()=>{appearance={...DEFAULT_APPEARANCE};applyAppearance();notify('Appearance reset')}));
applyAppearance(false);

const WORD_BANK={
  achieved:['reached a desired result successfully',['accomplished','attained','delivered','secured']],
  accelerated:['made a process happen sooner or move faster',['advanced','expedited','quickened','streamlined']],
  accomplished:['completed something successfully',['achieved','completed','delivered','executed']],
  advanced:['moved a mission, program, or capability forward',['accelerated','improved','progressed','strengthened']],
  built:['created or developed something useful',['created','developed','established','formed']],
  championed:['actively supported and drove an effort',['advocated','led','promoted','spearheaded']],
  coordinated:['organized people or activities to work together effectively',['aligned','integrated','organized','synchronized']],
  created:['brought something new into existence',['built','designed','developed','established']],
  delivered:['produced or provided a promised result',['achieved','completed','executed','provided']],
  designed:['planned the form, function, or structure of something',['created','developed','engineered','planned']],
  developed:['grew or created a capability over time',['built','created','cultivated','strengthened']],
  directed:['controlled or guided an operation or team',['guided','led','managed','oversaw']],
  eliminated:['completely removed a problem, delay, or waste',['eradicated','removed','resolved','stopped']],
  enabled:['made an action or result possible',['empowered','facilitated','supported','unlocked']],
  engineered:['designed or built a technical solution',['built','created','designed','developed']],
  established:['created something intended to last',['built','created','founded','instituted']],
  executed:['carried out a plan or task effectively',['accomplished','completed','delivered','performed']],
  expanded:['increased the size, scope, or reach of something',['broadened','extended','grew','scaled']],
  expedited:['made a process finish faster',['accelerated','quickened','streamlined','shortened']],
  generated:['produced a measurable output or result',['created','delivered','produced','yielded']],
  improved:['made something better in quality or performance',['advanced','enhanced','optimized','strengthened']],
  increased:['made an amount, rate, or capability larger',['boosted','expanded','grew','raised']],
  integrated:['combined parts into a coordinated whole',['aligned','combined','coordinated','unified']],
  led:['guided people or an effort toward a result',['championed','directed','guided','spearheaded']],
  managed:['controlled resources, work, or people responsibly',['administered','directed','oversaw','supervised']],
  modernized:['updated something using current methods or technology',['improved','refreshed','transformed','upgraded']],
  optimized:['made something as effective or efficient as practical',['enhanced','improved','refined','streamlined']],
  orchestrated:['coordinated a complex effort with many moving parts',['coordinated','directed','organized','synchronized']],
  pioneered:['introduced or developed something first',['created','innovated','launched','spearheaded']],
  prevented:['stopped a harmful event or condition from occurring',['averted','blocked','protected','stopped']],
  produced:['created a concrete output or measurable result',['created','delivered','generated','yielded']],
  reduced:['made an amount, cost, delay, or risk smaller',['cut','decreased','lowered','minimized']],
  resolved:['found and applied a solution to a problem',['corrected','eliminated','fixed','remedied']],
  restored:['returned a capability or condition to working order',['recovered','reestablished','repaired','revived']],
  secured:['obtained or protected something important',['achieved','acquired','protected','won']],
  spearheaded:['took the lead in starting and driving an effort',['championed','launched','led','pioneered']],
  streamlined:['removed unnecessary steps to improve speed or efficiency',['accelerated','optimized','simplified','tightened']],
  strengthened:['made a capability, team, or result more effective',['advanced','enhanced','improved','reinforced']],
  transformed:['changed something substantially for the better',['modernized','overhauled','restructured','revolutionized']],
  upgraded:['raised something to a newer or better standard',['enhanced','improved','modernized','strengthened']]
};
function wordBankFallback(term){
  const key=term.toLowerCase();
  if(WORD_BANK[key])return {word:key,definition:WORD_BANK[key][0],synonyms:WORD_BANK[key][1]};
  const keys=Object.keys(WORD_BANK);let best='',score=Infinity;
  const distance=(a,b)=>{const matrix=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)matrix[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return matrix[a.length][b.length]};
  keys.forEach(candidate=>{const next=distance(key,candidate);if(next<score){score=next;best=candidate}});
  return best&&score<=Math.max(2,Math.floor(key.length/3))?{suggestion:best}:null;
}
function renderThesaurusEntry(word,definition,synonyms=[],related=[]){
  const results=$('#thesaurusResults');results.replaceChildren();
  const card=document.createElement('article');card.className='definition-card';
  const title=document.createElement('h4');title.textContent=word;
  const copy=document.createElement('ol');copy.className='definition-list';
  const definitions=Array.isArray(definition)?definition:[definition];
  [...new Set(definitions.filter(Boolean))].forEach(value=>{const item=document.createElement('li');item.textContent=value.replace(/^([a-z]+)\t/i,'$1 — ');copy.append(item)});
  if(!copy.children.length){const item=document.createElement('li');item.textContent='No definition was returned for this word.';copy.append(item)}
  const label=document.createElement('div');label.className='part';label.textContent='Synonyms';
  const buttons=document.createElement('div');buttons.className='synonym-buttons';
  synonyms.forEach(item=>{const button=document.createElement('button');button.type='button';button.className='synonym-button';button.textContent=typeof item==='string'?item:item.word;button.addEventListener('click',()=>lookupThesaurus(button.textContent));buttons.append(button)});
  if(!synonyms.length){const empty=document.createElement('p');empty.textContent='No exact synonyms returned. Try the related words below.';buttons.append(empty)}
  card.append(title,copy,label,buttons);
  if(related.length){
    const heading=document.createElement('div');heading.className='part';heading.textContent='Related words — check the meaning before substituting';
    const options=document.createElement('div');options.className='synonym-buttons';
    related.forEach(word=>{const button=document.createElement('button');button.type='button';button.className='synonym-button';button.textContent=word;button.addEventListener('click',()=>lookupThesaurus(word));options.append(button)});
    card.append(heading,options);
  }
  results.append(card);
}
function showSpellingSuggestion(word){
  const holder=$('#thesaurusSuggestion');holder.replaceChildren();
  if(!word){holder.hidden=true;return}
  const text=document.createTextNode('Did you mean '),button=document.createElement('button');button.type='button';button.className='text-button';button.textContent=word;button.addEventListener('click',()=>lookupThesaurus(word));holder.append(text,button,document.createTextNode('?'));holder.hidden=false;
}
let lookupRequestId=0;
const thesaurusCache=new Map();
const VERB_BASES={accomplished:'accomplish',achieved:'achieve',accelerated:'accelerate',advanced:'advance',built:'build',championed:'champion',coordinated:'coordinate',created:'create',delivered:'deliver',developed:'develop',directed:'direct',enabled:'enable',enhanced:'enhance',established:'establish',executed:'execute',expanded:'expand',generated:'generate',improved:'improve',increased:'increase',integrated:'integrate',led:'lead',managed:'manage',modernized:'modernize',optimized:'optimize',orchestrated:'orchestrate',pioneered:'pioneer',prevented:'prevent',produced:'produce',reduced:'reduce',resolved:'resolve',restored:'restore',secured:'secure',spearheaded:'spearhead',streamlined:'streamline',strengthened:'strengthen',transformed:'transform',upgraded:'upgrade'};
async function fetchWordData(url){
  try{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const response=await fetch(url,{signal:controller.signal});if(!response.ok)return[];const result=await response.json();return Array.isArray(result)?result:[]}finally{clearTimeout(timer)}}catch{return[]}
}
function showThesaurusData(term,data){
  renderThesaurusEntry(term,data.definitions,data.synonyms,data.related);
  showSpellingSuggestion(data.suggestion||'');
  $('#thesaurusStatus').textContent=`${data.synonyms.length} synonyms · ${data.related.length} related words · ${data.definitions.length} definitions. Select a word to explore its meanings.`;
}
async function lookupThesaurus(rawTerm){
  const term=rawTerm.trim().toLowerCase();if(!term)return;$('#thesaurusSearch').value=term;$('#thesaurusStatus').textContent='Searching…';showSpellingSuggestion('');$('#thesaurusResults').replaceChildren();
  const requestId=++lookupRequestId;
  if(thesaurusCache.has(term)){showThesaurusData(term,thesaurusCache.get(term));return}
  const fallback=wordBankFallback(term);
  if(fallback?.word){renderThesaurusEntry(term,fallback.definition,fallback.synonyms);$('#thesaurusStatus').textContent='Showing writing alternatives while the full search loads…'}
  try{
    const encoded=encodeURIComponent(term),base=VERB_BASES[term]||term,baseEncoded=encodeURIComponent(base);
    const urls=[`https://api.datamuse.com/words?sp=${encoded}&md=dp&qe=sp&max=1`,`https://api.datamuse.com/words?rel_syn=${encoded}&md=dp&max=1000`,`https://api.datamuse.com/sug?s=${encoded}&max=5`,`https://api.dictionaryapi.dev/api/v2/entries/en/${encoded}`,`https://api.datamuse.com/words?ml=${baseEncoded}&md=dp&max=80`];
    if(base!==term)urls.push(`https://api.datamuse.com/words?rel_syn=${baseEncoded}&max=1000`,`https://api.dictionaryapi.dev/api/v2/entries/en/${baseEncoded}`);
    const [head,synonyms,suggestions,dictionary,related,baseSynonyms=[],baseDictionary=[]]=await Promise.all(urls.map(fetchWordData));
    if(requestId!==lookupRequestId)return;
    const exact=head.find(item=>item.word?.toLowerCase()===term.toLowerCase());
    const definitions=[],allSynonyms=[...synonyms,...baseSynonyms].map(item=>item.word);
    [...dictionary,...baseDictionary].forEach(entry=>(entry.meanings||[]).forEach(meaning=>{allSynonyms.push(...(meaning.synonyms||[]));(meaning.definitions||[]).forEach(item=>{definitions.push(`${meaning.partOfSpeech} — ${item.definition}`);allSynonyms.push(...(item.synonyms||[]))})}));
    if(!definitions.length)definitions.push(...(exact?.defs||[]));
    if(!definitions.length&&fallback?.word)definitions.push(fallback.definition);
    if(fallback?.word)allSynonyms.push(...fallback.synonyms);
    if(!exact&&!definitions.length&&!allSynonyms.length)throw new Error('no match');
    const uniqueSynonyms=[...new Set(allSynonyms.filter(word=>typeof word==='string'&&word.toLowerCase()!==term&&word.toLowerCase()!==base))];
    const relatedWords=[...new Set(related.map(item=>item.word).filter(word=>typeof word==='string'&&word!==term&&word!==base&&!uniqueSynonyms.includes(word)))];
    const suggestion=!exact&&!dictionary.length?suggestions.find(item=>item.word?.toLowerCase()!==term)?.word:'';
    const data={definitions:[...new Set(definitions)],synonyms:uniqueSynonyms,related:relatedWords,suggestion};
    thesaurusCache.set(term,data);showThesaurusData(term,data);
  }catch{
    if(requestId!==lookupRequestId)return;
    if(fallback?.word){renderThesaurusEntry(fallback.word,fallback.definition,fallback.synonyms);$('#thesaurusStatus').textContent='Showing the offline Air Force writing word bank.'}
    else{$('#thesaurusResults').replaceChildren();$('#thesaurusStatus').textContent='No definition or synonyms were found.';showSpellingSuggestion(fallback?.suggestion||'')}
  }
}
$('#thesaurusForm').addEventListener('submit',event=>{event.preventDefault();void lookupThesaurus($('#thesaurusSearch').value)});

const confirmationTimers=new WeakMap();
function resetConfirmation(button){const timer=confirmationTimers.get(button);if(timer)clearTimeout(timer);confirmationTimers.delete(button);button.textContent=button.dataset.defaultLabel||button.textContent;button.classList.remove('confirming-action');delete button.dataset.confirming}
function confirmAction(button,prompt,action){
  if(button.dataset.confirming==='true'){resetConfirmation(button);action();return}
  button.dataset.defaultLabel=button.textContent;button.dataset.confirming='true';button.textContent=prompt;button.classList.add('confirming-action');
  confirmationTimers.set(button,setTimeout(()=>resetConfirmation(button),6000));
}
function notify(message){els.toast.textContent=message;els.toast.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>els.toast.classList.remove('show'),1800)}

// Email/password accounts are handled by Supabase Auth once the owner supplies
// this site's public project URL and anon key in auth-config.js.
const AUTH_SESSION_KEY='bullet-shitter-auth-session-v1';
const PENDING_SYNC_KEY='bullet-shitter-pending-sync-v1';
const PENDING_IMPORT_KEY='bullet-shitter-pending-import-v1';
const authConfig=globalThis.BULLET_SHITTER_AUTH||{};
const accountDialog=$('#accountDialog');
let authSession=null;
try{authSession=JSON.parse(localStorage.getItem(AUTH_SESSION_KEY)||'null')}catch{}
function authReady(){return /^https:\/\//.test(authConfig.supabaseUrl||'')&&Boolean(authConfig.anonKey)}
async function authRequest(path,{method='POST',body,token}={}){
  if(!authReady())throw new Error('Account registration needs to be connected by the site owner.');
  const response=await fetch(`${authConfig.supabaseUrl.replace(/\/$/,'')}/auth/v1/${path}`,{method,headers:{apikey:authConfig.anonKey,Authorization:`Bearer ${token||authConfig.anonKey}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.msg||data.message||data.error_description||'Account request failed.');
  return data;
}
async function dataRequest(table,{method='GET',query='select=*',body,prefer,_retried=false}={}){
  if(!authSession?.access_token)throw new Error('Sign in to use account storage.');
  const response=await fetch(`${authConfig.supabaseUrl.replace(/\/$/,'')}/rest/v1/${table}${query?`?${query}`:''}`,{method,headers:{apikey:authConfig.anonKey,Authorization:`Bearer ${authSession.access_token}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  if(response.status===401&&!_retried&&authSession?.refresh_token){
    const refreshed=await authRequest('token?grant_type=refresh_token',{body:{refresh_token:authSession.refresh_token}});
    saveAuthSession(refreshed);
    return dataRequest(table,{method,query,body,prefer,_retried:true});
  }
  const data=response.status===204?null:await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.message||data?.hint||'Account storage is unavailable.');
  return data;
}
function sessionUser(){return authSession?.user||null}
function displayNameFor(user){return user?.user_metadata?.display_name||user?.email?.split('@')[0]||'Profile'}
let accountMode='signin';
let draftReady=false,workspaceDraft=null,draftSyncTimer=null,draftScope=null,preferenceSyncChain=Promise.resolve();
let pendingGuestImport=null;
function switchAccountMode(mode){
  accountMode=mode==='signup'?'signup':'signin';
  $('#accountSignInForm').hidden=accountMode!=='signin';$('#accountSignUpForm').hidden=accountMode!=='signup';
  $('#showSignIn').classList.toggle('active',accountMode==='signin');$('#showSignIn').setAttribute('aria-selected',String(accountMode==='signin'));
  $('#showSignUp').classList.toggle('active',accountMode==='signup');$('#showSignUp').setAttribute('aria-selected',String(accountMode==='signup'));
  $('#accountDialogTitle').textContent=accountMode==='signin'?'Sign in':'Create account';
  $('#accountStatus').textContent=accountMode==='signin'?'Enter your email and password.':'Create an account with any valid email address.';
}
function renderAccount(){
  const user=sessionUser(),signedIn=Boolean(user);
  $('#profileName').textContent=signedIn?displayNameFor(user):'Sign in';
  $('#profileEmail').textContent=signedIn?user.email:'Save work to your account';
  $('#profileAvatar').textContent=signedIn?displayNameFor(user).slice(0,1).toUpperCase():'?';
  $('#profileForm').hidden=!signedIn;$('#accountSignOut').hidden=!signedIn;$('#settingsSignIn').hidden=signedIn;
  $('#settingsAccountStatus').textContent=signedIn?'Profile and appearance settings sync with this account.':'Sign in to update your profile and sync appearance settings.';
  if(signedIn){$('#profileDisplayName').value=displayNameFor(user);$('#profileEmailInput').value=user.email||''}
}
function saveAuthSession(session){const oldUserId=sessionUser()?.id||'guest',newUserId=session?.user?.id||'guest';if(draftReady&&oldUserId!==newUserId){persistWorkspaceDraft(false);clearTimeout(draftSyncTimer);clearTimeout(preferenceSyncTimer)}authSession=session||null;try{session?localStorage.setItem(AUTH_SESSION_KEY,JSON.stringify(session)):localStorage.removeItem(AUTH_SESSION_KEY)}catch{}renderAccount();if(draftReady&&oldUserId!==newUserId)restoreWorkspaceDraft()}
function openAccountDialog(mode='signin'){switchAccountMode(mode);accountDialog.showModal()}
function openAccountSettings(){setDrawer(true);selectDrawerTab(document.querySelector('[aria-controls="drawer-settings"]'));$('#profileDisplayName').focus()}
$('#profileTrigger').addEventListener('click',()=>{renderAccount();sessionUser()?openAccountSettings():openAccountDialog('signin')});
$('#settingsSignIn').addEventListener('click',()=>openAccountDialog('signin'));
$('#showSignIn').addEventListener('click',()=>switchAccountMode('signin'));$('#showSignUp').addEventListener('click',()=>switchAccountMode('signup'));
$('#accountClose').addEventListener('click',()=>accountDialog.close());
accountDialog.addEventListener('click',event=>{if(event.target===accountDialog)accountDialog.close()});
$('#accountSignInForm').addEventListener('submit',async event=>{
  event.preventDefault();const button=$('#accountSignIn');button.disabled=true;
  try{rememberGuestWork();const data=await authRequest('token?grant_type=password',{body:{email:$('#accountEmail').value.trim(),password:$('#accountPassword').value}});saveAuthSession(data);accountDialog.close();await initializeAccountStorage({offerGuestImport:true});notify('Signed in')}
  catch(error){$('#accountStatus').textContent=error.message}finally{button.disabled=false}
});
$('#accountSignUpForm').addEventListener('submit',async event=>{
  event.preventDefault();const email=$('#accountSignUpEmail').value.trim(),password=$('#accountSignUpPassword').value,display_name=$('#accountDisplayName').value.trim();
  if(!email||password.length<8){$('#accountStatus').textContent='Enter a valid email and a password with at least 8 characters.';return}
  const button=$('#accountSignUp');button.disabled=true;
  try{rememberGuestWork();const data=await authRequest(`signup?redirect_to=${encodeURIComponent(location.origin+location.pathname)}`,{body:{email,password,data:{display_name}}});if(data.access_token){saveAuthSession(data);accountDialog.close();await initializeAccountStorage({offerGuestImport:true});notify('Account created')}else{$('#accountStatus').textContent='Check your email to verify the account, then sign in.'}}
  catch(error){$('#accountStatus').textContent=error.message}finally{button.disabled=false}
});
$('#accountRecovery').addEventListener('click',async()=>{
  const email=$('#accountEmail').value.trim();if(!email){$('#accountStatus').textContent='Enter your email address first.';return}
  try{await authRequest(`recover?redirect_to=${encodeURIComponent(location.origin+location.pathname)}`,{body:{email}});$('#accountStatus').textContent='If that account exists, a password-reset email is on the way.'}catch(error){$('#accountStatus').textContent=error.message}
});
$('#profileForm').addEventListener('submit',async event=>{
  event.preventDefault();if(!authSession?.access_token)return;
  try{const password=$('#profileNewPassword').value,email=$('#profileEmailInput').value.trim(),previousEmail=sessionUser().email;const changes={data:{display_name:$('#profileDisplayName').value.trim()}};if(email&&email!==previousEmail)changes.email=email;if(password){if(password.length<8)throw new Error('The new password must be at least 8 characters.');changes.password=password}const user=await authRequest('user',{method:'PUT',token:authSession.access_token,body:changes});authSession.user=user;saveAuthSession(authSession);$('#profileNewPassword').value='';await saveAccountPreferences();$('#settingsAccountStatus').textContent=email!==previousEmail?'Profile updated. Check both email inboxes if Supabase asks you to confirm the address change.':'Profile updated and synced.';notify('Profile updated')}
  catch(error){$('#settingsAccountStatus').textContent=error.message}
});
$('#accountSignOut').addEventListener('click',async()=>{try{if(authSession?.access_token)await authRequest('logout',{token:authSession.access_token})}catch{}saveAuthSession(null);reloadLocalLibraries();notify('Signed out')});
renderAccount();

let bulletHistory=[els.source.value],bulletHistoryIndex=0,historyApplying=false;
function updateHistoryButtons(){$('#undoButton').disabled=bulletHistoryIndex<=0;$('#redoButton').disabled=bulletHistoryIndex>=bulletHistory.length-1}
function resetBulletHistory(){bulletHistory=[els.source.value];bulletHistoryIndex=0;updateHistoryButtons()}
function applyBulletHistory(index){if(index<0||index>=bulletHistory.length)return;historyApplying=true;bulletHistoryIndex=index;els.source.value=bulletHistory[index];render();historyApplying=false;updateHistoryButtons();els.source.focus()}
els.source.addEventListener('input',()=>{render();if(historyApplying)return;bulletHistory=bulletHistory.slice(0,bulletHistoryIndex+1);bulletHistory.push(els.source.value);if(bulletHistory.length>250)bulletHistory.shift();else bulletHistoryIndex++;updateHistoryButtons()});
$('#undoButton').addEventListener('click',()=>applyBulletHistory(bulletHistoryIndex-1));
$('#redoButton').addEventListener('click',()=>applyBulletHistory(bulletHistoryIndex+1));
$('#abbreviationForm').addEventListener('submit',event=>{event.preventDefault();const from=$('#phraseInput').value.trim(),to=$('#replacementInput').value.trim();if(!from||!to)return;const existing=rules.find(rule=>rule.from.toLowerCase()===from.toLowerCase());if(existing)existing.to=to;else rules.push({from,to});$('#phraseInput').value='';$('#replacementInput').value='';saveRules()});
$('#resetRules').addEventListener('click',()=>confirmAction($('#resetRules'),'Confirm reset',()=>{rules=DEFAULT_RULES.map(rule=>({...rule}));saveRules()}));
$('#copyButton').addEventListener('click',async()=>{try{render();await navigator.clipboard.writeText(copyTextWithLineBreaks(currentOutput));notify('Formatted text copied with line breaks')}catch{notify('Select and copy the text manually')}});
els.search.addEventListener('input',()=>renderAcronyms(els.search.value));
els.dodSearch.addEventListener('input',()=>renderDodAcronyms(els.dodSearch.value));
const boxObserver=new ResizeObserver(syncPaperScale);
document.querySelectorAll('.paper-shell').forEach(shell=>boxObserver.observe(shell));
syncPaperScale();
renderAcronyms();
renderDodAcronyms();
void loadDodAcronyms();
render();
renderRules();

// Versioned snapshots retain source and generated text. The empty rules field preserves cloud-schema compatibility.
const BULLETS_KEY='tighttype-saved-bullets-v1';
const LEGACY_CLAIM_KEY='bullet-shitter-legacy-library-claimed-v1';
function bulletStorageKey(){return authSession?.user?.id?`${BULLETS_KEY}:${authSession.user.id}`:BULLETS_KEY}
let savedBullets=[];
let currentBulletId=null;
try{
  const stored=JSON.parse(localStorage.getItem(bulletStorageKey())||'[]');
  if(!Array.isArray(stored))throw new Error('Invalid saved data');
  savedBullets=stored.filter(row=>row&&typeof row==='object').map(row=>({...row,id:row.id||makeId(),title:String(row.title||'Untitled bullet'),source:String(row.source||''),output:String(row.output||row.source||''),rules:Array.isArray(row.rules)?row.rules:DEFAULT_RULES.map(rule=>({...rule}))}));
}catch{
  $('#savedStatus').textContent='Saved bullets could not be loaded. Browser storage may be unavailable.';
}
function storeBullets(next){
  try{localStorage.setItem(bulletStorageKey(),JSON.stringify(next));savedBullets=next;return true}
  catch{notify('Could not save changes. Browser storage may be full or unavailable.');return false}
}
function showSavedBullets(){
  const list=$('#savedBullets');list.replaceChildren();
  if(!savedBullets.length){const empty=document.createElement('p');empty.textContent='Your titled bullets will appear here.';empty.className='section-help';list.append(empty);return}
  savedBullets.forEach(bullet=>{
    const item=document.createElement('article');item.className='saved-item';
    const title=document.createElement('h3');title.textContent=bullet.title;
    const date=document.createElement('time');date.dateTime=bullet.createdAt;date.textContent=new Date(bullet.createdAt).toLocaleString();
    const text=document.createElement('p');text.textContent=bullet.output;
    const actions=document.createElement('div');actions.className='saved-actions';
    const open=document.createElement('button');open.type='button';open.className='secondary';open.textContent='Edit';
    open.addEventListener('click',()=>{
      els.source.value=bullet.source;$('#bulletTitle').value=bullet.title;
      rules=Array.isArray(bullet.rules)&&bullet.rules.length?bullet.rules.map(rule=>({...rule})):DEFAULT_RULES.map(rule=>({...rule}));renderRules();render();
      currentBulletId=bullet.id;$('#saveBulletButton').textContent='Update';
      resetBulletHistory();selectTab($('#tab-1206'));persistWorkspaceDraft();$('#sourceText').focus();notify('Saved bullet ready to edit');
    });
    const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Delete';remove.setAttribute('aria-label',`Delete ${bullet.title}`);
    remove.addEventListener('click',()=>confirmAction(remove,'Confirm delete',()=>{if(storeBullets(savedBullets.filter(row=>row.id!==bullet.id))){void deleteCloudRecord('bullets',bullet.id);showSavedBullets();notify('Saved bullet deleted')}}));
    actions.append(open,remove);item.append(title,date,text,actions);list.append(item);
  });
}
async function saveBullet(asCopy=false){
  const title=$('#bulletTitle').value.trim();
  if(!title){notify('Give the bullet a title.');return}
  if(!els.source.value.trim()){notify('Write a bullet before saving.');return}
  render();
  const existing=!asCopy&&currentBulletId?savedBullets.find(row=>row.id===currentBulletId):null;
  const bullet={schemaVersion:1,id:existing?.id||makeId(),title,source:els.source.value,output:currentOutput,rules:rules.map(rule=>({...rule})),createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  const next=existing?savedBullets.map(row=>row.id===existing.id?bullet:row):[bullet,...savedBullets];
  if(storeBullets(next)){
    currentBulletId=bullet.id;$('#saveBulletButton').textContent='Update';showSavedBullets();
    if(sessionUser()){
      $('#savedStatus').textContent='Saving to your account…';
      const synced=await upsertCloudBullet(bullet);
      notify(synced?(existing?'Changes saved to account':'Bullet saved to account'):'Saved on this device; account sync queued');
    }else notify(existing?'Changes saved on this device':'Bullet saved on this device');
  }
}
$('#saveBulletForm').addEventListener('submit',event=>{event.preventDefault();void saveBullet(false)});
$('#saveBulletCopyButton').addEventListener('click',()=>void saveBullet(true));
let clearConfirmStep=0,clearConfirmTimer;
function resetClearConfirm(){clearConfirmStep=0;clearTimeout(clearConfirmTimer);const button=$('#clearContentsButton');button.textContent='Clear Contents';button.classList.remove('confirming','really-confirming')}
$('#clearContentsButton').addEventListener('click',()=>{
  const button=$('#clearContentsButton');clearTimeout(clearConfirmTimer);
  if(clearConfirmStep===0){clearConfirmStep=1;button.textContent='are you sure?';button.classList.add('confirming');clearConfirmTimer=setTimeout(resetClearConfirm,6000);return}
  if(clearConfirmStep===1){clearConfirmStep=2;button.textContent='ARE YOU REALLY SURE?';button.classList.add('really-confirming');clearConfirmTimer=setTimeout(resetClearConfirm,6000);return}
  currentBulletId=null;$('#bulletTitle').value='';$('#saveBulletButton').textContent='Save bullet';els.source.value='';render();resetBulletHistory();resetClearConfirm();els.source.focus();notify('Contents cleared');
});
updateHistoryButtons();
showSavedBullets();

// EPB / OPB builder, local saves, preview, and flattened official-form PDF export.
const REPORTS_KEY='tighttype-saved-reports-v1';
function reportStorageKey(){return authSession?.user?.id?`${REPORTS_KEY}:${authSession.user.id}`:REPORTS_KEY}
const enlistedGrades=['','CMSgt','CMSgt Select','SMSgt','SMSgt Select','MSgt','MSgt Select','TSgt','TSgt Select','SSgt','SSgt Select','SrA','A1C','Amn','AB'];
const officerGrades=['','Col','Col (S)','Col (T)','Lt Col','Lt Col (S)','Lt Col (T)','Maj','Maj (S)','Maj (T)','Capt','Capt (S)','Capt (T)','1Lt','2Lt','CW5','CW5 (S)','CW4','CW4 (S)','CW3','CW3 (S)','CW2','WO1'];
const reasons={EPB:['','Dir by HQ USAF','Dir by Commander','Annual','First Annual','First Biennial','Biennial'],OPB:['','Dir by HQ USAF','Dir by Commander','Annual','Biennial']};
const reportInputs=[...document.querySelectorAll('[data-report]')];
let reportType='EPB';
let savedReports=[];
let currentReportId=null;
try{
  const stored=JSON.parse(localStorage.getItem(reportStorageKey())||'[]');
  if(Array.isArray(stored))savedReports=stored.filter(row=>row&&typeof row==='object').map(row=>({schemaVersion:1,id:row.id||makeId(),title:String(row.title||'Untitled report'),type:row.type==='OPB'?'OPB':'EPB',data:row.data&&typeof row.data==='object'?row.data:{},createdAt:row.createdAt||new Date().toISOString(),updatedAt:row.updatedAt||row.createdAt||new Date().toISOString()}));
}catch{$('#savedReportsStatus').textContent='Saved reports could not be loaded. New reports can still be saved.'}

function reportData(){const data={};reportInputs.forEach(input=>data[input.dataset.report]=input.dataset.report==='dodid'?'':input.value);return data}
function setReportData(data={}){const safe=data&&typeof data==='object'?data:{};reportInputs.forEach(input=>input.value=input.dataset.report==='dodid'?'':safe[input.dataset.report]||'');updateReportCounts()}
function optionList(select,values,current=''){select.replaceChildren(...values.map(value=>{const option=document.createElement('option');option.value=value;option.textContent=value;return option}));select.value=values.includes(current)?current:''}
function setReportType(next){
  reportType=next;$('#typeEPB').checked=next==='EPB';$('#typeOPB').checked=next==='OPB';
  optionList($('#gradeSelect'),next==='EPB'?enlistedGrades:officerGrades,$('#gradeSelect').value);
  optionList($('#reasonSelect'),reasons[next],$('#reasonSelect').value);
  $('#epbRecommendationSection').hidden=next!=='EPB';
  $('#opbStratificationSection').hidden=next!=='OPB';
  $('#mandatoryCommentsLabel').childNodes[0].nodeValue=next==='OPB'?'MANDATORY COMMENTS (FITNESS/CLIMATE/HOUSING/VOTING)':'MANDATORY COMMENTS (FITNESS/HOUSING/VOTING)';
  const nbr=next==='EPB'?'716':'715';$('#exportReportButton').textContent=`Export official AF Form ${nbr}`;
}
$('#typeEPB').addEventListener('change',event=>{if(!event.target.checked)event.target.checked=true;setReportType('EPB')});
$('#typeOPB').addEventListener('change',event=>{if(!event.target.checked)event.target.checked=true;setReportType('OPB')});
// Limits are drafting guidance, not input restrictions. Preserve every character.
reportInputs.filter(input=>input.tagName==='TEXTAREA').forEach(input=>{
  const limit=input.getAttribute('maxlength');if(!limit)return;
  input.dataset.characterLimit=limit;input.removeAttribute('maxlength');
  if(!document.querySelector(`[data-count-for="${input.dataset.report}"]`)){
    const output=document.createElement('output');output.dataset.countFor=input.dataset.report;output.className='report-admin-count';input.after(output);
  }
});
function updateReportCounts(){document.querySelectorAll('[data-count-for]').forEach(output=>{const input=document.querySelector(`[data-report="${output.dataset.countFor}"]`);const limit=Number(input.dataset.characterLimit),count=input.value.length;output.textContent=`${count} / ${limit}${count>limit?` · ${count-limit} over limit`:''}`;output.classList.toggle('near-limit',count>=limit*.9);output.classList.toggle('over-limit',count>limit)})}
reportInputs.forEach(input=>input.addEventListener('input',updateReportCounts));

function storeReports(next){try{localStorage.setItem(reportStorageKey(),JSON.stringify(next));savedReports=next;return true}catch{notify('Could not save report. Browser storage may be unavailable.');return false}}
function showSavedReports(){
  const list=$('#savedReports');list.replaceChildren();
  if(!savedReports.length){const empty=document.createElement('p');empty.className='section-help';empty.textContent='Your titled EPB and OPB reports will appear here.';list.append(empty);return}
  savedReports.forEach(report=>{
    const item=document.createElement('article');item.className='saved-item';const h=document.createElement('h3');h.textContent=report.title;
    const meta=document.createElement('time');meta.dateTime=report.updatedAt||report.createdAt;const parsedDate=new Date(report.updatedAt||report.createdAt);meta.textContent=`${report.type} · ${Number.isNaN(parsedDate.getTime())?'Saved report':parsedDate.toLocaleString()}`;
    const summary=document.createElement('p');summary.textContent=report.data?.name||report.data?.dutyTitle||'Untitled member';
    const actions=document.createElement('div');actions.className='saved-actions';const load=document.createElement('button');load.type='button';load.className='secondary';load.textContent='Edit';
    load.addEventListener('click',()=>{currentReportId=report.id;$('#reportTitle').value=report.title;setReportType(report.type);setReportData(report.data);$('#saveReportButton').textContent='Update';selectTab($('#tab-epb'));window.scrollTo({top:0,behavior:'smooth'});notify('Saved report ready to edit')});
    const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Delete';remove.addEventListener('click',()=>confirmAction(remove,'Confirm delete',()=>{if(storeReports(savedReports.filter(row=>row.id!==report.id))){void deleteCloudRecord('reports',report.id);showSavedReports();notify('Saved report deleted')}}));
    actions.append(load,remove);item.append(h,meta,summary,actions);list.append(item);
  });
}
async function saveReport(asCopy=false){
  const title=$('#reportTitle').value.trim();if(!title){notify('Give the report a title.');return}
  const existing=!asCopy&&currentReportId?savedReports.find(row=>row.id===currentReportId):null;
  const report={schemaVersion:1,id:existing?.id||makeId(),title,type:reportType,data:reportData(),createdAt:existing?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  const next=existing?savedReports.map(row=>row.id===existing.id?report:row):[report,...savedReports];
  if(storeReports(next)){
    currentReportId=report.id;$('#saveReportButton').textContent='Update';
    try{showSavedReports()}catch{$('#savedReportsStatus').textContent='Report saved. Refresh the page to reload the saved list.'}
    if(sessionUser()){
      $('#savedReportsStatus').textContent='Saving to your account…';
      const synced=await upsertCloudReport(report);
      notify(synced?(existing?'Report changes saved to account':'Report saved to account'):'Saved on this device; account sync queued');
    }else notify(existing?'Report changes saved on this device':'Report saved on this device');
  }
}
$('#saveReportForm').addEventListener('submit',event=>{event.preventDefault();void saveReport(false)});$('#saveReportCopyButton').addEventListener('click',()=>void saveReport(true));
$('#reportForm').addEventListener('submit',event=>event.preventDefault());
function clearReport(){currentReportId=null;$('#reportTitle').value='';$('#saveReportButton').textContent='Save report';setReportData({});notify('New blank form ready')}
$('#newReportButton').addEventListener('click',()=>{if(Object.values(reportData()).some(value=>String(value).trim()))confirmAction($('#newReportButton'),'Are you sure you want to clear your work?',clearReport);else clearReport()});

const XFA_FIELDS={name:'S1Name',dodid:'S1SSN',grade:'Grade',dutyTitle:'dutyTitle',fromDate:'S1FromDate',thruDate:'S1ThruDate',reason:'reasonReport',dafsc:'dafsc',daysSupervised:'daysSupervised',daysNonRated:'daysNonRated',rateeAcknowledgment:'rateeAcknowledgement',organization:'orgComand',location:'orgLocation',dutyDescription:'dutyDescription',executingMission:'executingMission',leadingPeople:'leadingPeople',managingResources:'managingResources',improvingUnit:'improvingUnit',mandatoryComments:'mandatoryComments',mandatoryFitnessComments:'mandatoryFitnessComments',raterName:'raterGradeName',raterDutyTitle:'raterDutyTitle',raterOrganization:'raterOrgComm',raterStratification:'RaterStratification',hlrAssessment:'HLReviewerAssessment',hlrName:'HLRGradeName',hlrDutyTitle:'HLRDutyTitle',hlrOrganization:'HLROrgCommand',hlrStratification:'HLRStratification',promotionRecommendation:'PromoRecomm',higherResponsibility:'HLRHigherResp',futureRole1:'FutureRole1Text',futureRole2:'FutureRole2Text',futureRole3:'FutureRole3Text',stratification:'HLRStratificationBlock'};
function xfaDate(value){return value?value.replaceAll('-',''):''}
function xfaValues(data){const out={};Object.entries(XFA_FIELDS).forEach(([key,field])=>out[field]=key==='dodid'?'':key==='fromDate'||key==='thruDate'?xfaDate(data[key]):String(data[key]||''));return out}
function setXfaTemplateValues(xml,values){
  const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Official form template could not be read.');
  [...doc.getElementsByTagNameNS('*','field')].forEach(field=>{const value=values[field.getAttribute('name')];if(value===undefined)return;let holder=[...field.children].find(el=>el.localName==='value');if(!holder){holder=doc.createElementNS(field.namespaceURI,'value');const anchor=[...field.children].find(el=>['bind','traversal','event','calculate','validate'].includes(el.localName));field.insertBefore(holder,anchor||null)}let leaf=[...holder.children][0];if(!leaf){leaf=doc.createElementNS(field.namespaceURI,'text');holder.append(leaf)}leaf.textContent=value});
  return new XMLSerializer().serializeToString(doc);
}
function xmlEscape(value){return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]))}
function xfaDatasets(values){
  const node=(name)=>`<${name}>${xmlEscape(values[name]||'')}</${name}>`;
  const intro=['S1Name','S1SSN','dutyTitle','S1FromDate','reasonReport','dafsc','S1ThruDate','daysSupervised','daysNonRated','rateeAcknowledgement','orgComand','orgLocation','executingMission','leadingPeople','managingResources','improvingUnit','Grade','dutyDescription'].map(node).join('');
  const reviewer=['raterGradeName','raterDutyTitle','raterOrgComm','RaterStratification','HLReviewerAssessment','HLRGradeName','HLRDutyTitle','HLROrgCommand','HLRStratification','PromoRecomm','HLRHigherResp','FutureRole1Text','FutureRole2Text','FutureRole3Text','HLRStratificationBlock'].map(node).join('');
  return `<xfa:datasets xmlns:xfa="http://www.xfa.org/schema/xfa-data/1.0/"><xfa:data><form1><Page11><StaticIntro>${intro}</StaticIntro><DynamicMC>${node('mandatoryComments')}</DynamicMC><DynamicMFC>${node('mandatoryFitnessComments')}</DynamicMFC><sub2>${reviewer}</sub2></Page11><Page4>${node('S1Name')}${node('S1SSN')}${node('Grade')}</Page4></form1></xfa:data></xfa:datasets>`;
}
async function exportOfficialForm(){
  const button=$('#exportReportButton'),formNumber=reportType==='EPB'?'716':'715';button.disabled=true;button.textContent='Preparing official form…';
  try{
    if(!globalThis.PDFLib)throw new Error('PDF export library did not load.');
    const [pdfResponse,templateResponse]=await Promise.all([fetch(`./forms/af${formNumber}.pdf`),fetch(`./forms/af${formNumber}-template.xml`)]);if(!pdfResponse.ok||!templateResponse.ok)throw new Error('Official form files are unavailable.');
    const [pdfBytes,templateXml]=await Promise.all([pdfResponse.arrayBuffer(),templateResponse.text()]);
    const pdf=await PDFLib.PDFDocument.load(pdfBytes,{updateMetadata:false});const values=xfaValues(reportData()),encoder=new TextEncoder();
    pdf.context.assign(PDFLib.PDFRef.of(3),pdf.context.flateStream(encoder.encode(setXfaTemplateValues(templateXml,values)),{Type:PDFLib.PDFName.of('EmbeddedFile')}));
    pdf.context.assign(PDFLib.PDFRef.of(86),pdf.context.flateStream(encoder.encode(xfaDatasets(values)),{Type:PDFLib.PDFName.of('EmbeddedFile')}));
    const output=await pdf.save({useObjectStreams:true,addDefaultPage:false,updateFieldAppearances:false});const blob=new Blob([output],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`AF-Form-${formNumber}-${reportType}-${(reportData().name||'report').replace(/[^A-Za-z0-9]+/g,'-')}.pdf`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`Official AF Form ${formNumber} exported`);
  }catch(error){console.error(error);notify('Official form export failed. Please try again.')}finally{button.disabled=false;button.textContent=`Export official AF Form ${formNumber}`}
}
$('#exportReportButton').addEventListener('click',exportOfficialForm);

function cloudBulletRow(bullet){return{id:bullet.id,user_id:sessionUser().id,title:bullet.title,source:bullet.source,output:bullet.output,rules:bullet.rules,created_at:bullet.createdAt,updated_at:bullet.updatedAt}}
function cloudReportRow(report){return{id:report.id,user_id:sessionUser().id,title:report.title,report_type:report.type,report_data:report.data,created_at:report.createdAt,updated_at:report.updatedAt}}
let preferenceSyncTimer=null;
function schedulePreferenceSync(){if(!sessionUser())return;clearTimeout(preferenceSyncTimer);preferenceSyncTimer=setTimeout(()=>void saveAccountPreferences().catch(()=>{}),500)}
async function saveAccountPreferences(){
  const user=sessionUser();if(!user)return false;
  const body={user_id:user.id,display_name:displayNameFor(user),preferences:{theme:appearance.theme,background:appearance.background,accent:appearance.accent,workspaceDraft},updated_at:new Date().toISOString()};
  const task=preferenceSyncChain.catch(()=>{}).then(async()=>{if(sessionUser()?.id!==user.id)return false;await dataRequest('profiles',{method:'POST',query:'on_conflict=user_id',body,prefer:'resolution=merge-duplicates'});return true});preferenceSyncChain=task;return task;
}
function guestWorkSnapshot(){
  const bullets=parseLocalLibrary(BULLETS_KEY),reports=parseLocalLibrary(REPORTS_KEY),source=els.source.value.trim(),data=reportData();
  const defaultSource='- Led 12-person team through rapid system upgrade—cut processing time 34% and restored mission capability 2 days early';
  return {bullets,reports,draft:source&&source!==defaultSource?{source,rules:rules.map(rule=>({...rule}))}:null,reportDraft:Object.values(data).some(value=>String(value).trim())?{type:reportType,data}:null};
}
function guestWorkCount(snapshot){return (snapshot?.bullets?.length||0)+(snapshot?.reports?.length||0)+(snapshot?.draft?1:0)+(snapshot?.reportDraft?1:0)}
function rememberGuestWork(){pendingGuestImport=guestWorkSnapshot();if(!guestWorkCount(pendingGuestImport)){forgetPendingGuestWork();return null}try{localStorage.setItem(PENDING_IMPORT_KEY,JSON.stringify(pendingGuestImport))}catch{}return pendingGuestImport}
function readPendingGuestWork(){if(pendingGuestImport)return pendingGuestImport;try{return JSON.parse(localStorage.getItem(PENDING_IMPORT_KEY)||'null')}catch{return null}}
function forgetPendingGuestWork(){pendingGuestImport=null;try{localStorage.removeItem(PENDING_IMPORT_KEY)}catch{}}
function promptGuestImportIfNeeded(){
  const snapshot=readPendingGuestWork(),count=guestWorkCount(snapshot);if(!count){forgetPendingGuestWork();return}
  pendingGuestImport=snapshot;$('#importSummary').textContent=`${count} browser item${count===1?' is':'s are'} available to import into this account. Your account library will not be overwritten.`;$('#importDialog').showModal();
}
async function importGuestWork(){
  const snapshot=readPendingGuestWork(),now=new Date().toISOString();if(!snapshot||!sessionUser())return;
  const bullets=[...(snapshot.bullets||[])].map(row=>({schemaVersion:1,id:row.id||makeId(),title:row.title||'Imported bullet',source:row.source||'',output:row.output||row.source||'',rules:Array.isArray(row.rules)?row.rules:DEFAULT_RULES,createdAt:row.createdAt||now,updatedAt:now}));
  if(snapshot.draft)bullets.push({schemaVersion:1,id:makeId(),title:`Imported draft — ${new Date().toLocaleString()}`,source:snapshot.draft.source,output:optimizeSpaces(cleanText(snapshot.draft.source)).text,rules:snapshot.draft.rules||DEFAULT_RULES,createdAt:now,updatedAt:now});
  const reports=[...(snapshot.reports||[])].map(row=>({schemaVersion:1,id:row.id||makeId(),title:row.title||'Imported report',type:row.type==='OPB'?'OPB':'EPB',data:row.data||{},createdAt:row.createdAt||now,updatedAt:now}));
  if(snapshot.reportDraft)reports.push({schemaVersion:1,id:makeId(),title:`Imported ${snapshot.reportDraft.type} draft — ${new Date().toLocaleString()}`,type:snapshot.reportDraft.type,data:snapshot.reportDraft.data,createdAt:now,updatedAt:now});
  if(bullets.length)await dataRequest('bullets',{method:'POST',query:'on_conflict=id',body:bullets.map(cloudBulletRow),prefer:'resolution=merge-duplicates'});
  if(reports.length)await dataRequest('reports',{method:'POST',query:'on_conflict=id',body:reports.map(cloudReportRow),prefer:'resolution=merge-duplicates'});
  forgetPendingGuestWork();$('#importDialog').close();await initializeAccountStorage();notify('Browser work imported to account');
}
$('#importGuestWork').addEventListener('click',()=>{const button=$('#importGuestWork');button.disabled=true;void importGuestWork().catch(error=>{$('#importSummary').textContent=error.message}).finally(()=>button.disabled=false)});
$('#skipGuestImport').addEventListener('click',()=>{forgetPendingGuestWork();$('#importDialog').close();notify('Browser work kept on this device')});
function pendingSyncStorageKey(){const user=sessionUser();return user?`${PENDING_SYNC_KEY}:${user.id}`:null}
function pendingCloudOperations(){
  const key=pendingSyncStorageKey();if(!key)return[];
  try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}
}
function writePendingCloudOperations(operations){const key=pendingSyncStorageKey();if(!key)return;localStorage.setItem(key,JSON.stringify(operations))}
function queueCloudOperation(operation){
  const operations=pendingCloudOperations().filter(item=>!(item.table===operation.table&&item.id===operation.id));
  operations.push({...operation,queued_at:new Date().toISOString()});writePendingCloudOperations(operations);
}
function removePendingCloudOperation(operation){writePendingCloudOperations(pendingCloudOperations().filter(item=>!(item.table===operation.table&&item.id===operation.id)))}
async function executeCloudOperation(operation){
  if(operation.action==='delete')return dataRequest(operation.table,{method:'DELETE',query:`id=eq.${encodeURIComponent(operation.id)}`});
  return dataRequest(operation.table,{method:'POST',query:'on_conflict=id',body:operation.body,prefer:'resolution=merge-duplicates'});
}
async function syncCloudOperation(operation,statusSelector,successMessage){
  if(!sessionUser())return false;
  try{await executeCloudOperation(operation);removePendingCloudOperation(operation);$(statusSelector).textContent=successMessage;return true}
  catch(error){queueCloudOperation(operation);$(statusSelector).textContent=`Saved on this device; account sync queued: ${error.message}`;return false}
}
async function upsertCloudBullet(bullet){
  if(!sessionUser())return false;
  return syncCloudOperation({action:'upsert',table:'bullets',id:bullet.id,body:cloudBulletRow(bullet)},'#savedStatus','Saved to your account.');
}
async function upsertCloudReport(report){
  if(!sessionUser())return false;
  return syncCloudOperation({action:'upsert',table:'reports',id:report.id,body:cloudReportRow(report)},'#savedReportsStatus','Saved to your account.');
}
async function deleteCloudRecord(table,id){
  if(!sessionUser())return;
  const selector=table==='bullets'?'#savedStatus':'#savedReportsStatus';
  const synced=await syncCloudOperation({action:'delete',table,id},selector,'Deleted from your account.');
  if(!synced)notify('Deleted on this device; account sync queued');
}
async function retryPendingSync(){
  if(!sessionUser())return 0;
  const operations=pendingCloudOperations();let remaining=operations.length;
  for(const operation of operations){
    try{await executeCloudOperation(operation);removePendingCloudOperation(operation);remaining--}catch{break}
  }
  const message=remaining?`${remaining} change${remaining===1?' is':'s are'} waiting to sync.`:'All account changes are synced.';
  $('#savedStatus').textContent=message;$('#savedReportsStatus').textContent=message;return remaining;
}
function parseLocalLibrary(key){try{const value=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
function reloadLocalLibraries(){
  savedBullets=parseLocalLibrary(bulletStorageKey());savedReports=parseLocalLibrary(reportStorageKey());currentBulletId=null;currentReportId=null;
  $('#saveBulletButton').textContent='Save bullet';$('#saveReportButton').textContent='Save report';
  const pending=sessionUser()?pendingCloudOperations().length:0;
  $('#savedStatus').textContent=sessionUser()?(pending?`${pending} change${pending===1?' is':'s are'} waiting to sync.`:'Saved to your account.'):'Saved on this browser and device.';
  $('#savedReportsStatus').textContent=$('#savedStatus').textContent;
  showSavedBullets();showSavedReports();
}
async function initializeAccountStorage({offerGuestImport=false}={}){
  const user=sessionUser();if(!user)return;
  $('#savedStatus').textContent='Syncing your account…';$('#savedReportsStatus').textContent='Syncing your account…';
  try{
    const profileRows=await dataRequest('profiles',{query:`select=display_name,preferences&user_id=eq.${encodeURIComponent(user.id)}&limit=1`});
    const profile=profileRows?.[0];
    if(profile?.preferences&&typeof profile.preferences==='object'){
      const remoteDraft=profile.preferences.workspaceDraft;
      if(remoteDraft&&Number(remoteDraft.updatedAt)>Number(workspaceDraft?.updatedAt||0)){workspaceDraft=remoteDraft;try{localStorage.setItem(workspaceDraftKey(),JSON.stringify(remoteDraft))}catch{}applyWorkspaceDraft(remoteDraft)}
      restoreAppearance(profile.preferences);applyAppearance(false);
    }else await saveAccountPreferences();
    await retryPendingSync();
    const [bulletRows,reportRows]=await Promise.all([dataRequest('bullets',{query:'select=*&order=updated_at.desc'}),dataRequest('reports',{query:'select=*&order=updated_at.desc'})]);
    savedBullets=(bulletRows||[]).map(row=>({schemaVersion:1,id:row.id,title:row.title,source:row.source||'',output:row.output||'',rules:Array.isArray(row.rules)?row.rules:[],createdAt:row.created_at,updatedAt:row.updated_at}));
    savedReports=(reportRows||[]).map(row=>({schemaVersion:1,id:row.id,title:row.title,type:row.report_type==='OPB'?'OPB':'EPB',data:row.report_data||{},createdAt:row.created_at,updatedAt:row.updated_at}));
    storeBullets(savedBullets);storeReports(savedReports);reloadLocalLibraries();if(workspaceDraft){applyWorkspaceDraft(workspaceDraft);void saveAccountPreferences().catch(()=>{})}if(offerGuestImport)promptGuestImportIfNeeded();
  }catch(error){$('#savedStatus').textContent=`Account connected; cloud storage needs setup: ${error.message}`;$('#savedReportsStatus').textContent=$('#savedStatus').textContent}
}
async function restoreAccountSession(){
  if(!authSession?.refresh_token)return;
  try{const refreshed=await authRequest('token?grant_type=refresh_token',{body:{refresh_token:authSession.refresh_token}});saveAuthSession(refreshed);await initializeAccountStorage({offerGuestImport:Boolean(readPendingGuestWork())})}
  catch{saveAuthSession(null);reloadLocalLibraries()}
}
async function consumeAuthCallback(){
  const params=new URLSearchParams(location.hash.replace(/^#/,''));const access_token=params.get('access_token'),refresh_token=params.get('refresh_token');
  if(!access_token)return false;
  try{const user=await authRequest('user',{method:'GET',token:access_token});saveAuthSession({access_token,refresh_token,user,expires_in:Number(params.get('expires_in'))||3600,token_type:params.get('token_type')||'bearer'});history.replaceState(null,'',location.pathname+location.search);renderAccount();await initializeAccountStorage({offerGuestImport:true});openAccountSettings();$('#settingsAccountStatus').textContent=params.get('type')==='recovery'?'Enter a new password, then update your profile.':'Email verified. You are signed in.';return true}catch{return false}
}

function workspaceDraftKey(){return `bullet-shitter-workspace-draft-v1:${sessionUser()?.id||'guest'}`}
function applyWorkspaceDraft(draft){
  if(!draft||typeof draft!=='object')return;
  els.source.value=typeof draft.source==='string'?draft.source:'';$('#bulletTitle').value=draft.bulletTitle||'';currentBulletId=draft.bulletId||null;
  rules=Array.isArray(draft.rules)?draft.rules.filter(rule=>rule&&typeof rule.from==='string'&&typeof rule.to==='string'):DEFAULT_RULES.map(rule=>({...rule}));renderRules();render();resetBulletHistory();
  currentReportId=draft.reportId||null;$('#reportTitle').value=draft.reportTitle||'';setReportType(draft.reportType==='OPB'?'OPB':'EPB');setReportData(draft.reportData||{});
  $('#saveBulletButton').textContent=currentBulletId?'Update':'Save bullet';$('#saveReportButton').textContent=currentReportId?'Update':'Save report';
  selectTab($(draft.activeTab==='tab-epb'?'#tab-epb':'#tab-1206'));
}
function restoreWorkspaceDraft(){
  draftScope=sessionUser()?.id||'guest';workspaceDraft=null;
  try{workspaceDraft=JSON.parse(localStorage.getItem(workspaceDraftKey())||'null')}catch{}
  if(workspaceDraft)applyWorkspaceDraft(workspaceDraft);
  else if(draftReady)applyWorkspaceDraft({source:'',rules:DEFAULT_RULES,reportData:{}});
}
function persistWorkspaceDraft(sync=true){
  if(!draftReady||draftScope!==(sessionUser()?.id||'guest'))return;
  workspaceDraft={updatedAt:Date.now(),source:els.source.value,bulletTitle:$('#bulletTitle').value,bulletId:currentBulletId,rules:rules.map(rule=>({...rule})),reportTitle:$('#reportTitle').value,reportId:currentReportId,reportType,reportData:reportData(),activeTab:document.querySelector('.tool-tab.active')?.id||'tab-1206'};
  try{localStorage.setItem(workspaceDraftKey(),JSON.stringify(workspaceDraft))}catch{notify('Draft recovery storage is unavailable. Save a titled copy before leaving.')}
  if(sync&&sessionUser()){clearTimeout(draftSyncTimer);draftSyncTimer=setTimeout(()=>void saveAccountPreferences().catch(()=>{}),1000)}
}
setReportType('EPB');updateReportCounts();showSavedReports();
restoreWorkspaceDraft();draftReady=true;
document.addEventListener('input',event=>{if(event.target.matches('#sourceText,#bulletTitle,#reportTitle,[data-report]'))persistWorkspaceDraft()});
document.addEventListener('change',event=>{if(event.target.matches('[data-report],#typeEPB,#typeOPB'))persistWorkspaceDraft()});
document.addEventListener('click',event=>{if(event.target.closest('#undoButton,#redoButton,#clearContentsButton,#newReportButton,.tool-tab,#savedBullets,#savedReports,#saveBulletButton,#saveReportButton,#saveBulletCopyButton,#saveReportCopyButton'))queueMicrotask(()=>persistWorkspaceDraft())});
window.addEventListener('pagehide',()=>persistWorkspaceDraft(false));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persistWorkspaceDraft()});
void consumeAuthCallback().then(consumed=>{if(!consumed)return restoreAccountSession()});
window.addEventListener('online',()=>{void retryPendingSync();if(sessionUser())void saveAccountPreferences().catch(()=>{})});
const chromeObserver=new ResizeObserver(()=>{const header=document.querySelector('.topbar');document.documentElement.style.setProperty('--site-chrome-height',`${header.offsetTop+header.offsetHeight}px`)});
chromeObserver.observe(document.querySelector('.topbar'));chromeObserver.observe(document.querySelector('.data-disclaimer'));
