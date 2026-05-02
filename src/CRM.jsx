import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { useClinicData } from "./hooks/useClinicData";
import {
  signOut, findPatientByPhone,
  getProfiles, adminCreateUser, adminUpdateUserRole,
  adminSetUserActive, adminResetPassword,
} from "./lib/db";

/* ════════════════════════════════════════════════ STYLES */
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=Sora:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; max-width: 100%; }
  html, body { height: 100%; font-family: 'Sora', sans-serif; background: #F5F0E6; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(184,131,46,0.3); border-radius: 4px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideRight { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
  @keyframes slideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
  @keyframes toastIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shrink { from { width:100%; } to { width:0%; } }
  @keyframes spin { to { transform:rotate(360deg); } }
  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .slide-right { animation: slideRight 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  .slide-up { animation: slideUp 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  .stagger-1 { animation-delay:50ms; } .stagger-2 { animation-delay:100ms; }
  .stagger-3 { animation-delay:150ms; } .stagger-4 { animation-delay:200ms; }
  .row-hover { transition: background 0.13s; }
  .row-hover:hover { background: rgba(184,131,46,0.04) !important; }
  .nav-btn { transition: all 0.16s ease; }
  .nav-btn:hover { background: rgba(184,131,46,0.09) !important; color: #E8B870 !important; }
  .btn-t { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
  .btn-t:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
  .btn-t:active:not(:disabled) { transform: translateY(0); }
  input:focus, textarea:focus, select:focus { outline:none; border-color:#B8832E !important; box-shadow:0 0 0 3px rgba(184,131,46,0.12) !important; }
`;

/* ════════════════════════════════════════════════ TOKENS */
const T = {
  bg:"#F5F0E6", sidebar:"#111028", sidebarL:"#191740",
  white:"#FFFFFF", text:"#1A1614", text2:"#4A4540", muted:"#8A8480",
  gold:"#B8832E", goldL:"#D4A84E", goldDim:"rgba(184,131,46,0.12)",
  border:"rgba(0,0,0,0.07)", borderM:"rgba(0,0,0,0.12)",
  green:"#1E7A4A", greenBg:"#E6F4EE",
  red:"#C03838", redBg:"#FAE8E8",
  amber:"#A86A10", amberBg:"#FEF0DC",
  blue:"#2550A0", blueBg:"#E8EEF8",
  purple:"#6B2D8B", purpleBg:"#F3EAF9",
  wa:"#25D366",
};

/* ════════════════════════════════════════════════ HELPERS */
const uid   = () => Math.random().toString(36).slice(2,9);
const now   = () => new Date();
const addH  = (d,h) => new Date(+d+h*3600000);
const addD  = (d,n) => new Date(+d+n*86400000);
const fmtD  = d => d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"});
const fmtT  = d => d.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
const fmtDT = d => `${fmtD(d)}, ${fmtT(d)}`;
const isoD  = d => d.toISOString().slice(0,10);
const pDate = s => { const d=new Date(s); d.setHours(0,0,0,0); return d; };
const today = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const toWA  = (r="") => { const n=r.replace(/\D/g,""); return n.startsWith("20")?`+${n}`:`+20${n.replace(/^0/,"")}`; };

const AV_COLS=[["#1B4F72","#3498DB"],["#2D6A4F","#52B788"],["#6B2D6B","#C678DD"],["#7B3F00","#D4882E"],["#1A3A3A","#4ECDC4"],["#4A1942","#E056A0"]];
const avColor = name => AV_COLS[name.charCodeAt(0)%AV_COLS.length];

/* ════════════════════════════════════════════════ NEW HELPERS (v2) */
const fmtEGP = n => `${(Number(n)||0).toLocaleString("en-EG", {minimumFractionDigits:0, maximumFractionDigits:2})} EGP`;
const startOfDay = d => { const x=new Date(d); x.setHours(0,0,0,0); return x; };
const endOfDay   = d => { const x=new Date(d); x.setHours(23,59,59,999); return x; };
const startOfWeek = d => { const x=startOfDay(d); const day=x.getDay()||7; x.setDate(x.getDate()-day+1); return x; };
const startOfMonth = d => { const x=startOfDay(d); x.setDate(1); return x; };
const startOfYear  = d => { const x=startOfDay(d); x.setMonth(0,1); return x; };
const dateRangePresets = () => {
  const t = new Date();
  return [
    { label:"Today",      from: startOfDay(t),                  to: endOfDay(t) },
    { label:"This Week",  from: startOfWeek(t),                 to: endOfDay(t) },
    { label:"This Month", from: startOfMonth(t),                to: endOfDay(t) },
    { label:"Last 30 d",  from: startOfDay(addD(t,-30)),        to: endOfDay(t) },
    { label:"This Year",  from: startOfYear(t),                 to: endOfDay(t) },
    { label:"All Time",   from: new Date(2020,0,1),             to: endOfDay(t) },
  ];
};
// Group services array into { categoryName: [services...] } for dropdown rendering
const groupServicesByCategory = (services, categories) => {
  const cmap = Object.fromEntries(categories.map(c => [c.id, c]));
  const out = {};
  services.filter(s => s.isActive).forEach(s => {
    const cat = cmap[s.categoryId];
    const catName = cat ? cat.name : "Other";
    (out[catName] = out[catName] || []).push(s);
  });
  return out;
};

const PAY_METHODS = ["Cash","Card","Wallet","Bank Transfer","Other"];

/* ════════════════════════════════════════════════ CLINIC DATA */
const DENTISTS = [
  "Dr. Mohamed Refaat ElBialy",
  "Dr. Sara Selim",
  "Dr. Karim M. Taha",
  "Dr. Mohamed Talaat",
  "Dr. Omar Salah",
  "Dr. Youssef Galal",
];

const SERVICES = [
  "── Aesthetic ──────────────",
  "Smile Makeover","Emax Veneers","Feldspathic Veneers",
  "Bleaching (In-office)","Bleaching (At Home)","Bleaching (Internal)",
  "Zirconia Crown","Emax Crown","Full Mouth Rehabilitation","Snap-on Smile",
  "── Restorative ────────────",
  "Composite Filling","Amalgam Replacement","Diastema Closure",
  "Inlay / Onlay / Overlay","Posts & Core Build-up","Fluoride Application","Caries Management",
  "── Endodontics ────────────",
  "Root Canal Treatment","RCT Retreatment","Abscess Management","Broken File Retrieval",
  "── Implants ───────────────",
  "Dental Implant (Strauman)","Dental Implant (European)","Bone Graft","Sinus Lifting",
  "── Periodontics ───────────",
  "Scaling & Polishing","Crown Lengthening","Gingivectomy",
  "Gingival Depigmentation","Simple Extraction","Surgical Extraction","Impaction Removal",
  "── Orthodontics ───────────",
  "Clear Aligners","Fixed Metal Braces",
  "── Pediatric ──────────────",
  "Pediatric Check-up","Pulpotomy","Pulpectomy","Zirconia Crown (Child)","Pediatric Extraction",
  "── General ────────────────",
  "Check-up","Consultation","Other",
];

const SERVICES_CLEAN = SERVICES.filter(s => !s.startsWith("──"));

// Services that trigger auto-recall suggestions on completion
const RECALL_TRIGGERS = {
  "Check-up":          { months:6, type:"6-month check-up" },
  "Scaling & Polishing":{ months:6, type:"6-month cleaning" },
  "Composite Filling": { months:3, type:"3-month filling check" },
  "Root Canal Treatment":{ months:3, type:"3-month RCT review" },
};

const CONSENT_LINE = "\n\n_أنت تتلقى هذه الرسالة لأنك حجزت موعداً في عيادات لايف دنت لتجميل وزراعة الأسنان._";

const WA = {
  CONFIRMATION: (n,d,t) => `مرحباً ${n} 👋\n\nتم تأكيد موعدك في عيادة *Lifedent Clinic* ✅\n📅 ${d}\n🕐 ${t}\n\nللإلغاء أو التغيير، رد على هذه الرسالة.${CONSENT_LINE}`,
  REMINDER:     (n,d,t) => `تذكير من عيادة *Lifedent Clinic* 🦷\n\nأهلاً ${n}، موعدك غداً:\n📅 ${d}\n🕐 ${t}\n\nنتطلع لرؤيتك! 😊${CONSENT_LINE}`,
  RECALL:       (n,r)   => `أهلاً ${n} 👋\n\nحان وقت *${r}* في عيادة Lifedent.\nتواصل معنا لحجز موعدك. 🦷${CONSENT_LINE}`,
};

const ST_CFG = {
  Scheduled: {color:T.amber,  bg:T.amberBg},
  Confirmed:  {color:T.green,  bg:T.greenBg},
  Arrived:    {color:T.purple, bg:T.purpleBg},
  Completed:  {color:T.blue,   bg:T.blueBg},
  Cancelled:  {color:T.muted,  bg:"#F0EFED"},
  "No-show":  {color:T.red,    bg:T.redBg},
};

/* ════════════════════════════════════════════════ MOBILE HOOK */
function useMobile(){
  const[m,setM]=useState(()=>window.innerWidth<768);
  useEffect(()=>{ const fn=()=>setM(window.innerWidth<768); window.addEventListener("resize",fn); return()=>window.removeEventListener("resize",fn); },[]);
  return m;
}

/* ════════════════════════════════════════════════ PRIMITIVES */
function Av({name="?",size=38}){
  const[bg,fg]=avColor(name);
  return <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${bg},${fg})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:size*0.38,fontFamily:"Sora",boxShadow:`0 2px 8px ${bg}55`}}>{name[0]?.toUpperCase()}</div>;
}

function Sbadge({status}){
  const c=ST_CFG[status]||{color:T.muted,bg:"#F0EFED"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",background:c.bg,color:c.color,borderRadius:99,fontSize:11.5,fontWeight:600,letterSpacing:"0.02em"}}><span style={{width:6,height:6,borderRadius:"50%",background:c.color,display:"inline-block"}}/>{status}</span>;
}

function Card({children,style={},cls=""}){ return <div className={cls} style={{background:T.white,borderRadius:18,border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05),0 8px 32px rgba(0,0,0,0.04)",...style}}>{children}</div>; }
function H({children,size=28,italic=false,style={}}){ return <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:italic?"italic":"normal",fontSize:size,fontWeight:600,color:T.text,lineHeight:1.15,...style}}>{children}</div>; }
function Lbl({children}){ return <div style={{fontSize:10.5,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{children}</div>; }

function Inp({label,...p}){ return <div style={{display:"flex",flexDirection:"column",gap:0,width:"100%"}}>{label&&<Lbl>{label}</Lbl>}<input {...p} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"Sora",color:T.text,background:"#FDFCFA",outline:"none",transition:"border 0.15s,box-shadow 0.15s",...p.style}}/></div>; }
function Sel({label,children,...p}){ return <div style={{display:"flex",flexDirection:"column",gap:0,width:"100%"}}>{label&&<Lbl>{label}</Lbl>}<select {...p} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"Sora",color:T.text,background:"#FDFCFA",outline:"none",cursor:"pointer",...p.style}}>{children}</select></div>; }
function Txta({label,...p}){ return <div style={{display:"flex",flexDirection:"column",gap:0,width:"100%"}}>{label&&<Lbl>{label}</Lbl>}<textarea {...p} style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"Sora",color:T.text,background:"#FDFCFA",outline:"none",resize:"vertical",...p.style}}/></div>; }

function Btn({children,v="gold",sm,onClick,disabled,style={}}){
  const VS={
    gold:{bg:`linear-gradient(135deg,${T.gold},${T.goldL})`,cl:"#fff",sh:`0 4px 14px ${T.gold}40`,br:"none"},
    dark:{bg:T.sidebar,cl:"#fff",sh:"0 4px 14px rgba(0,0,0,0.25)",br:"none"},
    ghost:{bg:"transparent",cl:T.text2,sh:"none",br:`1px solid ${T.borderM}`},
    danger:{bg:T.redBg,cl:T.red,sh:"none",br:`1px solid ${T.red}25`},
    success:{bg:T.greenBg,cl:T.green,sh:"none",br:`1px solid ${T.green}25`},
    wa:{bg:"#25D366",cl:"#fff",sh:"0 4px 14px #25D36640",br:"none"},
    purple:{bg:T.purpleBg,cl:T.purple,sh:"none",br:`1px solid ${T.purple}25`},
  };
  const s=VS[v]||VS.ghost;
  return <button disabled={disabled} onClick={onClick} className="btn-t" style={{background:s.bg,color:s.cl,border:s.br,boxShadow:disabled?"none":s.sh,borderRadius:10,padding:sm?"7px 14px":"11px 20px",fontSize:sm?12:14,fontWeight:600,fontFamily:"Sora",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,display:"inline-flex",alignItems:"center",gap:6,...style}}>{children}</button>;
}

function Tabs({opts,val,onChange,style={}}){
  return <div style={{display:"inline-flex",background:"rgba(0,0,0,0.06)",borderRadius:12,padding:3,gap:2,...style}}>{opts.map(o=>{const a=o===val;return <button key={o} onClick={()=>onChange(o)} style={{border:"none",borderRadius:9,padding:"8px 18px",fontSize:13,fontWeight:a?600:400,cursor:"pointer",fontFamily:"Sora",transition:"all 0.15s",background:a?T.white:"transparent",color:a?T.text:T.muted,boxShadow:a?"0 1px 5px rgba(0,0,0,0.09)":"none"}}>{o}</button>;})}</div>;
}

function Div({style={}}){ return <div style={{height:1,background:T.border,...style}}/>; }

function Spinner(){ return <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${T.gold}30`,borderTopColor:T.gold,animation:"spin 0.7s linear infinite"}}/>; }

function Toast({msg,onClose}){
  if(!msg) return null;
  return <div onClick={onClose} style={{position:"fixed",bottom:28,right:28,zIndex:9999,background:T.sidebar,color:"#fff",borderRadius:14,padding:"14px 20px 10px",minWidth:260,cursor:"pointer",boxShadow:"0 8px 40px rgba(0,0,0,0.25)",borderLeft:`3px solid ${T.gold}`,animation:"toastIn 0.3s cubic-bezier(0.22,1,0.36,1) both",fontFamily:"Sora",fontSize:14}}>{msg}<div style={{height:2,background:T.gold,borderRadius:2,marginTop:10,animation:"shrink 3s linear forwards"}}/></div>;
}

/* ════════════════════════════════════════════════ AUTO-RECALL MODAL */
function AutoRecallModal({appointment, patient, onConfirm, onDismiss}){
  const trigger = RECALL_TRIGGERS[appointment?.service];
  if(!trigger) return null;
  const dueDate = isoD(addD(now(), trigger.months*30));
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.4)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{maxWidth:400,width:"100%",padding:"28px 28px 24px"}} cls="fade-up">
        <div style={{fontSize:28,marginBottom:12,textAlign:"center"}}>🔔</div>
        <H size={20} style={{textAlign:"center",marginBottom:8}}>Schedule a Follow-up?</H>
        <div style={{fontSize:14,color:T.muted,textAlign:"center",marginBottom:20,lineHeight:1.6}}>
          {patient?.name} just completed a <strong style={{color:T.text}}>{appointment?.service}</strong>.<br/>
          Suggest a <strong style={{color:T.gold}}>{trigger.type}</strong> in {trigger.months} months?
        </div>
        <div style={{background:T.bg,borderRadius:10,padding:"12px 16px",marginBottom:20,textAlign:"center"}}>
          <div style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4}}>Recall due</div>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:22,fontWeight:600,color:T.gold}}>{fmtD(pDate(dueDate))}</div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn v="gold" onClick={()=>onConfirm({ dueDate, type:trigger.type })} style={{flex:1,justifyContent:"center"}}>✓ Create Recall</Btn>
          <Btn v="ghost" onClick={onDismiss} style={{flex:1,justifyContent:"center"}}>Skip</Btn>
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════ DASHBOARD */
function Dashboard({patients,appointments,recalls,userFullName,isMobile}){
  const pList=Object.values(patients);
  const apList=Object.values(appointments);
  const todayD=today();
  const todayAps=apList.filter(a=>{const d=new Date(a.dt);d.setHours(0,0,0,0);return d.getTime()===todayD.getTime();}).sort((a,b)=>a.dt-b.dt);
  const upcoming=apList.filter(a=>a.dt>=now()&&!["Cancelled","Completed"].includes(a.status)).sort((a,b)=>a.dt-b.dt).slice(0,5);
  const pendingR=Object.values(recalls).filter(r=>r.status==="Pending");
  const stats=[
    {label:"Patients",       val:pList.length,    icon:"👤",accent:T.blueBg},
    {label:"Today",          val:todayAps.length, icon:"📅",accent:T.amberBg},
    {label:"Pending Recalls",val:pendingR.length, icon:"🔔",accent:T.redBg},
    {label:"Completed",      val:apList.filter(a=>a.status==="Completed").length,icon:"✅",accent:T.greenBg},
  ];

  return(
    <div className="fade-up">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:isMobile?20:32,flexWrap:"wrap",gap:12}}>
        <div>
          <H size={isMobile?28:44} italic style={{lineHeight:1.05}}>Good morning,<br/>{userFullName||"LifeDent"}.</H>
          <div style={{marginTop:8,color:T.muted,fontSize:13}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
        {!isMobile&&<Card style={{padding:"18px 24px",textAlign:"right"}}>
          <div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Today</div>
          <H size={48} style={{color:T.gold,marginTop:4,lineHeight:1}}>{todayAps.length}</H>
          <div style={{fontSize:13,color:T.text2}}>appointment{todayAps.length!==1?"s":""}</div>
        </Card>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,1fr)":"repeat(4,1fr)",gap:isMobile?10:14,marginBottom:isMobile?20:24}}>
        {stats.map((s,i)=>(
          <Card key={s.label} cls={`fade-up stagger-${i+1}`} style={{padding:isMobile?"14px 16px":"20px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div>
                <H size={isMobile?26:38} style={{marginTop:4,lineHeight:1}}>{s.val}</H>
              </div>
              <div style={{width:isMobile?34:42,height:isMobile?34:42,borderRadius:12,background:s.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?16:20}}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.9fr 1fr",gap:18,marginBottom:18}}>
        <Card cls="fade-up stagger-2" style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"20px 24px 14px"}}><H size={20}>Upcoming Appointments</H></div>
          <Div/>
          {upcoming.length===0
            ?<div style={{padding:28,textAlign:"center",color:T.muted}}>No upcoming appointments.</div>
            :upcoming.map((ap,i)=>{
              const p=ap.patient||patients[ap.patientId];
              return(
                <div key={ap.id} className="row-hover" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 24px",borderBottom:i<upcoming.length-1?`1px solid ${T.border}`:"none"}}>
                  <div style={{display:"flex",gap:11,alignItems:"center"}}>
                    <Av name={p?.name||"?"} size={34}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:14}}>{p?.name||"Unknown"}</div>
                      <div style={{fontSize:12,color:T.muted}}>{ap.service} · {ap.dentist.split(" ").slice(0,2).join(" ")}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:12}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:13,fontWeight:500,color:T.text2}}>{fmtD(ap.dt)}</div>
                      <div style={{fontSize:12,color:T.muted}}>{fmtT(ap.dt)}</div>
                    </div>
                    <Sbadge status={ap.status}/>
                  </div>
                </div>
              );
            })}
        </Card>

        <Card cls="fade-up stagger-3" style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"20px 22px 14px"}}><H size={20}>Recall Alerts</H></div>
          <Div/>
          {pendingR.length===0
            ?<div style={{padding:24,textAlign:"center",color:T.muted,fontSize:14}}>No pending recalls.</div>
            :pendingR.sort((a,b)=>pDate(a.dueDate)-pDate(b.dueDate)).slice(0,5).map(r=>{
              const p=r.patient||patients[r.patientId];
              const days=Math.ceil((pDate(r.dueDate)-today())/86400000);
              return(
                <div key={r.id} style={{padding:"12px 22px",borderBottom:`1px solid ${T.border}`,borderLeft:`3px solid ${days<0?T.red:days<=3?T.amber:T.green}`}}>
                  <div style={{fontWeight:600,fontSize:14}}>{p?.name||"Unknown"}</div>
                  <div style={{fontSize:12,color:T.muted,margin:"2px 0"}}>{r.type}</div>
                  <div style={{fontSize:12,fontWeight:600,color:days<0?T.red:days<=3?T.amber:T.green}}>{days<0?`${Math.abs(days)}d overdue`:days===0?"Today":`${days}d left`}</div>
                </div>
              );
            })}
        </Card>
      </div>

      {/* Today's Timeline */}
      {todayAps.length>0&&(
        <Card cls="fade-up stagger-4" style={{padding:"20px 26px"}}>
          <H size={20} style={{marginBottom:20}}>Today's Timeline</H>
          <div style={{display:"flex",overflowX:"auto",paddingBottom:4}}>
            {todayAps.map((ap,i)=>{
              const p=ap.patient||patients[ap.patientId];
              const c=ST_CFG[ap.status]||{color:T.muted,bg:"#F0EFED"};
              return(
                <div key={ap.id} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:120,flex:1}}>
                  <div style={{display:"flex",alignItems:"center",width:"100%",marginBottom:10}}>
                    <div style={{flex:1,height:1,background:i===0?"transparent":T.border}}/>
                    <div style={{width:12,height:12,borderRadius:"50%",background:c.color,border:`2px solid ${T.white}`,boxShadow:`0 0 0 2px ${c.color}`,flexShrink:0}}/>
                    <div style={{flex:1,height:1,background:i===todayAps.length-1?"transparent":T.border}}/>
                  </div>
                  <div style={{background:c.bg,borderRadius:12,padding:"10px 10px",width:"calc(100% - 12px)",textAlign:"center"}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:600}}>{fmtT(ap.dt)}</div>
                    <div style={{margin:"6px auto 0",display:"flex",justifyContent:"center"}}><Av name={p?.name||"?"} size={26}/></div>
                    <div style={{fontSize:12,fontWeight:600,marginTop:4}}>{p?.name?.split(" ")[0]}</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:2}}>{ap.service}</div>
                    <Sbadge status={ap.status}/>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════ APPOINTMENTS */
function Appointments({patients,appointments,patchAppt,sendWAMessage,toast,canSeeClinical,addRecall,isMobile}){
  const[view,setView]=useState("Today");
  const[selId,setSelId]=useState(null);
  const[saving,setSaving]=useState(false);
  const[recallModal,setRecallModal]=useState(null); // { appointment, patient }

  const todayD=today(),tomD=addD(todayD,1);
  const rows=Object.values(appointments).filter(ap=>{
    const d=new Date(ap.dt);d.setHours(0,0,0,0);
    if(view==="Today")    return d.getTime()===todayD.getTime();
    if(view==="Tomorrow") return d.getTime()===tomD.getTime();
    return true;
  }).sort((a,b)=>a.dt-b.dt);

  const sel=selId?appointments[selId]:null;
  const selP=sel?(sel.patient||patients[sel.patientId]):null;

  const patch=async(status)=>{
    setSaving(true);
    try{
      await patchAppt(sel.id,{status});
      toast(`Marked as ${status}`);
      // Auto-recall prompt on completion
      if(status==="Completed" && RECALL_TRIGGERS[sel.service]){
        setRecallModal({appointment:sel,patient:selP});
      }
    }catch(e){toast(`Error: ${e.message}`);}
    finally{setSaving(false);}
  };

  const send=async(kind)=>{
    if(!selP?.phone){toast("No phone number for this patient.");return;}
    const body=kind==="CONFIRMATION"?WA.CONFIRMATION(selP.name,fmtD(sel.dt),fmtT(sel.dt)):WA.REMINDER(selP.name,fmtD(sel.dt),fmtT(sel.dt));
    await sendWAMessage({to:selP.phone,body,kind});
    toast("WhatsApp sent (check Messages)");
  };

  const confirmRecall=async({dueDate,type})=>{
    try{
      await addRecall({patientId:recallModal.patient?.id||recallModal.appointment.patientId,dueDate,type});
      toast("Recall created ✓");
    }catch(e){toast(`Error: ${e.message}`);}
    setRecallModal(null);
  };

  return(
    <div className="fade-up">
      {recallModal&&<AutoRecallModal appointment={recallModal.appointment} patient={recallModal.patient} onConfirm={confirmRecall} onDismiss={()=>setRecallModal(null)}/>}

      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <H size={30}>Appointments</H>
        <Tabs opts={["Today","Tomorrow","All"]} val={view} onChange={setView}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:(!isMobile&&sel)?"1fr 360px":"1fr",gap:18,alignItems:"start"}}>
        <Card style={{padding:0,overflow:"hidden"}}>
          {!isMobile&&(
            <div style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1.2fr 1.3fr 1.3fr",padding:"11px 22px",background:T.bg,borderBottom:`1px solid ${T.border}`}}>
              {["Patient","Date & Time","Service","Dentist","Status"].map(h=><div key={h} style={{fontSize:10.5,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</div>)}
            </div>
          )}
          {rows.length===0
            ?<div style={{padding:36,textAlign:"center",color:T.muted}}>No appointments for this period.</div>
            :rows.map(ap=>{
              const p=ap.patient||patients[ap.patientId];
              const active=ap.id===selId;
              if(isMobile) return(
                <div key={ap.id} onClick={()=>setSelId(active?null:ap.id)} style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,background:active?`${T.gold}08`:T.white,borderLeft:active?`3px solid ${T.gold}`:"3px solid transparent",cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:7}}>
                    <div style={{display:"flex",gap:10,alignItems:"center"}}>
                      <Av name={p?.name||"?"} size={36}/><div><div style={{fontWeight:600,fontSize:14}}>{p?.name||"Unknown"}</div><div style={{fontSize:12,color:T.muted}}>{p?.phone}</div></div>
                    </div>
                    <Sbadge status={ap.status}/>
                  </div>
                  <div style={{display:"flex",gap:14,fontSize:12,color:T.muted,paddingLeft:46}}>
                    <span>📅 {fmtD(ap.dt)}</span><span>🕐 {fmtT(ap.dt)}</span><span>{ap.service}</span>
                  </div>
                </div>
              );
              return(
                <div key={ap.id} className="row-hover" onClick={()=>setSelId(active?null:ap.id)}
                  style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1.2fr 1.3fr 1.3fr",padding:"13px 22px",cursor:"pointer",alignItems:"center",borderBottom:`1px solid ${T.border}`,background:active?`${T.gold}08`:T.white,borderLeft:active?`3px solid ${T.gold}`:"3px solid transparent",transition:"all 0.13s"}}>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}><Av name={p?.name||"?"} size={32}/><div><div style={{fontWeight:600,fontSize:14}}>{p?.name||"Unknown"}</div><div style={{fontSize:11,color:T.muted}}>{p?.phone}</div></div></div>
                  <div><div style={{fontSize:13,fontWeight:500}}>{fmtD(ap.dt)}</div><div style={{fontSize:11,color:T.muted}}>{fmtT(ap.dt)}</div></div>
                  <div style={{fontSize:13,color:T.text2}}>{ap.service}</div>
                  <div style={{fontSize:12,color:T.muted}}>{ap.dentist.split(" ").slice(0,2).join(" ")}</div>
                  <Sbadge status={ap.status}/>
                </div>
              );
            })}
        </Card>

        {sel&&(
          <Card cls="slide-right" style={{padding:0,overflow:"hidden",...(isMobile?{position:"fixed",inset:0,zIndex:200,borderRadius:0,overflowY:"auto",animation:"slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both"}:{position:"sticky",top:20})}}>
            <div style={{background:`linear-gradient(135deg,${T.sidebar},${T.sidebarL})`,padding:"22px 22px 18px",position:"relative"}}>
              <button onClick={()=>setSelId(null)} style={{position:"absolute",top:13,right:13,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              <Av name={selP?.name||"?"} size={48}/>
              <H size={20} style={{color:"#fff",marginTop:11}}>{selP?.name}</H>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.55)",marginTop:3}}>📞 {selP?.phone}</div>
              {selP?.age&&<div style={{fontSize:12,color:"rgba(255,255,255,0.45)",marginTop:2}}>{selP.age} yrs · {selP.gender||""}</div>}
              <div style={{marginTop:9}}><Sbadge status={sel.status}/></div>
            </div>
            <div style={{padding:"18px 20px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                {[["Service",sel.service],["Dentist",sel.dentist.split(" ").slice(0,2).join(" ")],["Date",fmtD(sel.dt)],["Time",fmtT(sel.dt)]].map(([k,v])=>(
                  <div key={k} style={{background:T.bg,borderRadius:9,padding:"9px 12px"}}>
                    <div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:600,color:T.text,marginTop:2}}>{v}</div>
                  </div>
                ))}
              </div>
              {sel.receptionNotes&&<div style={{background:T.amberBg,borderLeft:`3px solid ${T.amber}`,borderRadius:"0 8px 8px 0",padding:"9px 12px",fontSize:13,color:T.text2,marginBottom:12}}>📋 {sel.receptionNotes}</div>}
              {canSeeClinical&&sel.clinicalNote&&<div style={{background:T.blueBg,borderLeft:`3px solid ${T.blue}`,borderRadius:"0 8px 8px 0",padding:"9px 12px",fontSize:13,color:T.text2,marginBottom:12}}>🩺 {sel.clinicalNote}</div>}
              <Div style={{marginBottom:13}}/>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <Btn v="wa" sm onClick={()=>send("CONFIRMATION")}>💬 Send Confirmation</Btn>
                <Btn v="ghost" sm onClick={()=>send("REMINDER")}>🔔 Send Reminder</Btn>
                <Div style={{margin:"2px 0"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <Btn v="success" sm onClick={()=>patch("Confirmed")} disabled={saving}>✓ Confirmed</Btn>
                  <Btn v="purple"  sm onClick={()=>patch("Arrived")}   disabled={saving}>🚪 Arrived</Btn>
                  <Btn v="success" sm onClick={()=>patch("Completed")} disabled={saving}>☑ Completed</Btn>
                  <Btn v="danger"  sm onClick={()=>patch("No-show")}   disabled={saving}>✗ No-show</Btn>
                  <Btn v="danger"  sm onClick={()=>patch("Cancelled")} disabled={saving} style={{gridColumn:"span 2",justifyContent:"center"}}>○ Cancelled</Btn>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ NEW APPOINTMENT */
function NewAppt({patients,addPatient,addAppt,sendWAMessage,toast,setPage,isMobile,dentists=[],services=[],categories=[]}){
  // Build active lists (fall back to hardcoded constants if DB empty — first-run safety)
  const dentistList = (dentists||[]).filter(d=>d.isActive).map(d=>d.name);
  const dentistOptions = dentistList.length ? dentistList : DENTISTS;
  const serviceGroups = (services && services.length) ? groupServicesByCategory(services, categories) : null;

  const[mode,setMode]=useState("Existing");
  const[sendMsg,setSendMsg]=useState(true);
  const pList=Object.values(patients);
  const[pid,setPid]=useState(pList[0]?.id||"");
  const[name,setName]=useState(""); const[phone,setPhone]=useState("");
  const[age,setAge]=useState(""); const[gender,setGender]=useState("");
  const[pnotes,setPnotes]=useState("");
  const[apDate,setApDate]=useState(isoD(now())); const[apTime,setApTime]=useState("10:00");
  const[service,setService]=useState("Check-up");
  const[dentist,setDentist]=useState(dentistOptions[0]);
  const[recNote,setRecNote]=useState("");
  const[errors,setErrors]=useState({});
  const[saving,setSaving]=useState(false);

  const submit=async()=>{
    const errs={};let finalPid=pid;
    if(mode==="New"){
      if(!name.trim())errs.name="Required";
      if(phone.replace(/\D/g,"").length<10)errs.phone="Enter a valid Egyptian number";
      if(Object.keys(errs).length){setErrors(errs);return;}
      setSaving(true);
      try{
        const dig=phone.replace(/\D/g,"");
        const ex=await findPatientByPhone(dig);
        if(ex){finalPid=ex.id;toast("Phone exists — linked to existing patient.");}
        else{
          const p=await addPatient({name:name.trim(),phone:dig,email:"",age:age?parseInt(age):null,gender:gender||null});
          finalPid=p.id;
        }
      }catch(e){toast(`Error: ${e.message}`);setSaving(false);return;}
    }
    try{
      const dt=new Date(`${apDate}T${apTime}`);
      const ap=await addAppt({patientId:finalPid,dt,service,dentist,receptionNotes:recNote.trim()});
      if(sendMsg){
        const p=patients[finalPid]||{phone,name};
        const body=WA.CONFIRMATION(p.name||name,fmtD(dt),fmtT(dt));
        await sendWAMessage({to:p.phone||phone,body,kind:"CONFIRMATION"});
      }
      toast("Appointment created!");
      setPage("Appointments");
    }catch(e){toast(`Error: ${e.message}`);}
    finally{setSaving(false);}
  };

  return(
    <div className="fade-up">
      <H size={30} style={{marginBottom:24}}>New Appointment</H>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:18,marginBottom:16}}>
        <Card style={{padding:isMobile?"16px 14px":"24px 26px"}}>
          <H size={18} style={{marginBottom:16}}>Patient</H>
          <div style={{display:"flex",gap:8,marginBottom:18}}>
            {["Existing","New"].map(m=><Btn key={m} v={mode===m?"dark":"ghost"} sm onClick={()=>{setMode(m);setErrors({});}}>{m} Patient</Btn>)}
          </div>
          {mode==="Existing"
            ?pList.length===0?<div style={{color:T.muted,fontSize:14}}>No patients yet. Switch to New.</div>
              :<Sel label="Select Patient" value={pid} onChange={e=>setPid(e.target.value)}>{pList.map(p=><option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}</Sel>
            :<div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div><Inp label="Full Name *" value={name} onChange={e=>{setName(e.target.value);setErrors(v=>({...v,name:null}));}} placeholder="e.g. Sara Mohamed"/>{errors.name&&<div style={{color:T.red,fontSize:12,marginTop:4}}>{errors.name}</div>}</div>
              <div><Inp label="Phone *" value={phone} onChange={e=>{setPhone(e.target.value);setErrors(v=>({...v,phone:null}));}} placeholder="01012345678"/>{errors.phone&&<div style={{color:T.red,fontSize:12,marginTop:4}}>{errors.phone}</div>}{phone&&<div style={{fontSize:11,color:T.muted,marginTop:4}}>WhatsApp → {toWA(phone)}</div>}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <Inp label="Age (optional)" type="number" value={age} onChange={e=>setAge(e.target.value)} placeholder="35"/>
                <Sel label="Gender (optional)" value={gender} onChange={e=>setGender(e.target.value)}>
                  <option value="">—</option>
                  <option>Male</option><option>Female</option><option>Child</option>
                </Sel>
              </div>
              <Txta label="Notes (optional)" value={pnotes} onChange={e=>setPnotes(e.target.value)} placeholder="Allergies, anxiety, preferences…" style={{height:72}}/>
            </div>
          }
        </Card>
        <Card style={{padding:isMobile?"16px 14px":"24px 26px"}}>
          <H size={18} style={{marginBottom:16}}>Appointment Details</H>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Date" type="date" value={apDate} onChange={e=>setApDate(e.target.value)}/>
              <Inp label="Time" type="time" value={apTime} onChange={e=>setApTime(e.target.value)}/>
            </div>
            <Sel label="Service" value={service} onChange={e=>setService(e.target.value)}>
              {serviceGroups
                ? Object.entries(serviceGroups).map(([cat, list])=>(
                    <optgroup key={cat} label={cat}>
                      {list.map(s => <option key={s.id} value={s.name}>{s.name}{s.price>0?` — ${fmtEGP(s.price)}`:""}</option>)}
                    </optgroup>
                  ))
                : SERVICES.map((s,i)=>s.startsWith("──")
                    ?<option key={i} disabled style={{color:T.muted}}>{s}</option>
                    :<option key={i}>{s}</option>)
              }
            </Sel>
            <Sel label="Dentist" value={dentist} onChange={e=>setDentist(e.target.value)}>
              {dentistOptions.map(d=><option key={d}>{d}</option>)}
            </Sel>
            <Inp label="Reception Notes (optional)" value={recNote} onChange={e=>setRecNote(e.target.value)} placeholder="Patient anxious, bring X-ray…"/>
          </div>
        </Card>
      </div>
      {sendMsg&&(
        <Card style={{padding:"14px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:14,borderLeft:`3px solid ${T.wa}`,background:"#F0FAF4"}}>
          <span style={{fontSize:22}}>💬</span>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14}}>WhatsApp confirmation will be sent</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>To: {mode==="Existing"?(patients[pid]?.phone?toWA(patients[pid].phone):"—"):(phone?toWA(phone):"—")}</div></div>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:T.muted}}><input type="checkbox" checked={sendMsg} onChange={e=>setSendMsg(e.target.checked)}/> Send</label>
        </Card>
      )}
      {!sendMsg&&<div style={{marginBottom:16}}><label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:T.muted}}><input type="checkbox" checked={sendMsg} onChange={e=>setSendMsg(e.target.checked)}/> Also send WhatsApp confirmation</label></div>}
      <div style={{display:"flex",gap:12}}>
        <Btn v="gold" onClick={submit} disabled={saving}>{saving?<><Spinner/> Saving…</>:"Save Appointment"}</Btn>
        <Btn v="ghost" onClick={()=>setPage("Appointments")}>Cancel</Btn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ PATIENTS */
function Patients({patients,appointments,recalls,patchPatient,addRecall,addPatient,importPatients,toast,canSeeClinical,isMobile,role}){
  const[q,setQ]=useState("");
  const[selId,setSelId]=useState(null);
  const[tab,setTab]=useState("Overview");
  const[notes,setNotes]=useState("");
  const[saving,setSaving]=useState(false);
  const[rType,setRType]=useState("6-month check-up");
  const[rLabel,setRLabel]=useState("Follow-up");
  const[rDue,setRDue]=useState(isoD(addD(now(),30)));
  const[showImport,setShowImport]=useState(false);
  const[showAddOld,setShowAddOld]=useState(false);

  const pList=Object.values(patients);
  const filtered=q.trim()
    ? pList.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase())
        || p.phone.includes(q)
        || (p.legacyId||"").toLowerCase().includes(q.toLowerCase()))
    : pList;
  const sel=selId?patients[selId]:null;
  const selAps=sel?Object.values(appointments).filter(a=>a.patientId===sel.id).sort((a,b)=>b.dt-a.dt):[];
  const selRcls=sel?Object.values(recalls).filter(r=>r.patientId===sel.id):[];

  const open=p=>{setSelId(p.id);setNotes(p.notes||"");setTab("Overview");};

  const saveNotes=async()=>{
    setSaving(true);
    try{await patchPatient(sel.id,{notes});toast("Notes saved");}
    catch(e){toast(`Error: ${e.message}`);}
    finally{setSaving(false);}
  };

  const createRecall=async()=>{
    const months=rType==="3-month check-up"?3:rType==="6-month check-up"?6:null;
    const due=months?isoD(addD(now(),months*30)):rDue;
    const type=rType==="Custom"?rLabel:rType;
    try{await addRecall({patientId:selId,dueDate:due,type});toast("Recall created");}
    catch(e){toast(`Error: ${e.message}`);}
  };

  return(
    <div className="fade-up">
      {showImport && <ImportPatientsModal onClose={()=>setShowImport(false)} importPatients={importPatients} toast={toast}/>}
      {showAddOld && <AddOldPatientModal  onClose={()=>setShowAddOld(false)} addPatient={addPatient} toast={toast}/>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:24}}>
        <H size={30}>Patients</H>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn v="ghost" sm onClick={()=>setShowAddOld(true)}>+ Add Old Patient</Btn>
          {role==="admin" && <Btn v="dark" sm onClick={()=>setShowImport(true)}>↥ Import Excel</Btn>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:(!isMobile&&sel)?"1fr 400px":"1fr",gap:18,alignItems:"start"}}>
        <div>
          <div style={{position:"relative",marginBottom:13}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}>🔍</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name, phone, or old ID…" style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 14px 11px 40px",fontSize:14,fontFamily:"Sora",background:T.white,outline:"none",color:T.text}}/>
          </div>
          <div style={{fontSize:12,color:T.muted,marginBottom:8}}>{filtered.length} of {pList.length} patients</div>
          <Card style={{padding:0,overflow:"hidden"}}>
            {filtered.length===0?<div style={{padding:32,textAlign:"center",color:T.muted}}>No patients found.</div>
              :filtered.slice(0,200).map((p,i)=>{
                const vc=Object.values(appointments).filter(a=>a.patientId===p.id).length;
                const lastAp=Object.values(appointments).filter(a=>a.patientId===p.id).sort((a,b)=>b.dt-a.dt)[0];
                return(
                  <div key={p.id} className="row-hover" onClick={()=>open(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",cursor:"pointer",borderBottom:i<Math.min(filtered.length,200)-1?`1px solid ${T.border}`:"none",borderLeft:p.id===selId?`3px solid ${T.gold}`:"3px solid transparent",background:p.id===selId?`${T.gold}06`:T.white,transition:"all 0.13s"}}>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <Av name={p.name} size={38}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:14}}>{p.name}{p.legacyId && <span style={{marginLeft:8,fontSize:11,padding:"2px 6px",background:T.amberBg,color:T.amber,borderRadius:6,fontWeight:600}}>ID #{p.legacyId}</span>}</div>
                        <div style={{fontSize:12,color:T.muted,marginTop:2}}>📞 {p.phone}{p.age?` · ${p.age}y`:""}{p.gender?` · ${p.gender}`:""}</div>
                      </div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:12,color:T.muted}}>{vc} visit{vc!==1?"s":""}</div>
                      {lastAp&&<div style={{fontSize:11,color:T.muted,marginTop:2}}>{fmtD(lastAp.dt)}</div>}
                    </div>
                  </div>
                );
              })}
          </Card>
        </div>

        {sel&&(
          <div className="slide-right" style={{display:"flex",flexDirection:"column",gap:14,...(isMobile?{position:"fixed",inset:0,zIndex:200,overflowY:"auto",background:T.bg,padding:"0 0 100px",animation:"slideUp 0.3s cubic-bezier(0.22,1,0.36,1) both"}:{})}}>
            <Card style={{padding:0,overflow:"hidden",position:isMobile?"static":"sticky",top:20}}>
              <div style={{background:`linear-gradient(135deg,${T.sidebar},${T.sidebarL})`,padding:"22px 22px 16px",position:"relative"}}>
                <button onClick={()=>setSelId(null)} style={{position:"absolute",top:13,right:13,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:26,height:26,borderRadius:"50%",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                <Av name={sel.name} size={48}/>
                <H size={20} style={{color:"#fff",marginTop:11}}>{sel.name}</H>
                <div style={{display:"flex",gap:14,marginTop:5,fontSize:12,color:"rgba(255,255,255,0.55)",flexWrap:"wrap"}}>
                  <span>📞 {sel.phone}</span>
                  {sel.email&&<span>✉️ {sel.email}</span>}
                  {sel.age&&<span>🎂 {sel.age}y</span>}
                  {sel.gender&&<span>{sel.gender==="Male"?"👨":"sel.gender==='Female'"?"👩":"👶"} {sel.gender}</span>}
                </div>
              </div>
              <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
                {["Overview","Visits","Recalls"].map(t=>(
                  <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"12px 0",border:"none",cursor:"pointer",fontFamily:"Sora",fontSize:13,fontWeight:tab===t?600:400,color:tab===t?T.gold:T.muted,background:T.white,borderBottom:tab===t?`2px solid ${T.gold}`:"2px solid transparent",transition:"all 0.15s"}}>{t}</button>
                ))}
              </div>
              <div style={{padding:"16px 20px",maxHeight:460,overflowY:"auto"}}>
                {tab==="Overview"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:13}}>
                    {canSeeClinical
                      ?<><Txta label="Clinical Notes" value={notes} onChange={e=>setNotes(e.target.value)} style={{height:100}}/><Btn v="gold" sm onClick={saveNotes} disabled={saving}>{saving?<Spinner/>:"Save Notes"}</Btn></>
                      :<div style={{background:T.amberBg,borderLeft:`3px solid ${T.amber}`,borderRadius:"0 10px 10px 0",padding:"12px 14px",fontSize:13,color:T.text2}}>🔒 Clinical notes visible to doctors and admin only.</div>
                    }
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:4}}>
                      <div style={{background:T.bg,borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Visits</div><H size={28} style={{marginTop:4,color:T.gold}}>{selAps.length}</H></div>
                      <div style={{background:T.bg,borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Recalls</div><H size={28} style={{marginTop:4,color:T.gold}}>{selRcls.length}</H></div>
                    </div>
                  </div>
                )}
                {tab==="Visits"&&(selAps.length===0?<div style={{color:T.muted,fontSize:14,textAlign:"center",padding:"20px 0"}}>No visits yet.</div>:selAps.map(ap=>(
                  <div key={ap.id} style={{padding:"11px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:600,fontSize:14}}>{ap.service}</div><Sbadge status={ap.status}/>
                    </div>
                    <div style={{fontSize:12,color:T.muted,marginTop:3}}>{fmtDT(ap.dt)} · {ap.dentist.split(" ").slice(0,2).join(" ")}</div>
                    {canSeeClinical&&ap.clinicalNote&&<div style={{fontSize:13,color:T.text2,marginTop:5,fontStyle:"italic"}}>{ap.clinicalNote}</div>}
                  </div>
                )))}
                {tab==="Recalls"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {selRcls.map(r=>{const days=Math.ceil((pDate(r.dueDate)-today())/86400000);return <div key={r.id} style={{background:T.bg,borderRadius:10,padding:"11px 13px",borderLeft:`3px solid ${days<0?T.red:days<=3?T.amber:T.green}`}}><div style={{fontWeight:600,fontSize:13}}>{r.type}</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>{fmtD(pDate(r.dueDate))}</div><div style={{fontSize:12,fontWeight:600,marginTop:3,color:days<0?T.red:days<=3?T.amber:T.green}}>{days<0?`${Math.abs(days)}d overdue`:days===0?"Today":`${days}d left`}</div></div>;})}
                    <Div/>
                    <div style={{fontWeight:600,fontSize:13,color:T.text2,marginBottom:4}}>Add Recall</div>
                    <Sel label="Type" value={rType} onChange={e=>setRType(e.target.value)}>{["3-month check-up","6-month check-up","Custom"].map(t=><option key={t}>{t}</option>)}</Sel>
                    {rType==="Custom"&&<><Inp label="Label" value={rLabel} onChange={e=>setRLabel(e.target.value)}/><Inp label="Due Date" type="date" value={rDue} onChange={e=>setRDue(e.target.value)}/></>}
                    <Btn v="gold" sm onClick={createRecall}>+ Create Recall</Btn>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ FOLLOW-UPS */
function Followups({patients,recalls,patchRecall,sendWAMessage,toast,isMobile}){
  const[filter,setFilter]=useState("Due Soon");
  const[saving,setSaving]=useState(null);
  const todayD=today();

  const rows=Object.values(recalls).filter(r=>{
    const days=Math.ceil((pDate(r.dueDate)-todayD)/86400000);
    if(filter==="Due Soon") return r.status==="Pending"&&days<=14;
    if(filter==="Pending")  return r.status==="Pending";
    return true;
  }).sort((a,b)=>pDate(a.dueDate)-pDate(b.dueDate));

  const send=async r=>{
    const p=r.patient||patients[r.patientId];
    if(!p?.phone){toast("No phone for this patient.");return;}
    const body=WA.RECALL(p.name,r.type);
    await sendWAMessage({to:p.phone,body,kind:"RECALL"});
    try{await patchRecall(r.id,{lastSent:new Date()});}catch{}
    toast("WhatsApp recall sent");
  };

  const markDone=async id=>{
    setSaving(id);
    try{await patchRecall(id,{status:"Completed"});toast("Marked complete");}
    catch(e){toast(`Error: ${e.message}`);}
    finally{setSaving(null);}
  };

  return(
    <div className="fade-up">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24,flexWrap:"wrap",gap:12}}>
        <H size={30}>Follow-ups & Recalls</H>
        <Tabs opts={["Due Soon","Pending","All"]} val={filter} onChange={setFilter}/>
      </div>
      {rows.length===0
        ?<Card style={{padding:52,textAlign:"center"}}><div style={{fontSize:36,marginBottom:14}}>🔔</div><H size={22} style={{color:T.muted}}>No recalls in this filter</H></Card>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {rows.map(r=>{
            const p=r.patient||patients[r.patientId];
            const days=Math.ceil((pDate(r.dueDate)-todayD)/86400000);
            const urgent=days<0,soon=days>=0&&days<=3;
            const ac=urgent?T.red:soon?T.amber:T.green;
            const abg=urgent?T.redBg:soon?T.amberBg:T.greenBg;
            return(
              <Card key={r.id} style={{padding:"16px 22px",borderLeft:`4px solid ${ac}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
                  <div style={{display:"flex",gap:13,alignItems:"center"}}>
                    <Av name={p?.name||"?"} size={42}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:15}}>{p?.name||"Unknown"}</div>
                      <div style={{fontSize:13,color:T.muted,margin:"2px 0"}}>{r.type}</div>
                      <div style={{display:"flex",gap:12,alignItems:"center",marginTop:4,flexWrap:"wrap"}}>
                        <div style={{fontSize:12,color:T.muted}}>Due: {fmtD(pDate(r.dueDate))}</div>
                        <div style={{fontSize:12,fontWeight:700,color:ac,background:abg,padding:"2px 10px",borderRadius:99}}>{urgent?`${Math.abs(days)}d overdue`:days===0?"Today":`${days}d`}</div>
                        {r.lastSent&&<div style={{fontSize:11,color:T.muted}}>Sent: {fmtD(r.lastSent)}</div>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <div style={{textAlign:"right",marginRight:4}}>
                      <div style={{fontSize:12,color:T.muted}}>📞 {p?.phone}</div>
                      <div style={{fontSize:11,color:T.muted,marginTop:2}}>→ {toWA(p?.phone||"")}</div>
                    </div>
                    <Btn v="wa" sm onClick={()=>send(r)}>💬 Send</Btn>
                    {r.status==="Pending"&&<Btn v="success" sm disabled={saving===r.id} onClick={()=>markDone(r.id)}>✓ Done</Btn>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      }
    </div>
  );
}

/* ════════════════════════════════════════════════ MESSAGES */
function Messages({messages}){
  return(
    <div className="fade-up">
      <H size={30} style={{marginBottom:24}}>Message Log</H>
      {messages.length===0
        ?<Card style={{padding:52,textAlign:"center"}}><div style={{fontSize:36,marginBottom:14}}>💬</div><H size={22} style={{color:T.muted}}>No messages yet</H><div style={{color:T.muted,fontSize:14,marginTop:8}}>Send WhatsApp messages from Appointments or Follow-ups.</div></Card>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {messages.map((m,i)=>{
            const ok=m.status?.startsWith("Delivered")||m.status?.startsWith("SENT");
            const fail=m.status?.startsWith("Fail");
            const mock=m.status==="Mock";
            return(
              <Card key={m.id||i} style={{padding:"15px 20px"}}>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(37,211,102,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💬</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:9}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontWeight:600,fontSize:14}}>WhatsApp</span>
                        <span style={{fontSize:12,color:T.muted}}>→ {m.to}</span>
                        <span style={{fontSize:11,fontWeight:600,color:T.muted,background:T.bg,padding:"2px 8px",borderRadius:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>{m.kind}</span>
                      </div>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:600,color:ok?T.wa:fail?T.red:mock?T.amber:T.muted}}>{ok?"✓✓ Delivered":fail?"✗ Failed":mock?"◎ Mock":"⏳ Sending"}</span>
                        <span style={{fontSize:11,color:T.muted}}>{fmtDT(m.time)}</span>
                      </div>
                    </div>
                    <div style={{background:"#ECE5DD",borderRadius:"4px 14px 14px 14px",padding:"9px 13px",maxWidth:420,direction:"rtl",textAlign:"right"}}>
                      <div style={{fontSize:12,lineHeight:1.7,color:"#111",fontFamily:"Sora"}}>{m.body.split("\n").map((l,j)=><div key={j}>{l||<br/>}</div>)}</div>
                      <div style={{marginTop:5,fontSize:10,color:"#999",textAlign:"left",direction:"ltr"}}>{ok&&<span style={{color:T.wa}}>✓✓ </span>}{fmtT(m.time)}</div>
                    </div>
                    {m.wamid&&<div style={{fontSize:10,color:T.muted,marginTop:4}}>Message ID: {m.wamid}</div>}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      }
    </div>
  );
}

/* ════════════════════════════════════════════════ SETTINGS */
function Settings({toast}){
  // WhatsApp config is stored in Edge Function secrets — just show status here
  return(
    <div className="fade-up">
      <H size={30} style={{marginBottom:6}}>Settings</H>
      <div style={{color:T.muted,fontSize:14,marginBottom:26}}>Clinic configuration</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Card style={{padding:"24px 26px"}}>
          <H size={20} style={{marginBottom:16}}>WhatsApp Status</H>
          <div style={{padding:"14px 18px",background:T.amberBg,border:`1px solid ${T.amber}30`,borderRadius:12,marginBottom:16}}>
            <div style={{fontWeight:600,fontSize:14,color:T.text}}>⚙️ Configure via Supabase</div>
            <div style={{fontSize:13,color:T.muted,marginTop:4,lineHeight:1.6}}>WhatsApp credentials are stored securely as Supabase Edge Function secrets — never in the browser. To configure: Supabase Dashboard → Edge Functions → Manage Secrets → set <code>WA_PHONE_NUMBER_ID</code> and <code>WA_ACCESS_TOKEN</code>.</div>
          </div>
          <Btn v="ghost" onClick={()=>window.open("https://supabase.com/dashboard","_blank")}>Open Supabase Dashboard ↗</Btn>
        </Card>
        <Card style={{padding:"24px 26px"}}>
          <H size={20} style={{marginBottom:16}}>Clinic Info</H>
          <div style={{fontSize:14,color:T.text2,lineHeight:1.8}}>
            <div><strong>Lifedent Clinic</strong></div>
            <div style={{color:T.muted}}>عيادات لايف دنت لتجميل وزراعة الأسنان</div>
            <div style={{marginTop:8}}>📍 13 Mohamed Awad St., Nasr City, Cairo</div>
            <div>🕐 10:00 AM – 10:00 PM (Fri. off)</div>
            <div>📞 +201211911960</div>
          </div>
        </Card>
        <Card style={{padding:"24px 26px",background:T.sidebar,border:"none",gridColumn:"span 2"}}>
          <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:17,color:T.goldL,marginBottom:14}}>Message Templates Preview</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[
              {label:"Confirmation", body:WA.CONFIRMATION("Sara Mohamed","Tue 15 Apr","10:00 AM")},
              {label:"24h Reminder", body:WA.REMINDER("Omar Hassan","Wed 16 Apr","02:30 PM")},
              {label:"Recall",       body:WA.RECALL("Nour El-Din","6-month check-up")},
            ].map(t=>(
              <div key={t.label}>
                <div style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>{t.label}</div>
                <div style={{background:"#1A1A1A",borderRadius:20,padding:"10px 7px"}}>
                  <div style={{background:"#ECE5DD",borderRadius:13,padding:"8px 7px"}}>
                    <div style={{background:"#DCF8C6",borderRadius:"4px 11px 11px 11px",padding:"8px 11px",direction:"rtl",textAlign:"right"}}>
                      <div style={{fontSize:11,lineHeight:1.65,color:"#111"}}>{t.body.split("\n").map((l,j)=><div key={j}>{l||<br/>}</div>)}</div>
                      <div style={{fontSize:10,color:"#999",textAlign:"left",direction:"ltr",marginTop:4}}>{fmtT(now())} <span style={{color:T.wa}}>✓✓</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ IMPORT PATIENTS MODAL (v2) */
function ImportPatientsModal({onClose, importPatients, toast}){
  const[file,setFile]=useState(null);
  const[rows,setRows]=useState([]);
  const[parsing,setParsing]=useState(false);
  const[importing,setImporting]=useState(false);
  const[result,setResult]=useState(null);
  const fileRef=useRef(null);

  const downloadTemplate=()=>{
    const template=[
      ["Name","Phone","Old Patient ID","Age","Gender","Email"],
      ["Sara Mohamed","01012345678","L-1042","32","Female","sara@example.com"],
      ["Ahmed Khaled","01098765432","L-0823","45","Male",""],
      ["","","","","",""],
    ];
    const ws=XLSX.utils.aoa_to_sheet(template);
    ws["!cols"]=[{wch:25},{wch:18},{wch:18},{wch:8},{wch:10},{wch:28}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Patients");
    XLSX.writeFile(wb,"lifedent-patient-import-template.xlsx");
  };

  const onFile=async(f)=>{
    if(!f) return;
    setFile(f); setResult(null); setParsing(true);
    try{
      const buf=await f.arrayBuffer();
      const wb=XLSX.read(buf,{type:"array"});
      const ws=wb.Sheets[wb.SheetNames[0]];
      const data=XLSX.utils.sheet_to_json(ws,{defval:""});
      // Map flexible column names to our shape
      const mapped=data.map(r=>{
        const get=(...keys)=>{ for(const k of keys){ for(const ok of Object.keys(r)){ if(ok.toLowerCase().trim()===k) return r[ok]; } } return ""; };
        return {
          name:    get("name","full name","patient name").toString(),
          phone:   get("phone","mobile","mobile number","phone number","whatsapp").toString(),
          legacyId:get("old patient id","old id","patient id","legacy id","id","clinic id").toString(),
          age:     get("age").toString(),
          gender:  get("gender","sex").toString(),
          email:   get("email","e-mail").toString(),
        };
      });
      setRows(mapped);
    }catch(e){
      toast(`Parse error: ${e.message}`);
    }finally{
      setParsing(false);
    }
  };

  const runImport=async()=>{
    if(!rows.length){ toast("No rows to import"); return; }
    setImporting(true);
    try{
      const r=await importPatients(rows);
      setResult(r);
      toast(`✓ Imported ${r.created.length} · skipped ${r.skipped.length} · errors ${r.errors.length}`);
    }catch(e){ toast(`Error: ${e.message}`); }
    finally{ setImporting(false); }
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{maxWidth:720,width:"100%",maxHeight:"90vh",display:"flex",flexDirection:"column",padding:0}} cls="fade-up">
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <H size={20}>Import Patients from Excel</H>
          <button onClick={onClose} style={{border:"none",background:"transparent",fontSize:24,color:T.muted,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:"20px 24px",overflowY:"auto",flex:1}}>
          <div style={{background:T.bg,borderRadius:10,padding:14,marginBottom:16,fontSize:13,color:T.text2,lineHeight:1.6}}>
            <strong>How it works:</strong> Download the template, fill in your patient list, then upload it back. We'll skip any patient whose phone or name already exists.
          </div>
          <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
            <Btn v="ghost" sm onClick={downloadTemplate}>↓ Download Template (.xlsx)</Btn>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={e=>onFile(e.target.files?.[0])} style={{display:"none"}}/>
            <Btn v="dark" sm onClick={()=>fileRef.current?.click()}>{file?`📁 ${file.name}`:"Select File…"}</Btn>
          </div>

          {parsing && <div style={{padding:20,textAlign:"center",color:T.muted,fontSize:13}}><Spinner/> Parsing…</div>}

          {!parsing && rows.length>0 && !result && (
            <>
              <div style={{fontSize:13,color:T.muted,marginBottom:8}}>{rows.length} rows detected. Preview:</div>
              <div style={{maxHeight:220,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:10,marginBottom:14}}>
                <table style={{width:"100%",fontSize:12,borderCollapse:"collapse"}}>
                  <thead style={{background:T.bg,position:"sticky",top:0}}>
                    <tr><th style={th()}>#</th><th style={th()}>Name</th><th style={th()}>Phone</th><th style={th()}>Old ID</th><th style={th()}>Age</th><th style={th()}>Gender</th></tr>
                  </thead>
                  <tbody>
                    {rows.slice(0,40).map((r,i)=>(
                      <tr key={i} style={{borderTop:`1px solid ${T.border}`}}>
                        <td style={td()}>{i+1}</td>
                        <td style={td()}>{r.name||<span style={{color:T.red}}>—</span>}</td>
                        <td style={td()}>{r.phone||<span style={{color:T.red}}>—</span>}</td>
                        <td style={td()}>{r.legacyId||""}</td>
                        <td style={td()}>{r.age||""}</td>
                        <td style={td()}>{r.gender||""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length>40 && <div style={{padding:"8px 12px",fontSize:11,color:T.muted,background:T.bg}}>… {rows.length-40} more rows</div>}
              </div>
              <Btn v="gold" onClick={runImport} disabled={importing}>{importing?<><Spinner/> Importing…</>:`Import ${rows.length} Patients`}</Btn>
            </>
          )}

          {result && (
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                <Stat label="Imported" value={result.created.length} color={T.green} bg={T.greenBg}/>
                <Stat label="Skipped (duplicates)"  value={result.skipped.length} color={T.amber} bg={T.amberBg}/>
                <Stat label="Errors"   value={result.errors.length}   color={T.red}   bg={T.redBg}/>
              </div>
              {result.skipped.length>0 && (
                <div style={{maxHeight:120,overflowY:"auto",border:`1px solid ${T.border}`,borderRadius:8,padding:8,fontSize:12}}>
                  <strong>Skipped:</strong>
                  {result.skipped.slice(0,20).map((s,i)=>(<div key={i} style={{color:T.muted,marginTop:4}}>Row {s.row}: {s.name||s.phone} — {s.reason}</div>))}
                  {result.skipped.length>20 && <div style={{color:T.muted,marginTop:4}}>… +{result.skipped.length-20} more</div>}
                </div>
              )}
              {result.errors.length>0 && (
                <div style={{maxHeight:120,overflowY:"auto",border:`1px solid ${T.red}30`,background:T.redBg,borderRadius:8,padding:8,fontSize:12}}>
                  <strong style={{color:T.red}}>Errors:</strong>
                  {result.errors.map((e,i)=>(<div key={i} style={{color:T.red,marginTop:4}}>Row {e.row}: {e.reason}</div>))}
                </div>
              )}
              <Btn v="gold" onClick={onClose}>Done</Btn>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

const th=()=>({padding:"8px 10px",textAlign:"left",fontWeight:600,fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.05em"});
const td=()=>({padding:"7px 10px",fontSize:12,color:T.text});
function Stat({label,value,color,bg}){
  return <div style={{background:bg,borderRadius:10,padding:"12px 14px"}}>
    <div style={{fontSize:11,color,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600,marginBottom:4}}>{label}</div>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:24,fontWeight:600,color}}>{value}</div>
  </div>;
}

/* ════════════════════════════════════════════════ ADD OLD PATIENT MODAL (v2) */
function AddOldPatientModal({onClose, addPatient, toast}){
  const[name,setName]=useState("");
  const[phone,setPhone]=useState("");
  const[legacyId,setLegacyId]=useState("");
  const[age,setAge]=useState("");
  const[gender,setGender]=useState("");
  const[email,setEmail]=useState("");
  const[saving,setSaving]=useState(false);
  const[errors,setErrors]=useState({});

  const submit=async()=>{
    const errs={};
    if(!name.trim()) errs.name="Required";
    if(phone.replace(/\D/g,"").length<10) errs.phone="Enter a valid number";
    if(Object.keys(errs).length){ setErrors(errs); return; }
    setSaving(true);
    try{
      await addPatient({
        name:name.trim(), phone:phone.replace(/\D/g,""), email:email.trim(),
        age:age?parseInt(age):null, gender:gender||null,
        legacyId:legacyId.trim()||null,
      });
      toast("Old patient added");
      onClose();
    }catch(e){ toast(`Error: ${e.message}`); }
    finally{ setSaving(false); }
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{maxWidth:480,width:"100%",padding:0}} cls="fade-up">
        <div style={{padding:"20px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <H size={20}>Add Old Patient</H>
          <button onClick={onClose} style={{border:"none",background:"transparent",fontSize:24,color:T.muted,cursor:"pointer"}}>×</button>
        </div>
        <div style={{padding:"22px 24px",display:"flex",flexDirection:"column",gap:14}}>
          <div><Inp label="Full Name *" value={name} onChange={e=>{setName(e.target.value);setErrors(v=>({...v,name:null}));}} placeholder="e.g. Sara Mohamed"/>{errors.name&&<div style={{color:T.red,fontSize:12,marginTop:4}}>{errors.name}</div>}</div>
          <div><Inp label="Phone *" value={phone} onChange={e=>{setPhone(e.target.value);setErrors(v=>({...v,phone:null}));}} placeholder="01012345678"/>{errors.phone&&<div style={{color:T.red,fontSize:12,marginTop:4}}>{errors.phone}</div>}</div>
          <Inp label="Old Patient ID (from your previous system)" value={legacyId} onChange={e=>setLegacyId(e.target.value)} placeholder="e.g. L-1042"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Age (optional)" type="number" value={age} onChange={e=>setAge(e.target.value)}/>
            <Sel label="Gender (optional)" value={gender} onChange={e=>setGender(e.target.value)}>
              <option value="">—</option><option>Male</option><option>Female</option><option>Child</option>
            </Sel>
          </div>
          <Inp label="Email (optional)" value={email} onChange={e=>setEmail(e.target.value)}/>
          <div style={{display:"flex",gap:10,marginTop:6}}>
            <Btn v="gold" onClick={submit} disabled={saving}>{saving?<><Spinner/> Saving…</>:"Add Patient"}</Btn>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════ BILLING (v2) */
function Billing({patients,appointments,services,categories,invoices,addInvoice,toast,isMobile,role}){
  const[selectedAppt,setSelectedAppt]=useState(null);
  const[selectedPid,setSelectedPid]=useState("");
  const[items,setItems]=useState([]); // [{serviceId,name,category,price,quantity}]
  const[discount,setDiscount]=useState(0);
  const[paymentMethod,setPaymentMethod]=useState("Cash");
  const[notes,setNotes]=useState("");
  const[savedInvoice,setSavedInvoice]=useState(null);
  const[saving,setSaving]=useState(false);

  // Completed appointments without an invoice yet
  const completedNoInvoice = useMemo(()=>{
    const billedApptIds=new Set(invoices.map(i=>i.appointmentId).filter(Boolean));
    return Object.values(appointments)
      .filter(a=>a.status==="Completed" && !billedApptIds.has(a.id))
      .sort((a,b)=>b.dt-a.dt);
  },[appointments,invoices]);

  const serviceGroups = useMemo(()=>groupServicesByCategory(services||[],categories||[]),[services,categories]);
  const categoryById  = useMemo(()=>Object.fromEntries((categories||[]).map(c=>[c.id,c])),[categories]);
  const serviceById   = useMemo(()=>Object.fromEntries((services||[]).map(s=>[s.id,s])),[services]);

  const subtotal = items.reduce((sum,it)=>sum+(Number(it.price)||0)*(parseInt(it.quantity)||1),0);
  const total    = Math.max(0,subtotal-(Number(discount)||0));

  const onSelectAppt=(ap)=>{
    setSelectedAppt(ap);
    setSelectedPid(ap.patientId);
    // Pre-populate one line item from the appointment service if it matches
    const matchedSvc=(services||[]).find(s=>s.name===ap.service);
    if(matchedSvc){
      setItems([{serviceId:matchedSvc.id,name:matchedSvc.name,category:categoryById[matchedSvc.categoryId]?.name||"",price:matchedSvc.price,quantity:1}]);
    }else{
      setItems([{serviceId:null,name:ap.service||"Service",category:"",price:0,quantity:1}]);
    }
    setDiscount(0); setPaymentMethod("Cash"); setNotes(""); setSavedInvoice(null);
  };

  const startManual=()=>{
    setSelectedAppt(null);
    setSelectedPid(Object.values(patients)[0]?.id||"");
    setItems([{serviceId:null,name:"",category:"",price:0,quantity:1}]);
    setDiscount(0); setPaymentMethod("Cash"); setNotes(""); setSavedInvoice(null);
  };

  const addLine=()=>setItems(prev=>[...prev,{serviceId:null,name:"",category:"",price:0,quantity:1}]);
  const updateLine=(i,patch)=>setItems(prev=>prev.map((it,idx)=>idx===i?{...it,...patch}:it));
  const removeLine=(i)=>setItems(prev=>prev.filter((_,idx)=>idx!==i));

  const onPickService=(i,svcId)=>{
    if(!svcId){ updateLine(i,{serviceId:null,name:"",category:"",price:0}); return; }
    const s=serviceById[svcId];
    if(!s) return;
    updateLine(i,{serviceId:s.id,name:s.name,category:categoryById[s.categoryId]?.name||"",price:s.price});
  };

  const saveInvoice=async(thenPrint=false)=>{
    if(!selectedPid){ toast("Select a patient"); return; }
    const validItems=items.filter(it=>it.name && it.name.trim());
    if(!validItems.length){ toast("Add at least one service"); return; }
    setSaving(true);
    try{
      const patient=patients[selectedPid];
      const inv=await addInvoice({
        appointmentId: selectedAppt?.id||null,
        patient,
        dentistName: selectedAppt?.dentist || "",
        items: validItems,
        discount: Number(discount)||0,
        paymentMethod, notes,
      });
      setSavedInvoice(inv);
      toast(`Invoice ${inv.number} created`);
      if(thenPrint) setTimeout(()=>printInvoice(inv,patient),200);
    }catch(e){ toast(`Error: ${e.message}`); }
    finally{ setSaving(false); }
  };

  if(savedInvoice){
    const p=patients[selectedPid]||{name:savedInvoice.patientName,phone:savedInvoice.patientPhone};
    return(
      <div className="fade-up">
        <H size={30} style={{marginBottom:24}}>Invoice Created</H>
        <Card style={{padding:24,maxWidth:520}}>
          <div style={{textAlign:"center",marginBottom:18}}>
            <div style={{fontSize:36,marginBottom:8}}>✅</div>
            <H size={22}>Invoice #{savedInvoice.number}</H>
            <div style={{color:T.muted,fontSize:13,marginTop:6}}>{p.name} · {fmtEGP(savedInvoice.total)}</div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <Btn v="gold" onClick={()=>printInvoice(savedInvoice,p)}>🖨 Print Invoice</Btn>
            <Btn v="ghost" onClick={()=>{setSavedInvoice(null);setSelectedAppt(null);setSelectedPid("");setItems([]);}}>+ New Invoice</Btn>
          </div>
        </Card>
      </div>
    );
  }

  return(
    <div className="fade-up">
      <H size={30} style={{marginBottom:8}}>Billing</H>
      <div style={{color:T.muted,fontSize:13,marginBottom:20}}>Create invoices from completed appointments or as walk-ins.</div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.4fr",gap:18,alignItems:"start"}}>
        {/* LEFT: Pending appointments */}
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:600}}>Awaiting Invoice</div>
            <Btn v="ghost" sm onClick={startManual}>+ Walk-in</Btn>
          </div>
          {completedNoInvoice.length===0
            ? <div style={{padding:24,textAlign:"center",color:T.muted,fontSize:13}}>No pending invoices.</div>
            : completedNoInvoice.slice(0,30).map((ap,i)=>(
              <div key={ap.id} className="row-hover" onClick={()=>onSelectAppt(ap)}
                style={{padding:"12px 18px",cursor:"pointer",borderBottom:i<Math.min(completedNoInvoice.length,30)-1?`1px solid ${T.border}`:"none",borderLeft:selectedAppt?.id===ap.id?`3px solid ${T.gold}`:"3px solid transparent",background:selectedAppt?.id===ap.id?`${T.gold}06`:"transparent"}}>
                <div style={{fontWeight:600,fontSize:13}}>{ap.patient?.name||"—"}{ap.patient?.legacyId&&<span style={{marginLeft:6,fontSize:10,padding:"1px 5px",background:T.amberBg,color:T.amber,borderRadius:4}}>#{ap.patient.legacyId}</span>}</div>
                <div style={{fontSize:11,color:T.muted,marginTop:3}}>{ap.service} · {fmtD(ap.dt)} · {ap.dentist}</div>
              </div>
            ))
          }
        </Card>

        {/* RIGHT: Invoice builder */}
        <Card style={{padding:isMobile?"16px 14px":"22px 24px"}}>
          {!selectedPid ? (
            <div style={{textAlign:"center",padding:"40px 20px",color:T.muted}}>
              <div style={{fontSize:32,marginBottom:8}}>📄</div>
              <div style={{fontSize:14}}>Pick a completed appointment from the left, or click "+ Walk-in" to start a new invoice.</div>
            </div>
          ) : (
            <>
              <H size={18} style={{marginBottom:12}}>Invoice Details</H>
              {!selectedAppt && (
                <Sel label="Patient" value={selectedPid} onChange={e=>setSelectedPid(e.target.value)} style={{marginBottom:14}}>
                  {Object.values(patients).map(p=>(
                    <option key={p.id} value={p.id}>{p.name} — {p.phone}{p.legacyId?` · #${p.legacyId}`:""}</option>
                  ))}
                </Sel>
              )}
              {selectedAppt && (
                <div style={{background:T.bg,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:T.muted}}>
                  Linked to: <strong style={{color:T.text}}>{selectedAppt.patient?.name}</strong> · {fmtD(selectedAppt.dt)} · {selectedAppt.dentist}
                </div>
              )}

              {/* Line items */}
              <div style={{marginBottom:8}}><Lbl>Services</Lbl></div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
                {items.map((it,i)=>(
                  <div key={i} style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"2fr 70px 100px 26px",gap:8,alignItems:"end"}}>
                    <Sel value={it.serviceId||"__custom"} onChange={e=>{ if(e.target.value==="__custom"){updateLine(i,{serviceId:null});}else{onPickService(i,e.target.value);} }}>
                      <option value="__custom">— Custom / type below —</option>
                      {Object.entries(serviceGroups).map(([cat,list])=>(
                        <optgroup key={cat} label={cat}>{list.map(s=><option key={s.id} value={s.id}>{s.name}{s.price>0?` · ${fmtEGP(s.price)}`:""}</option>)}</optgroup>
                      ))}
                    </Sel>
                    {!it.serviceId && (
                      <input value={it.name} onChange={e=>updateLine(i,{name:e.target.value})} placeholder="Service name" style={{gridColumn:isMobile?"1":"1 / span 1",border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"Sora"}}/>
                    )}
                    <input type="number" min="1" value={it.quantity} onChange={e=>updateLine(i,{quantity:e.target.value})} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"Sora",textAlign:"center"}}/>
                    <input type="number" min="0" value={it.price} onChange={e=>updateLine(i,{price:e.target.value})} placeholder="Price" style={{border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 10px",fontSize:13,fontFamily:"Sora"}}/>
                    <button onClick={()=>removeLine(i)} title="Remove" style={{border:"none",background:"transparent",color:T.red,fontSize:18,cursor:"pointer",padding:0}}>×</button>
                  </div>
                ))}
              </div>
              <Btn v="ghost" sm onClick={addLine} style={{marginBottom:16}}>+ Add line</Btn>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <Inp label="Discount (EGP)" type="number" value={discount} onChange={e=>setDiscount(e.target.value)}/>
                <Sel label="Payment Method" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>
                  {PAY_METHODS.map(m=><option key={m}>{m}</option>)}
                </Sel>
              </div>
              <Txta label="Notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} style={{height:54,marginBottom:16}}/>

              {/* Totals */}
              <div style={{background:T.bg,borderRadius:10,padding:"14px 18px",marginBottom:16,fontFamily:"Sora"}}>
                <Row label="Subtotal" value={fmtEGP(subtotal)}/>
                {(Number(discount)||0)>0 && <Row label="Discount" value={`− ${fmtEGP(discount)}`} color={T.red}/>}
                <div style={{height:1,background:T.border,margin:"8px 0"}}/>
                <Row label="TOTAL" value={fmtEGP(total)} big/>
              </div>

              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                <Btn v="gold" onClick={()=>saveInvoice(true)} disabled={saving}>{saving?<><Spinner/> Saving…</>:"Save & Print"}</Btn>
                <Btn v="ghost" onClick={()=>saveInvoice(false)} disabled={saving}>Save Without Printing</Btn>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Recent invoices */}
      {invoices.length>0 && (
        <div style={{marginTop:28}}>
          <H size={20} style={{marginBottom:12}}>Recent Invoices</H>
          <Card style={{padding:0,overflow:"hidden"}}>
            {invoices.slice(0,15).map((inv,i)=>(
              <div key={inv.id} className="row-hover" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderBottom:i<14?`1px solid ${T.border}`:"none"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>#{inv.number} · {inv.patientName}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:3}}>{fmtDT(inv.paidAt)} · {inv.paymentMethod} · {inv.items.length} item{inv.items.length!==1?"s":""}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:14}}>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:T.gold}}>{fmtEGP(inv.total)}</div>
                  <Btn v="ghost" sm onClick={()=>printInvoice(inv,{name:inv.patientName,phone:inv.patientPhone,legacyId:inv.patientLegacyId})}>🖨</Btn>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}

function Row({label,value,color,big}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,fontSize:big?16:13,fontWeight:big?700:400,color:color||T.text}}>
    <span style={{color:T.muted}}>{label}</span><span>{value}</span>
  </div>;
}

// Print invoice in a popup window with full Lifedent branding
function printInvoice(inv, patient){
  const items = inv.items || [];
  const itemsHtml = items.map(it => `
    <tr>
      <td>${escapeHtml(it.name)}${it.category?`<div class="cat">${escapeHtml(it.category)}</div>`:""}</td>
      <td class="qty">${it.quantity}</td>
      <td class="num">${fmtEGP(it.price)}</td>
      <td class="num">${fmtEGP(it.lineTotal)}</td>
    </tr>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${inv.number}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Sora:wght@300;400;500;600&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Sora',sans-serif;color:#1A1614;padding:32px;font-size:13px;background:#fff}
    .head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:30px;padding-bottom:20px;border-bottom:2px solid #B8832E}
    .logo{height:64px}
    .clinic{text-align:right;font-size:11px;color:#666;line-height:1.6}
    h1{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:600;color:#1A1614;margin-bottom:4px}
    .num{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:600;color:#B8832E}
    .meta{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-bottom:24px}
    .label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#888;font-weight:600;margin-bottom:4px}
    .val{font-size:13px;color:#1A1614}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{text-align:left;padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#888;border-bottom:1px solid #ddd;font-weight:600}
    td{padding:11px 12px;border-bottom:1px solid #eee;vertical-align:top}
    td.qty,th.qty{text-align:center;width:60px}
    td.num,th.num{text-align:right;font-family:'Cormorant Garamond',serif;font-weight:600;width:120px}
    .cat{font-size:10px;color:#888;margin-top:2px}
    .totals{margin-left:auto;width:280px;margin-top:14px}
    .totals .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px}
    .totals .row.total{font-size:18px;font-weight:700;border-top:2px solid #1A1614;padding-top:10px;margin-top:8px;font-family:'Cormorant Garamond',serif;color:#B8832E}
    .pay{margin-top:30px;padding:14px 18px;background:#F5F0E6;border-radius:10px;font-size:12px;display:flex;justify-content:space-between}
    .pay strong{color:#B8832E}
    .footer{margin-top:40px;padding-top:18px;border-top:1px solid #eee;font-size:11px;color:#888;text-align:center;line-height:1.6}
    @media print{body{padding:18px}}
  </style></head><body>
  <div class="head">
    <div>
      <img src="${window.location.origin}/logo.png" class="logo" alt="Lifedent"/>
    </div>
    <div class="clinic">
      <strong style="color:#1A1614;font-size:13px;display:block;margin-bottom:4px">Lifedent Dental Clinic</strong>
      13 Mohamed Awad St., Nasr City, Cairo<br/>
      +20 121 191 1960 · info@lifedent.net
    </div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px">
    <div>
      <h1>Invoice</h1>
      <div style="font-family:'Cormorant Garamond',serif;font-size:20px;color:#B8832E;font-weight:600">#${inv.number}</div>
    </div>
    <div style="text-align:right">
      <div class="label">Date</div>
      <div class="val">${inv.paidAt.toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div>
    </div>
  </div>

  <div class="meta">
    <div>
      <div class="label">Bill To</div>
      <div class="val"><strong>${escapeHtml(patient?.name||inv.patientName||"")}</strong></div>
      <div class="val" style="color:#666;font-size:12px;margin-top:2px">${escapeHtml(patient?.phone||inv.patientPhone||"")}${(patient?.legacyId||inv.patientLegacyId)?` · ID #${escapeHtml(patient?.legacyId||inv.patientLegacyId)}`:""}</div>
    </div>
    ${inv.dentistName?`<div><div class="label">Dentist</div><div class="val">${escapeHtml(inv.dentistName)}</div></div>`:""}
  </div>

  <table>
    <thead><tr><th>Service</th><th class="qty">Qty</th><th class="num">Price</th><th class="num">Total</th></tr></thead>
    <tbody>${itemsHtml}</tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${fmtEGP(inv.subtotal)}</span></div>
    ${inv.discount>0?`<div class="row" style="color:#C03838"><span>Discount</span><span>− ${fmtEGP(inv.discount)}</span></div>`:""}
    <div class="row total"><span>TOTAL</span><span>${fmtEGP(inv.total)}</span></div>
  </div>

  <div class="pay"><span>Payment Method</span><strong>${escapeHtml(inv.paymentMethod)}</strong></div>
  ${inv.notes?`<div style="margin-top:14px;padding:12px 16px;background:#FAF8F4;border-radius:8px;font-size:12px;color:#666"><strong style="color:#1A1614">Notes:</strong> ${escapeHtml(inv.notes)}</div>`:""}

  <div class="footer">
    Thank you for choosing Lifedent Dental Clinic.<br/>
    شكراً لاختياركم عيادة لايف دنت لتجميل وزراعة الأسنان.
  </div>

  <script>window.onload=()=>{setTimeout(()=>window.print(),250);};</script>
  </body></html>`;

  const w = window.open("", "_blank", "width=820,height=1000");
  if(!w){ alert("Pop-up blocked. Allow pop-ups to print."); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
function escapeHtml(s){ return String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

/* ════════════════════════════════════════════════ REVENUE (v2) */
function Revenue({invoices,isMobile}){
  const presets = dateRangePresets();
  const[preset,setPreset]=useState("This Month");
  const[customFrom,setCustomFrom]=useState(isoD(startOfMonth(new Date())));
  const[customTo,  setCustomTo]  =useState(isoD(new Date()));
  const[useCustom,setUseCustom]=useState(false);

  const range = useMemo(()=>{
    if(useCustom) return { from:startOfDay(new Date(customFrom)), to:endOfDay(new Date(customTo)) };
    return presets.find(p=>p.label===preset) || presets[2];
  },[preset,customFrom,customTo,useCustom]);

  const filtered = useMemo(()=>
    invoices.filter(inv => inv.paidAt >= range.from && inv.paidAt <= range.to),
  [invoices,range]);

  const totalRevenue = filtered.reduce((s,i)=>s+i.total, 0);
  const numInvoices  = filtered.length;
  const avgInvoice   = numInvoices ? totalRevenue/numInvoices : 0;
  const numPatients  = new Set(filtered.map(i=>i.patientId).filter(Boolean)).size;

  // Breakdown by category
  const byCategory = useMemo(()=>{
    const m={};
    filtered.forEach(inv=>inv.items.forEach(it=>{
      const c=it.category||"Uncategorized";
      m[c]=(m[c]||0)+(it.lineTotal||0);
    }));
    return Object.entries(m).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total);
  },[filtered]);

  // Breakdown by dentist
  const byDentist = useMemo(()=>{
    const m={};
    filtered.forEach(inv=>{ const d=inv.dentistName||"Unassigned"; m[d]=(m[d]||0)+(inv.total||0); });
    return Object.entries(m).map(([name,total])=>({name,total})).sort((a,b)=>b.total-a.total);
  },[filtered]);

  const maxCat = Math.max(1, ...byCategory.map(c=>c.total));
  const maxDent= Math.max(1, ...byDentist.map(d=>d.total));

  return(
    <div className="fade-up">
      <H size={30} style={{marginBottom:8}}>Revenue</H>
      <div style={{color:T.muted,fontSize:13,marginBottom:20}}>{fmtD(range.from)} → {fmtD(range.to)}</div>

      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:18,alignItems:"center"}}>
        {presets.map(p=>(
          <button key={p.label} onClick={()=>{setPreset(p.label);setUseCustom(false);}}
            style={{border:"none",borderRadius:9,padding:"7px 14px",fontSize:12,fontWeight:!useCustom&&preset===p.label?600:400,cursor:"pointer",fontFamily:"Sora",
                    background:!useCustom&&preset===p.label?T.sidebar:"rgba(0,0,0,0.05)",
                    color:!useCustom&&preset===p.label?"#fff":T.text2}}>{p.label}</button>
        ))}
        <span style={{width:1,height:20,background:T.border,margin:"0 4px"}}/>
        <input type="date" value={customFrom} onChange={e=>{setCustomFrom(e.target.value);setUseCustom(true);}} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:12,fontFamily:"Sora",background:useCustom?T.white:T.bg}}/>
        <span style={{color:T.muted}}>→</span>
        <input type="date" value={customTo} onChange={e=>{setCustomTo(e.target.value);setUseCustom(true);}} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:12,fontFamily:"Sora",background:useCustom?T.white:T.bg}}/>
      </div>

      {/* KPI cards */}
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:24}}>
        <KPI label="Total Revenue" value={fmtEGP(totalRevenue)} accent={T.gold}/>
        <KPI label="# Invoices"    value={numInvoices}/>
        <KPI label="Avg / Invoice" value={fmtEGP(avgInvoice)}/>
        <KPI label="# Patients"    value={numPatients}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:18}}>
        <Card style={{padding:"20px 22px"}}>
          <H size={18} style={{marginBottom:14}}>Revenue by Category</H>
          {byCategory.length===0
            ? <div style={{color:T.muted,fontSize:13,padding:"20px 0"}}>No data for this period.</div>
            : byCategory.map(c=>(
                <div key={c.name} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                    <span style={{fontWeight:500}}>{c.name}</span>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:600,color:T.gold}}>{fmtEGP(c.total)}</span>
                  </div>
                  <div style={{height:8,background:T.bg,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(c.total/maxCat*100).toFixed(1)}%`,background:`linear-gradient(90deg,${T.gold},${T.goldL})`,borderRadius:4}}/>
                  </div>
                </div>
              ))
          }
        </Card>

        <Card style={{padding:"20px 22px"}}>
          <H size={18} style={{marginBottom:14}}>Revenue by Dentist</H>
          {byDentist.length===0
            ? <div style={{color:T.muted,fontSize:13,padding:"20px 0"}}>No data for this period.</div>
            : byDentist.map(d=>(
                <div key={d.name} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                    <span style={{fontWeight:500}}>{d.name}</span>
                    <span style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:600,color:T.green}}>{fmtEGP(d.total)}</span>
                  </div>
                  <div style={{height:8,background:T.bg,borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${(d.total/maxDent*100).toFixed(1)}%`,background:`linear-gradient(90deg,${T.green},#52B788)`,borderRadius:4}}/>
                  </div>
                </div>
              ))
          }
        </Card>
      </div>

      {/* Invoice list */}
      <div style={{marginTop:24}}>
        <H size={18} style={{marginBottom:12}}>Invoices in Period</H>
        <Card style={{padding:0,overflow:"hidden"}}>
          {filtered.length===0
            ? <div style={{padding:32,textAlign:"center",color:T.muted}}>No invoices in this period.</div>
            : filtered.slice(0,50).map((inv,i)=>(
              <div key={inv.id} className="row-hover" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderBottom:i<Math.min(filtered.length,50)-1?`1px solid ${T.border}`:"none"}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600}}>#{inv.number} · {inv.patientName}</div>
                  <div style={{fontSize:11,color:T.muted,marginTop:3}}>{fmtDT(inv.paidAt)} · {inv.dentistName||"—"} · {inv.paymentMethod}</div>
                </div>
                <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:T.gold}}>{fmtEGP(inv.total)}</div>
              </div>
            ))
          }
          {filtered.length>50 && <div style={{padding:"10px 18px",fontSize:11,color:T.muted,textAlign:"center",background:T.bg}}>Showing 50 of {filtered.length}</div>}
        </Card>
      </div>
    </div>
  );
}

function KPI({label,value,accent}){
  return <Card style={{padding:"16px 18px"}}>
    <div style={{fontSize:11,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600,marginBottom:6}}>{label}</div>
    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600,color:accent||T.text}}>{value}</div>
  </Card>;
}

/* ════════════════════════════════════════════════ ADMIN PANEL (v2) */
function AdminPanel({ toast, dentists, categories, services, isMobile,
  addDentist, patchDentist, removeDentist,
  addCategory, patchCategory, removeCategory,
  addService,  patchService,  removeService }){

  const[tab,setTab]=useState("Users");
  const tabs=["Users","Dentists","Services & Prices"];

  return(
    <div className="fade-up">
      <H size={30} style={{marginBottom:8}}>Admin Panel</H>
      <div style={{color:T.muted,fontSize:13,marginBottom:20}}>Manage clinic staff, dentists, and service catalog.</div>
      <Tabs opts={tabs} val={tab} onChange={setTab} style={{marginBottom:20}}/>
      {tab==="Users"             && <AdminUsers toast={toast}/>}
      {tab==="Dentists"          && <AdminDentists dentists={dentists} addDentist={addDentist} patchDentist={patchDentist} removeDentist={removeDentist} toast={toast} isMobile={isMobile}/>}
      {tab==="Services & Prices" && <AdminServices categories={categories} services={services} addCategory={addCategory} patchCategory={patchCategory} removeCategory={removeCategory} addService={addService} patchService={patchService} removeService={removeService} toast={toast} isMobile={isMobile}/>}
    </div>
  );
}

function AdminUsers({toast}){
  const[users,setUsers]=useState([]);
  const[loading,setLoading]=useState(true);
  const[showInvite,setShowInvite]=useState(false);
  const[showResetFor,setShowResetFor]=useState(null);

  const reload=async()=>{
    setLoading(true);
    try{ const list=await getProfiles(); setUsers(list); }
    catch(e){ toast(`Error: ${e.message}`); }
    finally{ setLoading(false); }
  };
  useEffect(()=>{ reload(); },[]);

  const onChangeRole=async(u,role)=>{
    try{ await adminUpdateUserRole(u.id,role); toast("Role updated"); reload(); }
    catch(e){ toast(`Error: ${e.message}`); }
  };
  const onToggleActive=async(u)=>{
    try{ await adminSetUserActive(u.id,!u.isActive); toast(u.isActive?"User deactivated":"User activated"); reload(); }
    catch(e){ toast(`Error: ${e.message}`); }
  };

  return(
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:600}}>{users.length} user{users.length!==1?"s":""}</div>
        <Btn v="gold" sm onClick={()=>setShowInvite(true)}>+ Invite User</Btn>
      </div>
      {loading && <div style={{padding:30,textAlign:"center"}}><Spinner/></div>}
      {!loading && users.length===0 && <div style={{padding:30,textAlign:"center",color:T.muted}}>No users yet.</div>}
      {!loading && users.map((u,i)=>(
        <div key={u.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:i<users.length-1?`1px solid ${T.border}`:"none",opacity:u.isActive?1:0.5}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <Av name={u.fullName||u.email||"?"} size={36}/>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{u.fullName||"—"}</div>
              <div style={{fontSize:11,color:T.muted,marginTop:2}}>{u.email}</div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <select value={u.role} onChange={e=>onChangeRole(u,e.target.value)} style={{border:`1px solid ${T.border}`,borderRadius:8,padding:"5px 8px",fontSize:12,fontFamily:"Sora",background:T.white}}>
              <option value="admin">Admin</option><option value="dentist">Dentist</option><option value="receptionist">Receptionist</option>
            </select>
            <Btn v="ghost" sm onClick={()=>setShowResetFor(u)}>Reset PW</Btn>
            <Btn v={u.isActive?"danger":"success"} sm onClick={()=>onToggleActive(u)}>{u.isActive?"Deactivate":"Activate"}</Btn>
          </div>
        </div>
      ))}
      {showInvite && <InviteUserModal onClose={()=>setShowInvite(false)} toast={toast} reload={reload}/>}
      {showResetFor && <ResetPasswordModal user={showResetFor} onClose={()=>setShowResetFor(null)} toast={toast}/>}
    </Card>
  );
}

function InviteUserModal({onClose, toast, reload}){
  const[email,setEmail]=useState(""); const[password,setPassword]=useState("");
  const[fullName,setFullName]=useState(""); const[role,setRole]=useState("receptionist");
  const[saving,setSaving]=useState(false);
  const submit=async()=>{
    if(!email||!password||password.length<6){ toast("Email and password (min 6 chars) required"); return; }
    setSaving(true);
    try{ await adminCreateUser({email,password,fullName,role}); toast("User invited"); reload(); onClose(); }
    catch(e){ toast(`Error: ${e.message}`); }
    finally{ setSaving(false); }
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{maxWidth:440,width:"100%",padding:"22px 24px"}} cls="fade-up">
        <H size={20} style={{marginBottom:16}}>Invite New User</H>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Inp label="Full Name" value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="e.g. Mona Hassan"/>
          <Inp label="Email *" value={email} onChange={e=>setEmail(e.target.value)} placeholder="staff@lifedent.net"/>
          <Inp label="Temporary Password *" type="text" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 chars"/>
          <Sel label="Role *" value={role} onChange={e=>setRole(e.target.value)}>
            <option value="receptionist">Receptionist</option><option value="dentist">Dentist</option><option value="admin">Admin</option>
          </Sel>
          <div style={{fontSize:11,color:T.muted,lineHeight:1.5}}>The user can change their password after first login.</div>
          <div style={{display:"flex",gap:10,marginTop:6}}>
            <Btn v="gold" onClick={submit} disabled={saving}>{saving?<><Spinner/> Creating…</>:"Create User"}</Btn>
            <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ResetPasswordModal({user, onClose, toast}){
  const[password,setPassword]=useState("");
  const[saving,setSaving]=useState(false);
  const submit=async()=>{
    if(!password||password.length<6){ toast("Password must be 6+ chars"); return; }
    setSaving(true);
    try{ await adminResetPassword(user.id,password); toast("Password reset"); onClose(); }
    catch(e){ toast(`Error: ${e.message}`); }
    finally{ setSaving(false); }
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <Card style={{maxWidth:380,width:"100%",padding:"22px 24px"}} cls="fade-up">
        <H size={20} style={{marginBottom:8}}>Reset Password</H>
        <div style={{fontSize:13,color:T.muted,marginBottom:16}}>For {user.fullName||user.email}</div>
        <Inp label="New Password" type="text" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 chars"/>
        <div style={{display:"flex",gap:10,marginTop:14}}>
          <Btn v="gold" onClick={submit} disabled={saving}>{saving?"Saving…":"Reset"}</Btn>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </Card>
    </div>
  );
}

function AdminDentists({dentists, addDentist, patchDentist, removeDentist, toast}){
  const[showAdd,setShowAdd]=useState(false);
  const[name,setName]=useState(""); const[specialty,setSpecialty]=useState("");

  const submit=async()=>{
    if(!name.trim()){ toast("Name required"); return; }
    try{ await addDentist({name:name.trim(),specialty:specialty.trim(),sortOrder:(dentists.length+1)*10});
      toast("Dentist added"); setName(""); setSpecialty(""); setShowAdd(false);
    }catch(e){ toast(`Error: ${e.message}`); }
  };
  const onToggle=async(d)=>{
    try{ await patchDentist(d.id,{isActive:!d.isActive}); }catch(e){ toast(`Error: ${e.message}`); }
  };
  const onRemove=async(d)=>{
    if(!confirm(`Remove ${d.name}? This won't affect existing appointments.`)) return;
    try{ await removeDentist(d.id); toast("Dentist removed"); }catch(e){ toast(`Error: ${e.message}`); }
  };

  return(
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,fontWeight:600}}>{dentists.length} dentist{dentists.length!==1?"s":""}</div>
        {!showAdd && <Btn v="gold" sm onClick={()=>setShowAdd(true)}>+ Add Dentist</Btn>}
      </div>
      {showAdd && (
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${T.border}`,background:T.bg,display:"flex",gap:8,alignItems:"end",flexWrap:"wrap"}}>
          <Inp label="Name *" value={name} onChange={e=>setName(e.target.value)} placeholder="Dr. ..." style={{minWidth:200}}/>
          <Inp label="Specialty (optional)" value={specialty} onChange={e=>setSpecialty(e.target.value)} placeholder="e.g. Orthodontist"/>
          <Btn v="gold" sm onClick={submit}>Add</Btn>
          <Btn v="ghost" sm onClick={()=>{setShowAdd(false);setName("");setSpecialty("");}}>Cancel</Btn>
        </div>
      )}
      {dentists.map((d,i)=>(
        <div key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",borderBottom:i<dentists.length-1?`1px solid ${T.border}`:"none",opacity:d.isActive?1:0.5}}>
          <div>
            <div style={{fontSize:13,fontWeight:600}}>{d.name}</div>
            {d.specialty && <div style={{fontSize:11,color:T.muted,marginTop:2}}>{d.specialty}</div>}
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn v={d.isActive?"success":"ghost"} sm onClick={()=>onToggle(d)}>{d.isActive?"Active":"Inactive"}</Btn>
            <Btn v="danger" sm onClick={()=>onRemove(d)}>Remove</Btn>
          </div>
        </div>
      ))}
    </Card>
  );
}

function AdminServices({categories, services, addCategory, patchCategory, removeCategory, addService, patchService, removeService, toast}){
  const[newCatName,setNewCatName]=useState("");
  const[showCatAdd,setShowCatAdd]=useState(false);
  const[addingTo,setAddingTo]=useState(null); // category id we're adding a service to
  const[newSvc,setNewSvc]=useState({name:"",price:""});

  const grouped=useMemo(()=>{
    const m=new Map();
    categories.forEach(c=>m.set(c.id,{cat:c,list:[]}));
    services.forEach(s=>{ if(m.has(s.categoryId)) m.get(s.categoryId).list.push(s); else { if(!m.has("__none")) m.set("__none",{cat:{id:"__none",name:"Uncategorized"},list:[]}); m.get("__none").list.push(s); } });
    return Array.from(m.values());
  },[categories,services]);

  const onPriceBlur=async(s,val)=>{
    const newPrice=Number(val)||0;
    if(newPrice===s.price) return;
    try{ await patchService(s.id,{price:newPrice}); toast(`Price updated`); }catch(e){ toast(`Error: ${e.message}`); }
  };
  const onRenameSvc=async(s,name)=>{
    if(!name||name===s.name) return;
    try{ await patchService(s.id,{name}); }catch(e){ toast(`Error: ${e.message}`); }
  };
  const onAddCategory=async()=>{
    if(!newCatName.trim()){ return; }
    try{ await addCategory({name:newCatName.trim(),sortOrder:(categories.length+1)*10}); setNewCatName(""); setShowCatAdd(false); toast("Category added"); }
    catch(e){ toast(`Error: ${e.message}`); }
  };
  const onRemoveCategory=async(c)=>{
    if(!confirm(`Remove "${c.name}" and all its services?`)) return;
    try{ await removeCategory(c.id); toast("Category removed"); }catch(e){ toast(`Error: ${e.message}`); }
  };
  const onAddService=async(catId)=>{
    if(!newSvc.name.trim()){ return; }
    try{
      await addService({categoryId:catId,name:newSvc.name.trim(),price:Number(newSvc.price)||0,sortOrder:999});
      setNewSvc({name:"",price:""}); setAddingTo(null); toast("Service added");
    }catch(e){ toast(`Error: ${e.message}`); }
  };
  const onRemoveSvc=async(s)=>{
    if(!confirm(`Remove "${s.name}"? Existing invoices keep their snapshot.`)) return;
    try{ await removeService(s.id); toast("Service removed"); }catch(e){ toast(`Error: ${e.message}`); }
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:"12px 18px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:13,color:T.muted}}>Edit prices inline. Changes apply to new invoices only — existing invoices keep their snapshots.</div>
        {!showCatAdd
          ? <Btn v="gold" sm onClick={()=>setShowCatAdd(true)}>+ Add Category</Btn>
          : <div style={{display:"flex",gap:6}}>
              <input value={newCatName} onChange={e=>setNewCatName(e.target.value)} placeholder="Category name" style={{border:`1px solid ${T.border}`,borderRadius:8,padding:"6px 10px",fontSize:13,fontFamily:"Sora"}}/>
              <Btn v="gold" sm onClick={onAddCategory}>Add</Btn>
              <Btn v="ghost" sm onClick={()=>{setShowCatAdd(false);setNewCatName("");}}>×</Btn>
            </div>
        }
      </Card>

      {grouped.map(({cat,list})=>(
        <Card key={cat.id} style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.bg}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600}}>{cat.name}</div>
            <div style={{display:"flex",gap:6}}>
              <Btn v="ghost" sm onClick={()=>setAddingTo(addingTo===cat.id?null:cat.id)}>+ Service</Btn>
              {cat.id!=="__none" && <Btn v="danger" sm onClick={()=>onRemoveCategory(cat)}>Remove Category</Btn>}
            </div>
          </div>
          {addingTo===cat.id && (
            <div style={{padding:"12px 18px",background:T.amberBg+"33",display:"flex",gap:8,alignItems:"end",borderBottom:`1px solid ${T.border}`}}>
              <Inp label="Service name" value={newSvc.name} onChange={e=>setNewSvc(v=>({...v,name:e.target.value}))} style={{minWidth:240}}/>
              <Inp label="Price (EGP)" type="number" value={newSvc.price} onChange={e=>setNewSvc(v=>({...v,price:e.target.value}))}/>
              <Btn v="gold" sm onClick={()=>onAddService(cat.id)}>Add</Btn>
              <Btn v="ghost" sm onClick={()=>{setAddingTo(null);setNewSvc({name:"",price:""});}}>×</Btn>
            </div>
          )}
          {list.length===0 && <div style={{padding:18,color:T.muted,fontSize:12,textAlign:"center"}}>No services in this category yet.</div>}
          {list.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 18px",borderBottom:i<list.length-1?`1px solid ${T.border}`:"none",gap:12}}>
              <input defaultValue={s.name} onBlur={e=>onRenameSvc(s,e.target.value)} style={{flex:1,border:"1px solid transparent",borderRadius:6,padding:"5px 8px",fontSize:13,fontFamily:"Sora",background:"transparent"}}/>
              <input defaultValue={s.price} type="number" onBlur={e=>onPriceBlur(s,e.target.value)} style={{width:120,border:`1px solid ${T.border}`,borderRadius:6,padding:"5px 10px",fontSize:13,fontFamily:"'Cormorant Garamond',serif",fontWeight:600,color:T.gold,textAlign:"right"}}/>
              <span style={{fontSize:11,color:T.muted}}>EGP</span>
              <Btn v="danger" sm onClick={()=>onRemoveSvc(s)}>×</Btn>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════ MOBILE NAV */
function MobileNav({page,setPage,recalls,onSignOut,role}){
  const[more,setMore]=useState(false);
  const pendingR=Object.values(recalls).filter(r=>r.status==="Pending").length;
  const tabs=[
    {key:"Dashboard",   icon:"🏠",label:"Home"},
    {key:"Appointments",icon:"📅",label:"Today"},
    {key:"NewAppt",     icon:null, label:"New"},
    {key:"Patients",    icon:"👤",label:"Patients"},
    {key:"more",        icon:"···",label:"More"},
  ];
  const moreItems = [
    {key:"Followups",icon:"🔔",label:"Follow-ups",badge:pendingR, roles:["admin","dentist","receptionist"]},
    {key:"Billing",  icon:"₤", label:"Billing",   badge:0,        roles:["admin","dentist","receptionist"]},
    {key:"Revenue",  icon:"▲", label:"Revenue",   badge:0,        roles:["admin"]},
    {key:"Messages", icon:"💬",label:"Messages",  badge:0,        roles:["admin","dentist","receptionist"]},
    {key:"Admin",    icon:"⚙", label:"Admin",     badge:0,        roles:["admin"]},
    {key:"Settings", icon:"⚙️",label:"Settings",  badge:0,        roles:["admin","dentist","receptionist"]},
  ].filter(i => i.roles.includes(role));
  return(
    <>
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:T.white,borderTop:`1px solid ${T.border}`,display:"flex",alignItems:"center",paddingBottom:"env(safe-area-inset-bottom)",boxShadow:"0 -4px 24px rgba(0,0,0,0.08)"}}>
        {tabs.map(tab=>{
          const active=tab.key!=="more"&&page===tab.key;
          if(tab.key==="NewAppt") return(
            <button key="cta" onClick={()=>setPage("NewAppt")} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",padding:"8px 0",cursor:"pointer"}}>
              <div style={{width:50,height:50,borderRadius:"50%",background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff",boxShadow:`0 4px 16px ${T.gold}50`,marginTop:-18,border:`3px solid ${T.white}`}}>＋</div>
            </button>
          );
          return(
            <button key={tab.key} onClick={()=>{if(tab.key==="more"){setMore(v=>!v);}else{setPage(tab.key);setMore(false);}}} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",border:"none",background:"transparent",padding:"10px 0 8px",cursor:"pointer",gap:3,position:"relative"}}>
              {tab.key==="more"&&pendingR>0&&<span style={{position:"absolute",top:8,right:"calc(50% - 16px)",background:T.red,color:"#fff",fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:99}}>{pendingR}</span>}
              <span style={{fontSize:20}}>{tab.icon}</span>
              <span style={{fontSize:10,fontWeight:active?600:400,color:active?T.gold:T.muted,fontFamily:"Sora"}}>{tab.label}</span>
              {active&&<div style={{position:"absolute",bottom:0,width:20,height:2,background:T.gold,borderRadius:2}}/>}
            </button>
          );
        })}
      </div>
      {more&&(
        <>
          <div onClick={()=>setMore(false)} style={{position:"fixed",inset:0,zIndex:150,background:"rgba(0,0,0,0.3)"}}/>
          <div className="slide-up" style={{position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:T.white,borderRadius:"20px 20px 0 0",padding:"20px 20px 36px",boxShadow:"0 -8px 40px rgba(0,0,0,0.15)"}}>
            <div style={{width:36,height:4,background:T.border,borderRadius:2,margin:"0 auto 20px"}}/>
            {moreItems.map(item=>(
              <button key={item.key} onClick={()=>{setPage(item.key);setMore(false);}} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"14px 16px",border:"none",background:page===item.key?T.goldDim:"transparent",borderRadius:12,cursor:"pointer",fontFamily:"Sora",marginBottom:4}}>
                <span style={{fontSize:22}}>{item.icon}</span>
                <span style={{fontSize:15,fontWeight:500,color:T.text,flex:1,textAlign:"left"}}>{item.label}</span>
                {item.badge>0&&<span style={{background:T.red,color:"#fff",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:99}}>{item.badge}</span>}
              </button>
            ))}
            <div style={{marginTop:8,borderTop:`1px solid ${T.border}`,paddingTop:12}}>
              <button onClick={onSignOut} style={{display:"flex",alignItems:"center",gap:14,width:"100%",padding:"12px 16px",border:"none",background:"transparent",borderRadius:12,cursor:"pointer",fontFamily:"Sora",color:T.red}}>
                <span style={{fontSize:20}}>🚪</span><span style={{fontSize:15,fontWeight:500}}>Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════ SIDEBAR */
const NAV=[
  {key:"Dashboard",    icon:"◈",label:"Dashboard",   roles:["admin","dentist","receptionist"]},
  {key:"Appointments", icon:"◷",label:"Appointments",roles:["admin","dentist","receptionist"]},
  {key:"NewAppt",      icon:"＋",label:"New Appointment",roles:["admin","dentist","receptionist"]},
  {key:"Patients",     icon:"◎",label:"Patients",    roles:["admin","dentist","receptionist"]},
  {key:"Followups",    icon:"◉",label:"Follow-ups",  roles:["admin","dentist","receptionist"]},
  {key:"Billing",      icon:"₤",label:"Billing",     roles:["admin","dentist","receptionist"]},
  {key:"Revenue",      icon:"▲",label:"Revenue",     roles:["admin"]},
  {key:"Messages",     icon:"✦",label:"Messages",    roles:["admin","dentist","receptionist"]},
  {key:"Admin",        icon:"⚙",label:"Admin Panel", roles:["admin"]},
  {key:"Settings",     icon:"◐",label:"Settings",    roles:["admin","dentist","receptionist"]},
];
const TOOTH=`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 6 C20 6 12 13 12 22 C12 30 15 36 18 42 L21 54 C21 55.5 22.5 57 24 57 C25.5 57 27 55.5 27 54 L27 46 C27 44 28.5 42.5 30 42.5 C31.5 42.5 33 44 33 46 L33 54 C33 55.5 34.5 57 36 57 C37.5 57 39 55.5 39 54 L42 42 C45 36 48 30 48 22 C48 13 40 6 30 6Z' fill='white' fill-opacity='0.025'/%3E%3C/svg%3E")`;

function Sidebar({page,setPage,patients,appointments,recalls,messages,onSignOut,role}){
  const pendingR=Object.values(recalls).filter(r=>r.status==="Pending").length;
  const visibleNav = NAV.filter(n => n.roles.includes(role));
  return(
    <aside style={{width:224,background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",position:"sticky",top:0,overflowY:"auto",backgroundImage:TOOTH,backgroundSize:"60px 60px"}}>
      <div style={{padding:"18px 16px 16px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <img src="/logo.png" alt="Lifedent Dental Clinic"
          style={{width:"100%",height:"auto",objectFit:"contain",filter:"brightness(0) invert(1)",display:"block"}}/>
      </div>
      <nav style={{padding:"13px 10px",flex:1}}>
        {visibleNav.map(n=>{
          const active=page===n.key;
          const badge=n.key==="Followups"&&pendingR>0?pendingR:null;
          return(
            <button key={n.key} onClick={()=>setPage(n.key)} className="nav-btn"
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",marginBottom:2,fontFamily:"Sora",fontSize:13,fontWeight:active?600:400,textAlign:"left",background:active?`${T.gold}1A`:"transparent",color:active?T.goldL:"rgba(255,255,255,0.5)",borderLeft:active?`2px solid ${T.gold}`:"2px solid transparent"}}>
              <span style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,opacity:0.75}}>{n.icon}</span>{n.label}</span>
              {badge&&<span style={{background:T.red,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99}}>{badge}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{padding:"12px 18px 20px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Overview</div>
        {[["Patients",Object.keys(patients).length],["Appointments",Object.keys(appointments).length],["Messages",messages.length]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:7,fontSize:12,color:"rgba(255,255,255,0.4)"}}>
            <span>{l}</span><span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:15,fontWeight:600,color:T.goldL}}>{v}</span>
          </div>
        ))}
        <button onClick={onSignOut} style={{marginTop:12,width:"100%",padding:"8px 12px",background:"rgba(255,255,255,0.05)",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,color:"rgba(255,255,255,0.4)",fontFamily:"Sora",display:"flex",alignItems:"center",gap:8}}>
          🚪 <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════ ROOT */
export default function CRM({ role="admin", canSeeClinical=true, userFullName="" }){
  const {
    patients, appointments, recalls, messages,
    dentists, categories, services, invoices,
    loading, error,
    addPatient, patchPatient, importPatients,
    addAppt, patchAppt, addRecall, patchRecall, sendWAMessage,
    addDentist, patchDentist, removeDentist,
    addCategory, patchCategory, removeCategory,
    addService, patchService, removeService,
    addInvoice,
  } = useClinicData();

  const[page,setPage]=useState("Dashboard");
  const[toast,setToast]=useState("");
  const isMobile=useMobile();
  const showToast=useCallback(msg=>{setToast(msg);setTimeout(()=>setToast(""),3500);},[]);

  const handleSignOut=async()=>{
    try{await signOut();}catch{}
  };

  if(loading) return(
    <>
      <style>{G}</style>
      <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",background:T.bg,flexDirection:"column",gap:16}}>
        <div style={{fontSize:36}}>🦷</div>
        <Spinner/>
        <div style={{fontSize:14,color:T.muted,fontFamily:"Sora"}}>Loading Lifedent CRM…</div>
      </div>
    </>
  );

  if(error) return(
    <>
      <style>{G}</style>
      <div style={{display:"flex",height:"100vh",alignItems:"center",justifyContent:"center",background:T.bg,flexDirection:"column",gap:12,padding:20}}>
        <div style={{fontSize:36}}>⚠️</div>
        <H size={22}>Connection Error</H>
        <div style={{fontSize:14,color:T.muted,textAlign:"center",maxWidth:360}}>{error}</div>
        <Btn v="gold" onClick={()=>window.location.reload()}>Retry</Btn>
      </div>
    </>
  );

  const sharedProps={ patients, appointments, recalls, messages,
    dentists, categories, services, invoices,
    addPatient, patchPatient, importPatients,
    addAppt, patchAppt, addRecall, patchRecall, sendWAMessage,
    addInvoice,
    toast:showToast, canSeeClinical, isMobile, role };

  // Role-gate routing — if non-admin lands on admin page, bounce to Dashboard
  const safePage = (() => {
    const item = NAV.find(n => n.key === page);
    if (!item) return "Dashboard";
    if (!item.roles.includes(role)) return "Dashboard";
    return page;
  })();

  return(
    <>
      <style>{G}</style>
      <div style={{display:"flex",height:"100vh",fontFamily:"'Sora',sans-serif",overflow:"hidden"}}>
        {!isMobile&&<Sidebar page={safePage} setPage={setPage} patients={patients} appointments={appointments} recalls={recalls} messages={messages} onSignOut={handleSignOut} role={role}/>}
        <main style={{flex:"1 1 0",minWidth:0,width:0,overflowY:"auto",overflowX:"hidden",padding:isMobile?"20px 16px 100px":"34px 38px",background:T.bg}}>
          {safePage==="Dashboard"    && <Dashboard    {...sharedProps} userFullName={userFullName}/>}
          {safePage==="Appointments" && <Appointments {...sharedProps}/>}
          {safePage==="NewAppt"      && <NewAppt      {...sharedProps} setPage={setPage}/>}
          {safePage==="Patients"     && <Patients     {...sharedProps}/>}
          {safePage==="Followups"    && <Followups    {...sharedProps}/>}
          {safePage==="Billing"      && <Billing      {...sharedProps}/>}
          {safePage==="Revenue"      && <Revenue      {...sharedProps}/>}
          {safePage==="Messages"     && <Messages     messages={messages}/>}
          {safePage==="Admin"        && <AdminPanel   {...sharedProps}
                                          addDentist={addDentist} patchDentist={patchDentist} removeDentist={removeDentist}
                                          addCategory={addCategory} patchCategory={patchCategory} removeCategory={removeCategory}
                                          addService={addService} patchService={patchService} removeService={removeService}/>}
          {safePage==="Settings"     && <Settings     toast={showToast}/>}
        </main>
      </div>
      {isMobile&&<MobileNav page={safePage} setPage={setPage} recalls={recalls} onSignOut={handleSignOut} role={role}/>}
      <Toast msg={toast} onClose={()=>setToast("")}/>
    </>
  );
}