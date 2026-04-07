import { useState, useCallback } from "react";

/* ════════════════════════════════════════════════
   GLOBAL STYLES & KEYFRAMES
════════════════════════════════════════════════ */
const G = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600;1,700&family=Sora:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; font-family: 'Sora', sans-serif; background: #F5F0E6; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(184,131,46,0.3); border-radius: 4px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideRight { from { opacity:0; transform:translateX(22px); } to { opacity:1; transform:translateX(0); } }
  @keyframes toastIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes shrink { from { width:100%; } to { width:0%; } }
  .fade-up { animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both; }
  .slide-right { animation: slideRight 0.35s cubic-bezier(0.22,1,0.36,1) both; }
  .stagger-1 { animation-delay: 50ms; }
  .stagger-2 { animation-delay: 100ms; }
  .stagger-3 { animation-delay: 150ms; }
  .stagger-4 { animation-delay: 200ms; }
  .row-hover { transition: background 0.13s; }
  .row-hover:hover { background: rgba(184,131,46,0.04) !important; }
  .nav-btn { transition: all 0.16s ease; }
  .nav-btn:hover { background: rgba(184,131,46,0.09) !important; color: #E8B870 !important; }
  .btn-t { transition: all 0.18s cubic-bezier(0.22,1,0.36,1); }
  .btn-t:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.05); }
  .btn-t:active:not(:disabled) { transform: translateY(0); }
  input:focus, textarea:focus, select:focus { outline: none; border-color: #B8832E !important; box-shadow: 0 0 0 3px rgba(184,131,46,0.12) !important; }
`;

/* ════════════════════════════════════════════════
   TOKENS
════════════════════════════════════════════════ */
const T = {
  bg: "#F5F0E6", sidebar: "#111028", sidebarL: "#191740",
  white: "#FFFFFF", text: "#1A1614", text2: "#4A4540", muted: "#8A8480",
  gold: "#B8832E", goldL: "#D4A84E", goldDim: "rgba(184,131,46,0.12)",
  border: "rgba(0,0,0,0.07)", borderM: "rgba(0,0,0,0.12)",
  green: "#1E7A4A", greenBg: "#E6F4EE",
  red: "#C03838", redBg: "#FAE8E8",
  amber: "#A86A10", amberBg: "#FEF0DC",
  blue: "#2550A0", blueBg: "#E8EEF8",
  wa: "#25D366",
};

/* ════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════ */
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

const AV_COLS = [["#1B4F72","#3498DB"],["#2D6A4F","#52B788"],["#6B2D6B","#C678DD"],["#7B3F00","#D4882E"],["#1A3A3A","#4ECDC4"],["#4A1942","#E056A0"]];
const avColor = name => AV_COLS[name.charCodeAt(0)%AV_COLS.length];

const ST_CFG = {
  Scheduled: {color:T.amber, bg:T.amberBg},
  Confirmed:  {color:T.green,  bg:T.greenBg},
  Completed:  {color:T.blue,   bg:T.blueBg},
  Cancelled:  {color:T.muted,  bg:"#F0EFED"},
  "No-show":  {color:T.red,    bg:T.redBg},
};

const SERVICES = ["Check-up","Cleaning","Filling","Root Canal","Whitening","Crown / Bridge","Extraction","Orthodontics","Other"];
const DENTISTS = ["Dr. Kareem Adel","Dr. Dina Hassan","Dr. Mohamed Samy"];

const WA = {
  CONFIRMATION: (n,d,t) => `مرحباً ${n} 👋\n\nتم تأكيد موعدك في عيادة *LifeDent* ✅\n📅 ${d}\n🕐 ${t}\n\nللإلغاء أو التغيير، رد على هذه الرسالة.`,
  REMINDER:     (n,d,t) => `تذكير من عيادة *LifeDent* 🦷\n\nأهلاً ${n}، موعدك غداً:\n📅 ${d}\n🕐 ${t}\n\nنتطلع لرؤيتك! 😊`,
  RECALL:       (n,r)   => `أهلاً ${n} 👋\n\nحان وقت *${r}* في عيادة LifeDent.\nتواصل معنا لحجز موعدك. 🦷`,
};

async function callWA({phoneNumberId,accessToken,to,body}){
  const r = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,{
    method:"POST",
    headers:{"Authorization":`Bearer ${accessToken}`,"Content-Type":"application/json"},
    body:JSON.stringify({messaging_product:"whatsapp",to:toWA(to),type:"text",text:{body}}),
  });
  const d = await r.json();
  if(!r.ok) throw new Error(d?.error?.message||"WhatsApp API error");
  return d;
}

/* ════════════════════════════════════════════════
   SEED
════════════════════════════════════════════════ */
function seed(){
  const p1={id:uid(),name:"Sara Ahmed",   phone:"01012345678",email:"sara@email.com",  dob:"1990-03-15",notes:"Sensitive to cold. Prefers WhatsApp. Last cleaning 8 months ago."};
  const p2={id:uid(),name:"Omar Hassan",  phone:"01123456789",email:"omar@email.com",  dob:"1985-07-22",notes:"⚠️ Allergic to penicillin. Anxious — gentle approach. Previous filling lower-left molar."};
  const p3={id:uid(),name:"Nour El-Din",  phone:"01234567890",email:"",               dob:"1998-11-03",notes:"First visit. Referred by Sara Ahmed."};
  const p4={id:uid(),name:"Layla Ibrahim",phone:"01099887766",email:"layla@email.com", dob:"1993-06-08",notes:"Orthodontic patient of Dr. Dina. Braces follow-up."};
  const patients={[p1.id]:p1,[p2.id]:p2,[p3.id]:p3,[p4.id]:p4};
  const mk=(pid,h,svc,status,dentist,rn="",cn="")=>({id:uid(),patientId:pid,dt:addH(now(),h),service:svc,status,dentist,receptionNotes:rn,clinicalNote:cn,reminder24hSent:false});
  const a1=mk(p1.id,2,"Check-up","Scheduled",DENTISTS[0],"First visit — confirm address.");
  const a2=mk(p2.id,25,"Cleaning","Confirmed",DENTISTS[0],"Anxiety — calm approach.");
  const a3=mk(p3.id,50,"Filling","Scheduled",DENTISTS[1]);
  const a4=mk(p4.id,4,"Orthodontics","Confirmed",DENTISTS[1],"Bring last X-ray.");
  const a5=mk(p1.id,-120,"Cleaning","Completed",DENTISTS[0],"","Scaling done. Mild gum sensitivity noted.");
  const a6=mk(p2.id,-500,"Root Canal","Completed",DENTISTS[2],"","RCT lower-left molar completed.");
  const a7=mk(p4.id,-20,"Orthodontics","No-show",DENTISTS[1]);
  const appointments={[a1.id]:a1,[a2.id]:a2,[a3.id]:a3,[a4.id]:a4,[a5.id]:a5,[a6.id]:a6,[a7.id]:a7};
  const r1={id:uid(),patientId:p1.id,dueDate:isoD(addD(now(),7)), type:"6-month check-up",  status:"Pending",lastSent:null};
  const r2={id:uid(),patientId:p2.id,dueDate:isoD(addD(now(),2)), type:"3-month check-up",  status:"Pending",lastSent:null};
  const r3={id:uid(),patientId:p4.id,dueDate:isoD(addD(now(),-1)),type:"Orthodontic review",status:"Pending",lastSent:null};
  const recalls={[r1.id]:r1,[r2.id]:r2,[r3.id]:r3};
  return{patients,appointments,recalls,messages:[],waConfig:{phoneNumberId:"",accessToken:"",enabled:false}};
}

/* ════════════════════════════════════════════════
   REDUCER
════════════════════════════════════════════════ */
function reducer(s,a){
  switch(a.type){
    case "ADD_PATIENT":   return{...s,patients:{...s.patients,[a.p.id]:a.p}};
    case "PATCH_PATIENT": return{...s,patients:{...s.patients,[a.id]:{...s.patients[a.id],...a.patch}}};
    case "ADD_APPT":      return{...s,appointments:{...s.appointments,[a.ap.id]:a.ap}};
    case "PATCH_APPT":    return{...s,appointments:{...s.appointments,[a.id]:{...s.appointments[a.id],...a.patch}}};
    case "ADD_RECALL":    return{...s,recalls:{...s.recalls,[a.r.id]:a.r}};
    case "PATCH_RECALL":  return{...s,recalls:{...s.recalls,[a.id]:{...s.recalls[a.id],...a.patch}}};
    case "LOG_MSG":       return{...s,messages:[a.msg,...s.messages]};
    case "PATCH_MSG":     return{...s,messages:s.messages.map((m,i)=>i===0?{...m,...a.patch}:m)};
    case "PATCH_WA":      return{...s,waConfig:{...s.waConfig,...a.patch}};
    default: return s;
  }
}

/* ════════════════════════════════════════════════
   WA HOOK
════════════════════════════════════════════════ */
function useWASend(state,dispatch,toast){
  return useCallback(async({phone,name,kind,ap,recallType})=>{
    let body="";
    if(kind==="CONFIRMATION") body=WA.CONFIRMATION(name,fmtD(ap.dt),fmtT(ap.dt));
    else if(kind==="REMINDER") body=WA.REMINDER(name,fmtD(ap.dt),fmtT(ap.dt));
    else if(kind==="RECALL")   body=WA.RECALL(name,recallType);
    const{waConfig}=state;
    dispatch({type:"LOG_MSG",msg:{time:now(),channel:"WhatsApp",to:toWA(phone),kind,body,status:waConfig.enabled?"Sending…":"Mock",wamid:null}});
    if(!waConfig.enabled||!waConfig.phoneNumberId||!waConfig.accessToken){toast("WhatsApp (mock) — configure in Settings to go live.");return;}
    try{
      toast("Sending…");
      const r=await callWA({phoneNumberId:waConfig.phoneNumberId,accessToken:waConfig.accessToken,to:phone,body});
      dispatch({type:"PATCH_MSG",patch:{status:"Delivered ✓✓",wamid:r?.messages?.[0]?.id}});
      toast("Delivered! ✓");
    }catch(e){dispatch({type:"PATCH_MSG",patch:{status:`Failed: ${e.message}`}});toast(`❌ ${e.message}`);}
  },[state.waConfig]);
}

/* ════════════════════════════════════════════════
   PRIMITIVES
════════════════════════════════════════════════ */
function Av({name="?",size=38}){
  const[bg,fg]=avColor(name);
  return <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,background:`linear-gradient(135deg,${bg},${fg})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:600,fontSize:size*0.38,fontFamily:"Sora",boxShadow:`0 2px 8px ${bg}55`}}>{name[0]?.toUpperCase()}</div>;
}

function Sbadge({status}){
  const c=ST_CFG[status]||{color:T.muted,bg:"#F0EFED"};
  return <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 11px",background:c.bg,color:c.color,borderRadius:99,fontSize:11.5,fontWeight:600,fontFamily:"Sora",letterSpacing:"0.02em"}}><span style={{width:6,height:6,borderRadius:"50%",background:c.color,display:"inline-block"}}/>{status}</span>;
}

function Card({children,style={},cls=""}){
  return <div className={cls} style={{background:T.white,borderRadius:18,border:`1px solid ${T.border}`,boxShadow:"0 1px 3px rgba(0,0,0,0.05),0 8px 32px rgba(0,0,0,0.04)",...style}}>{children}</div>;
}

function H({children,size=28,italic=false,style={}}){
  return <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:italic?"italic":"normal",fontSize:size,fontWeight:600,color:T.text,lineHeight:1.15,...style}}>{children}</div>;
}

function Lbl({children}){
  return <div style={{fontSize:10.5,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:6}}>{children}</div>;
}

function Inp({label,...p}){
  return <div style={{display:"flex",flexDirection:"column",gap:0}}>{label&&<Lbl>{label}</Lbl>}<input {...p} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"Sora",color:T.text,background:"#FDFCFA",outline:"none",transition:"border 0.15s,box-shadow 0.15s",...p.style}}/></div>;
}

function Sel({label,children,...p}){
  return <div style={{display:"flex",flexDirection:"column",gap:0}}>{label&&<Lbl>{label}</Lbl>}<select {...p} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"Sora",color:T.text,background:"#FDFCFA",outline:"none",cursor:"pointer",transition:"border 0.15s",...p.style}}>{children}</select></div>;
}

function Txta({label,...p}){
  return <div style={{display:"flex",flexDirection:"column",gap:0}}>{label&&<Lbl>{label}</Lbl>}<textarea {...p} style={{border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,fontFamily:"Sora",color:T.text,background:"#FDFCFA",outline:"none",resize:"vertical",transition:"border 0.15s,box-shadow 0.15s",...p.style}}/></div>;
}

function Btn({children,v="gold",sm,onClick,disabled,style={}}){
  const VS={
    gold:{bg:`linear-gradient(135deg,${T.gold},${T.goldL})`,cl:"#fff",sh:`0 4px 14px ${T.gold}40`,br:"none"},
    dark:{bg:T.sidebar,cl:"#fff",sh:"0 4px 14px rgba(0,0,0,0.25)",br:"none"},
    ghost:{bg:"transparent",cl:T.text2,sh:"none",br:`1px solid ${T.borderM}`},
    danger:{bg:T.redBg,cl:T.red,sh:"none",br:`1px solid ${T.red}25`},
    success:{bg:T.greenBg,cl:T.green,sh:"none",br:`1px solid ${T.green}25`},
    wa:{bg:"#25D366",cl:"#fff",sh:"0 4px 14px #25D36640",br:"none"},
  };
  const s=VS[v]||VS.ghost;
  return <button disabled={disabled} onClick={onClick} className="btn-t" style={{background:s.bg,color:s.cl,border:s.br,boxShadow:disabled?"none":s.sh,borderRadius:10,padding:sm?"7px 14px":"11px 20px",fontSize:sm?12:14,fontWeight:600,fontFamily:"Sora",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,display:"inline-flex",alignItems:"center",gap:6,letterSpacing:"0.01em",...style}}>{children}</button>;
}

function Tabs({opts,val,onChange,style={}}){
  return <div style={{display:"inline-flex",background:"rgba(0,0,0,0.06)",borderRadius:12,padding:3,gap:2,...style}}>{opts.map(o=>{const a=o===val;return <button key={o} onClick={()=>onChange(o)} style={{border:"none",borderRadius:9,padding:"8px 18px",fontSize:13,fontWeight:a?600:400,cursor:"pointer",fontFamily:"Sora",transition:"all 0.15s",background:a?T.white:"transparent",color:a?T.text:T.muted,boxShadow:a?"0 1px 5px rgba(0,0,0,0.09)":"none"}}>{o}</button>;})}</div>;
}

function Div({style={}}){ return <div style={{height:1,background:T.border,...style}}/>; }

function Toast({msg,onClose}){
  if(!msg) return null;
  return <div onClick={onClose} style={{position:"fixed",bottom:28,right:28,zIndex:9999,background:T.sidebar,color:"#fff",borderRadius:14,padding:"14px 20px 10px",minWidth:260,cursor:"pointer",boxShadow:"0 8px 40px rgba(0,0,0,0.25)",borderLeft:`3px solid ${T.gold}`,animation:"toastIn 0.3s cubic-bezier(0.22,1,0.36,1) both",fontFamily:"Sora",fontSize:14}}>{msg}<div style={{height:2,background:T.gold,borderRadius:2,marginTop:10,animation:"shrink 3s linear forwards"}}/></div>;
}

/* ════════════════════════════════════════════════
   DASHBOARD
════════════════════════════════════════════════ */
function Dashboard({state, userFullName=""}){
  const{patients,appointments,recalls}=state;
  const pList=Object.values(patients);
  const apList=Object.values(appointments);
  const todayD=today();
  const todayAps=apList.filter(a=>{const d=new Date(a.dt);d.setHours(0,0,0,0);return d.getTime()===todayD.getTime();}).sort((a,b)=>a.dt-b.dt);
  const upcoming=apList.filter(a=>a.dt>=now()&&!["Cancelled","Completed"].includes(a.status)).sort((a,b)=>a.dt-b.dt).slice(0,5);
  const pendingR=Object.values(recalls).filter(r=>r.status==="Pending");

  const stats=[
    {label:"Total Patients",   val:pList.length,    icon:"👤",accent:T.blueBg, ic:T.blue},
    {label:"Today",            val:todayAps.length, icon:"📅",accent:T.amberBg,ic:T.amber},
    {label:"Pending Recalls",  val:pendingR.length, icon:"🔔",accent:T.redBg,  ic:T.red},
    {label:"Total Visits",     val:apList.filter(a=>a.status==="Completed").length,icon:"✅",accent:T.greenBg,ic:T.green},
  ];

  return(
    <div className="fade-up">
      {/* Hero */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:34}}>
        <div>
          <H size={46} italic style={{lineHeight:1.05}}>Good morning,<br/>{userFullName || "LifeDent"}.</H>
          <div style={{marginTop:10,color:T.muted,fontSize:14}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <Card style={{padding:"20px 26px",textAlign:"right",minWidth:200}}>
          <div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>Today's Schedule</div>
          <H size={52} style={{color:T.gold,marginTop:4,lineHeight:1}}>{todayAps.length}</H>
          <div style={{fontSize:13,color:T.text2,marginTop:2}}>appointment{todayAps.length!==1?"s":""}</div>
        </Card>
      </div>

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:26}}>
        {stats.map((s,i)=>(
          <Card key={s.label} cls={`fade-up stagger-${i+1}`} style={{padding:"20px 22px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{s.label}</div>
                <H size={40} style={{marginTop:6,lineHeight:1,color:T.text}}>{s.val}</H>
              </div>
              <div style={{width:44,height:44,borderRadius:13,background:s.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{s.icon}</div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.9fr 1fr",gap:18,marginBottom:18}}>
        {/* Upcoming */}
        <Card cls="fade-up stagger-2" style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"22px 26px 16px"}}><H size={20}>Upcoming Appointments</H></div>
          <Div/>
          {upcoming.length===0
            ?<div style={{padding:32,textAlign:"center",color:T.muted,fontSize:14}}>No upcoming appointments.</div>
            :upcoming.map((ap,i)=>{
              const p=patients[ap.patientId];
              return(
                <div key={ap.id} className="row-hover" style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 26px",borderBottom:i<upcoming.length-1?`1px solid ${T.border}`:"none"}}>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <Av name={p?.name||"?"} size={36}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p?.name||"Unknown"}</div>
                      <div style={{fontSize:12,color:T.muted,marginTop:1}}>{ap.service} · {ap.dentist.split(" ").slice(0,2).join(" ")}</div>
                    </div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:14}}>
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

        {/* Recalls */}
        <Card cls="fade-up stagger-3" style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"22px 24px 16px"}}><H size={20}>Recall Alerts</H></div>
          <Div/>
          {pendingR.length===0
            ?<div style={{padding:28,textAlign:"center",color:T.muted,fontSize:14}}>No pending recalls.</div>
            :pendingR.sort((a,b)=>pDate(a.dueDate)-pDate(b.dueDate)).slice(0,5).map(r=>{
              const p=patients[r.patientId];
              const days=Math.ceil((pDate(r.dueDate)-today())/86400000);
              const urgent=days<0,soon=days>=0&&days<=3;
              return(
                <div key={r.id} style={{padding:"13px 22px",borderBottom:`1px solid ${T.border}`,borderLeft:`3px solid ${urgent?T.red:soon?T.amber:T.green}`}}>
                  <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p?.name||"Unknown"}</div>
                  <div style={{fontSize:12,color:T.muted,margin:"2px 0"}}>{r.type}</div>
                  <div style={{fontSize:12,fontWeight:600,color:urgent?T.red:soon?T.amber:T.green}}>{urgent?`${Math.abs(days)}d overdue`:days===0?"Today":`${days}d left`}</div>
                </div>
              );
            })}
        </Card>
      </div>

      {/* Timeline */}
      {todayAps.length>0&&(
        <Card cls="fade-up stagger-4" style={{padding:"22px 28px"}}>
          <H size={20} style={{marginBottom:22}}>Today's Timeline</H>
          <div style={{display:"flex",gap:0,overflowX:"auto",paddingBottom:4}}>
            {todayAps.map((ap,i)=>{
              const p=patients[ap.patientId];
              const c=ST_CFG[ap.status]||{color:T.muted,bg:"#F0EFED"};
              return(
                <div key={ap.id} style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:130,flex:1}}>
                  <div style={{display:"flex",alignItems:"center",width:"100%",marginBottom:10}}>
                    <div style={{flex:1,height:1,background:i===0?"transparent":T.border}}/>
                    <div style={{width:13,height:13,borderRadius:"50%",background:c.color,border:`2px solid ${T.white}`,boxShadow:`0 0 0 2px ${c.color}`,flexShrink:0}}/>
                    <div style={{flex:1,height:1,background:i===todayAps.length-1?"transparent":T.border}}/>
                  </div>
                  <div style={{background:c.bg,borderRadius:12,padding:"12px 10px",width:"calc(100% - 14px)",textAlign:"center"}}>
                    <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:18,fontWeight:600,color:T.text}}>{fmtT(ap.dt)}</div>
                    <div style={{margin:"8px auto 0",display:"flex",justifyContent:"center"}}><Av name={p?.name||"?"} size={28}/></div>
                    <div style={{fontSize:12,fontWeight:600,color:T.text,marginTop:5}}>{p?.name?.split(" ")[0]}</div>
                    <div style={{fontSize:11,color:T.muted,marginTop:2}}>{ap.service}</div>
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

/* ════════════════════════════════════════════════
   APPOINTMENTS
════════════════════════════════════════════════ */
function Appointments({state,dispatch,toast,canSeeClinical=true}){
  const[view,setView]=useState("Today");
  const[selId,setSelId]=useState(null);
  const{patients,appointments}=state;
  const sendWA=useWASend(state,dispatch,toast);
  const todayD=today(),tomD=addD(todayD,1);

  const rows=Object.values(appointments).filter(ap=>{
    const d=new Date(ap.dt);d.setHours(0,0,0,0);
    if(view==="Today")    return d.getTime()===todayD.getTime();
    if(view==="Tomorrow") return d.getTime()===tomD.getTime();
    return true;
  }).sort((a,b)=>a.dt-b.dt);

  const sel=selId?appointments[selId]:null;
  const selP=sel?patients[sel.patientId]:null;
  const patch=s=>{dispatch({type:"PATCH_APPT",id:sel.id,patch:{status:s}});toast(`Marked as ${s}`);};

  return(
    <div className="fade-up">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26}}>
        <H size={32}>Appointments</H>
        <Tabs opts={["Today","Tomorrow","All"]} val={view} onChange={setView}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:sel?"1fr 360px":"1fr",gap:18,alignItems:"start"}}>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1.2fr 1.3fr 1.3fr",padding:"12px 24px",background:T.bg,borderBottom:`1px solid ${T.border}`}}>
            {["Patient","Date & Time","Service","Dentist","Status"].map(h=><div key={h} style={{fontSize:10.5,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em"}}>{h}</div>)}
          </div>
          {rows.length===0
            ?<div style={{padding:36,textAlign:"center",color:T.muted}}>No appointments for this period.</div>
            :rows.map(ap=>{
              const p=patients[ap.patientId];
              const active=ap.id===selId;
              return(
                <div key={ap.id} className="row-hover" onClick={()=>setSelId(active?null:ap.id)}
                  style={{display:"grid",gridTemplateColumns:"2fr 1.4fr 1.2fr 1.3fr 1.3fr",padding:"14px 24px",cursor:"pointer",alignItems:"center",borderBottom:`1px solid ${T.border}`,background:active?`${T.gold}08`:T.white,borderLeft:active?`3px solid ${T.gold}`:"3px solid transparent",transition:"all 0.13s"}}>
                  <div style={{display:"flex",gap:11,alignItems:"center"}}>
                    <Av name={p?.name||"?"} size={34}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p?.name||"Unknown"}</div>
                      <div style={{fontSize:11,color:T.muted}}>{p?.phone}</div>
                    </div>
                  </div>
                  <div><div style={{fontSize:13,fontWeight:500,color:T.text2}}>{fmtD(ap.dt)}</div><div style={{fontSize:11,color:T.muted}}>{fmtT(ap.dt)}</div></div>
                  <div style={{fontSize:13,color:T.text2}}>{ap.service}</div>
                  <div style={{fontSize:12,color:T.muted}}>{ap.dentist.split(" ").slice(0,2).join(" ")}</div>
                  <Sbadge status={ap.status}/>
                </div>
              );
            })}
        </Card>

        {sel&&(
          <Card cls="slide-right" style={{padding:0,overflow:"hidden",position:"sticky",top:20}}>
            <div style={{background:`linear-gradient(135deg,${T.sidebar},${T.sidebarL})`,padding:"24px 24px 20px",position:"relative"}}>
              <button onClick={()=>setSelId(null)} style={{position:"absolute",top:14,right:14,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:28,height:28,borderRadius:"50%",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
              <Av name={selP?.name||"?"} size={50}/>
              <H size={21} style={{color:"#fff",marginTop:12}}>{selP?.name}</H>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.55)",marginTop:3}}>📞 {selP?.phone}</div>
              <div style={{marginTop:10}}><Sbadge status={sel.status}/></div>
            </div>
            <div style={{padding:"18px 22px"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:15}}>
                {[["Service",sel.service],["Dentist",sel.dentist.split(" ").slice(0,2).join(" ")],["Date",fmtD(sel.dt)],["Time",fmtT(sel.dt)]].map(([k,v])=>(
                  <div key={k} style={{background:T.bg,borderRadius:10,padding:"10px 13px"}}>
                    <div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:600,color:T.text,marginTop:3}}>{v}</div>
                  </div>
                ))}
              </div>
              {sel.receptionNotes&&<div style={{background:T.amberBg,borderLeft:`3px solid ${T.amber}`,borderRadius:"0 8px 8px 0",padding:"9px 13px",fontSize:13,color:T.text2,marginBottom:13}}>📋 {sel.receptionNotes}</div>}
              {canSeeClinical&&sel.clinicalNote&&<div style={{background:T.blueBg,borderLeft:`3px solid ${T.blue}`,borderRadius:"0 8px 8px 0",padding:"9px 13px",fontSize:13,color:T.text2,marginBottom:13}}>🩺 {sel.clinicalNote}</div>}
              <Div style={{marginBottom:14}}/>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <Btn v="wa" sm onClick={()=>sendWA({phone:selP?.phone,name:selP?.name,kind:"CONFIRMATION",ap:sel})}>💬 Send Confirmation</Btn>
                <Btn v="ghost" sm onClick={()=>sendWA({phone:selP?.phone,name:selP?.name,kind:"REMINDER",ap:sel})}>🔔 Send Reminder</Btn>
                <Div style={{margin:"2px 0"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <Btn v="success" sm onClick={()=>patch("Confirmed")}>✓ Confirmed</Btn>
                  <Btn v="success" sm onClick={()=>patch("Completed")}>☑ Completed</Btn>
                  <Btn v="danger"  sm onClick={()=>patch("No-show")}>✗ No-show</Btn>
                  <Btn v="danger"  sm onClick={()=>patch("Cancelled")}>○ Cancelled</Btn>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   NEW APPOINTMENT
════════════════════════════════════════════════ */
function NewAppt({state,dispatch,toast,setPage}){
  const{patients}=state;
  const[mode,setMode]=useState("Existing");
  const[sendMsg,setSendMsg]=useState(true);
  const[pid,setPid]=useState(Object.keys(patients)[0]||"");
  const[name,setName]=useState("");
  const[phone,setPhone]=useState("");
  const[pnotes,setPnotes]=useState("");
  const[apDate,setApDate]=useState(isoD(now()));
  const[apTime,setApTime]=useState("09:00");
  const[service,setService]=useState(SERVICES[0]);
  const[dentist,setDentist]=useState(DENTISTS[0]);
  const[recNote,setRecNote]=useState("");
  const[errors,setErrors]=useState({});
  const pList=Object.values(patients);

  const submit=()=>{
    const errs={};let finalPid=pid;
    if(mode==="New"){
      if(!name.trim())errs.name="Required";
      if(phone.replace(/\D/g,"").length<10)errs.phone="Enter a valid Egyptian number";
      if(Object.keys(errs).length){setErrors(errs);return;}
      const dig=phone.replace(/\D/g,"");
      const ex=pList.find(p=>p.phone.replace(/\D/g,"")===dig);
      if(ex){finalPid=ex.id;toast("Phone exists — linked to existing patient.");}
      else{finalPid=uid();dispatch({type:"ADD_PATIENT",p:{id:finalPid,name:name.trim(),phone:dig,email:"",dob:"",notes:pnotes.trim()}});}
    }
    const dt=new Date(`${apDate}T${apTime}`);
    const ap={id:uid(),patientId:finalPid,dt,service,status:"Scheduled",dentist,receptionNotes:recNote.trim(),clinicalNote:"",reminder24hSent:false};
    dispatch({type:"ADD_APPT",ap});
    if(sendMsg){
      const p=patients[finalPid]||{phone,name};
      dispatch({type:"LOG_MSG",msg:{time:now(),channel:"WhatsApp",to:toWA(p.phone),kind:"CONFIRMATION",body:WA.CONFIRMATION(p.name||name,fmtD(dt),fmtT(dt)),status:"Mock",wamid:null}});
    }
    toast("Appointment created!");
    setPage("Appointments");
  };

  return(
    <div className="fade-up">
      <H size={32} style={{marginBottom:26}}>New Appointment</H>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:18}}>
        <Card style={{padding:"26px 28px"}}>
          <H size={19} style={{marginBottom:18}}>Patient</H>
          <div style={{display:"flex",gap:8,marginBottom:20}}>
            {["Existing","New"].map(m=><Btn key={m} v={mode===m?"dark":"ghost"} sm onClick={()=>{setMode(m);setErrors({});}}>{m} Patient</Btn>)}
          </div>
          {mode==="Existing"
            ?pList.length===0
              ?<div style={{color:T.muted,fontSize:14}}>No patients yet. Switch to New.</div>
              :<Sel label="Select Patient" value={pid} onChange={e=>setPid(e.target.value)}>{pList.map(p=><option key={p.id} value={p.id}>{p.name} — {p.phone}</option>)}</Sel>
            :<div style={{display:"flex",flexDirection:"column",gap:15}}>
              <div><Inp label="Full Name" value={name} onChange={e=>{setName(e.target.value);setErrors(v=>({...v,name:null}));}} placeholder="e.g. Sara Ahmed"/>{errors.name&&<div style={{color:T.red,fontSize:12,marginTop:4}}>{errors.name}</div>}</div>
              <div><Inp label="Phone Number" value={phone} onChange={e=>{setPhone(e.target.value);setErrors(v=>({...v,phone:null}));}} placeholder="01012345678"/>{errors.phone&&<div style={{color:T.red,fontSize:12,marginTop:4}}>{errors.phone}</div>}{phone&&<div style={{fontSize:11,color:T.muted,marginTop:4}}>WhatsApp → {toWA(phone)}</div>}</div>
              <Txta label="Notes (optional)" value={pnotes} onChange={e=>setPnotes(e.target.value)} placeholder="Allergies, anxiety, preferences…" style={{height:80}}/>
            </div>
          }
        </Card>
        <Card style={{padding:"26px 28px"}}>
          <H size={19} style={{marginBottom:18}}>Appointment Details</H>
          <div style={{display:"flex",flexDirection:"column",gap:15}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:13}}>
              <Inp label="Date" type="date" value={apDate} onChange={e=>setApDate(e.target.value)}/>
              <Inp label="Time" type="time" value={apTime} onChange={e=>setApTime(e.target.value)}/>
            </div>
            <Sel label="Service" value={service} onChange={e=>setService(e.target.value)}>{SERVICES.map(s=><option key={s}>{s}</option>)}</Sel>
            <Sel label="Dentist" value={dentist} onChange={e=>setDentist(e.target.value)}>{DENTISTS.map(d=><option key={d}>{d}</option>)}</Sel>
            <Inp label="Reception Notes (optional)" value={recNote} onChange={e=>setRecNote(e.target.value)} placeholder="Patient anxious, bring X-ray…"/>
          </div>
        </Card>
      </div>

      {sendMsg&&(
        <Card style={{padding:"16px 22px",marginBottom:18,display:"flex",alignItems:"center",gap:14,borderLeft:`3px solid ${T.wa}`,background:"#F0FAF4"}}>
          <span style={{fontSize:22}}>💬</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:14,color:T.text}}>WhatsApp confirmation will be sent</div>
            <div style={{fontSize:12,color:T.muted,marginTop:2}}>To: {mode==="Existing"?(patients[pid]?.phone?toWA(patients[pid].phone):"—"):(phone?toWA(phone):"—")}</div>
          </div>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,color:T.muted}}>
            <input type="checkbox" checked={sendMsg} onChange={e=>setSendMsg(e.target.checked)}/> Send
          </label>
        </Card>
      )}
      {!sendMsg&&(
        <div style={{marginBottom:18}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,color:T.muted}}>
            <input type="checkbox" checked={sendMsg} onChange={e=>setSendMsg(e.target.checked)}/> Also send WhatsApp confirmation
          </label>
        </div>
      )}
      <div style={{display:"flex",gap:12}}>
        <Btn v="gold" onClick={submit}>Save Appointment</Btn>
        <Btn v="ghost" onClick={()=>setPage("Appointments")}>Cancel</Btn>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════
   PATIENTS
════════════════════════════════════════════════ */
function Patients({state,dispatch,toast,canSeeClinical=true}){
  const[q,setQ]=useState("");
  const[selId,setSelId]=useState(null);
  const[tab,setTab]=useState("Overview");
  const[notes,setNotes]=useState("");
  const[rType,setRType]=useState("6-month check-up");
  const[rLabel,setRLabel]=useState("Follow-up");
  const[rDue,setRDue]=useState(isoD(addD(now(),30)));
  const{patients,appointments,recalls}=state;
  const pList=Object.values(patients);
  const filtered=q.trim()?pList.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.phone.includes(q)):pList;
  const sel=selId?patients[selId]:null;
  const selAps=sel?Object.values(appointments).filter(a=>a.patientId===sel.id).sort((a,b)=>b.dt-a.dt):[];
  const selRcls=sel?Object.values(recalls).filter(r=>r.patientId===sel.id):[];

  const open=p=>{setSelId(p.id);setNotes(p.notes||"");setTab("Overview");};

  const createRecall=()=>{
    const months=rType==="3-month check-up"?3:rType==="6-month check-up"?6:null;
    const due=months?isoD(addD(now(),months*30)):rDue;
    const type=rType==="Custom"?rLabel:rType;
    dispatch({type:"ADD_RECALL",r:{id:uid(),patientId:selId,dueDate:due,type,status:"Pending",lastSent:null}});
    toast("Recall created");
  };

  return(
    <div className="fade-up">
      <H size={32} style={{marginBottom:26}}>Patients</H>
      <div style={{display:"grid",gridTemplateColumns:sel?"1fr 400px":"1fr",gap:18,alignItems:"start"}}>
        <div>
          <div style={{position:"relative",marginBottom:13}}>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",color:T.muted,pointerEvents:"none"}}>🔍</span>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search by name or phone…" style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:12,padding:"11px 14px 11px 40px",fontSize:14,fontFamily:"Sora",background:T.white,outline:"none",color:T.text,transition:"border 0.15s,box-shadow 0.15s"}}/>
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            {filtered.length===0
              ?<div style={{padding:36,textAlign:"center",color:T.muted}}>No patients found.</div>
              :filtered.map((p,i)=>{
                const vc=Object.values(appointments).filter(a=>a.patientId===p.id).length;
                const lastAp=Object.values(appointments).filter(a=>a.patientId===p.id).sort((a,b)=>b.dt-a.dt)[0];
                return(
                  <div key={p.id} className="row-hover" onClick={()=>open(p)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"15px 22px",cursor:"pointer",borderBottom:i<filtered.length-1?`1px solid ${T.border}`:"none",borderLeft:p.id===selId?`3px solid ${T.gold}`:"3px solid transparent",background:p.id===selId?`${T.gold}06`:T.white,transition:"all 0.13s"}}>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <Av name={p.name} size={40}/>
                      <div>
                        <div style={{fontWeight:600,fontSize:14,color:T.text}}>{p.name}</div>
                        <div style={{fontSize:12,color:T.muted,marginTop:2}}>📞 {p.phone}</div>
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
          <div className="slide-right" style={{display:"flex",flexDirection:"column",gap:14}}>
            <Card style={{padding:0,overflow:"hidden",position:"sticky",top:20}}>
              <div style={{background:`linear-gradient(135deg,${T.sidebar},${T.sidebarL})`,padding:"22px 22px 18px",position:"relative"}}>
                <button onClick={()=>setSelId(null)} style={{position:"absolute",top:13,right:13,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",width:26,height:26,borderRadius:"50%",cursor:"pointer",fontSize:17,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
                <Av name={sel.name} size={50}/>
                <H size={21} style={{color:"#fff",marginTop:11}}>{sel.name}</H>
                <div style={{display:"flex",gap:12,marginTop:5,fontSize:12,color:"rgba(255,255,255,0.55)"}}>
                  <span>📞 {sel.phone}</span>
                  {sel.email&&<span>✉️ {sel.email}</span>}
                </div>
              </div>
              <div style={{display:"flex",borderBottom:`1px solid ${T.border}`}}>
                {["Overview","Visits","Recalls"].map(t=>(
                  <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:"12px 0",border:"none",cursor:"pointer",fontFamily:"Sora",fontSize:13,fontWeight:tab===t?600:400,color:tab===t?T.gold:T.muted,background:T.white,borderBottom:tab===t?`2px solid ${T.gold}`:"2px solid transparent",transition:"all 0.15s"}}>{t}</button>
                ))}
              </div>
              <div style={{padding:"18px 20px",maxHeight:440,overflowY:"auto"}}>
                {tab==="Overview"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:13}}>
                    {canSeeClinical
                      ? <>
                          <Txta label="Clinical Notes" value={notes} onChange={e=>setNotes(e.target.value)} style={{height:100}}/>
                          <Btn v="gold" sm onClick={()=>{dispatch({type:"PATCH_PATIENT",id:sel.id,patch:{notes}});toast("Notes saved");}}>Save Notes</Btn>
                        </>
                      : <div style={{background:T.amberBg,borderLeft:`3px solid ${T.amber}`,borderRadius:"0 10px 10px 0",padding:"12px 14px",fontSize:13,color:T.text2}}>
                          🔒 Clinical notes are only visible to doctors and admin.
                        </div>
                    }
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      <div style={{background:T.bg,borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Total Visits</div><H size={30} style={{marginTop:4,color:T.gold}}>{selAps.length}</H></div>
                      <div style={{background:T.bg,borderRadius:10,padding:"12px 14px"}}><div style={{fontSize:10,fontWeight:600,color:T.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>Recalls</div><H size={30} style={{marginTop:4,color:T.gold}}>{selRcls.length}</H></div>
                    </div>
                  </div>
                )}
                {tab==="Visits"&&(selAps.length===0?<div style={{color:T.muted,fontSize:14,textAlign:"center",padding:"20px 0"}}>No visits yet.</div>:selAps.map(ap=>(
                  <div key={ap.id} style={{padding:"12px 0",borderBottom:`1px solid ${T.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:600,fontSize:14}}>{ap.service}</div>
                      <Sbadge status={ap.status}/>
                    </div>
                    <div style={{fontSize:12,color:T.muted,marginTop:3}}>{fmtDT(ap.dt)} · {ap.dentist.split(" ").slice(0,2).join(" ")}</div>
                    {ap.clinicalNote&&<div style={{fontSize:13,color:T.text2,marginTop:5,fontStyle:"italic"}}>{ap.clinicalNote}</div>}
                  </div>
                )))}
                {tab==="Recalls"&&(
                  <div style={{display:"flex",flexDirection:"column",gap:12}}>
                    {selRcls.map(r=>{
                      const days=Math.ceil((pDate(r.dueDate)-today())/86400000);
                      return <div key={r.id} style={{background:T.bg,borderRadius:10,padding:"12px 13px",borderLeft:`3px solid ${days<0?T.red:days<=3?T.amber:T.green}`}}><div style={{fontWeight:600,fontSize:13}}>{r.type}</div><div style={{fontSize:12,color:T.muted,marginTop:2}}>{fmtD(pDate(r.dueDate))}</div><div style={{fontSize:12,fontWeight:600,marginTop:3,color:days<0?T.red:days<=3?T.amber:T.green}}>{days<0?`${Math.abs(days)}d overdue`:days===0?"Today":`${days}d left`}</div></div>;
                    })}
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

/* ════════════════════════════════════════════════
   FOLLOW-UPS
════════════════════════════════════════════════ */
function Followups({state,dispatch,toast}){
  const[filter,setFilter]=useState("Due Soon");
  const{patients,recalls}=state;
  const sendWA=useWASend(state,dispatch,toast);
  const todayD=today();

  const rows=Object.values(recalls).filter(r=>{
    const days=Math.ceil((pDate(r.dueDate)-todayD)/86400000);
    if(filter==="Due Soon") return r.status==="Pending"&&days<=14;
    if(filter==="Pending")  return r.status==="Pending";
    return true;
  }).sort((a,b)=>pDate(a.dueDate)-pDate(b.dueDate));

  const send=r=>{
    const p=patients[r.patientId];
    sendWA({phone:p?.phone||"",name:p?.name||"",kind:"RECALL",recallType:r.type});
    dispatch({type:"PATCH_RECALL",id:r.id,patch:{lastSent:now()}});
  };

  return(
    <div className="fade-up">
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:26}}>
        <H size={32}>Follow-ups & Recalls</H>
        <Tabs opts={["Due Soon","Pending","All"]} val={filter} onChange={setFilter}/>
      </div>
      {rows.length===0
        ?<Card style={{padding:52,textAlign:"center"}}><div style={{fontSize:36,marginBottom:14}}>🔔</div><H size={22} style={{color:T.muted}}>No recalls in this filter</H></Card>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {rows.map(r=>{
            const p=patients[r.patientId];
            const days=Math.ceil((pDate(r.dueDate)-todayD)/86400000);
            const urgent=days<0,soon=days>=0&&days<=3;
            const ac=urgent?T.red:soon?T.amber:T.green;
            const abg=urgent?T.redBg:soon?T.amberBg:T.greenBg;
            return(
              <Card key={r.id} style={{padding:"18px 24px",borderLeft:`4px solid ${ac}`}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",gap:14,alignItems:"center"}}>
                    <Av name={p?.name||"?"} size={44}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:15,color:T.text}}>{p?.name||"Unknown"}</div>
                      <div style={{fontSize:13,color:T.muted,margin:"2px 0"}}>{r.type}</div>
                      <div style={{display:"flex",gap:12,alignItems:"center",marginTop:5}}>
                        <div style={{fontSize:12,color:T.muted}}>Due: {fmtD(pDate(r.dueDate))}</div>
                        <div style={{fontSize:12,fontWeight:700,color:ac,background:abg,padding:"2px 10px",borderRadius:99}}>{urgent?`${Math.abs(days)}d overdue`:days===0?"Today":`${days}d`}</div>
                        {r.lastSent&&<div style={{fontSize:11,color:T.muted}}>Last sent: {fmtD(r.lastSent)}</div>}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <div style={{textAlign:"right",marginRight:6}}>
                      <div style={{fontSize:12,color:T.muted}}>📞 {p?.phone}</div>
                      <div style={{fontSize:11,color:T.muted,marginTop:2}}>→ {toWA(p?.phone||"")}</div>
                    </div>
                    <Btn v="wa" sm onClick={()=>send(r)}>💬 Send</Btn>
                    {r.status==="Pending"&&<Btn v="success" sm onClick={()=>dispatch({type:"PATCH_RECALL",id:r.id,patch:{status:"Completed"}})}>✓ Done</Btn>}
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

/* ════════════════════════════════════════════════
   MESSAGES
════════════════════════════════════════════════ */
function Messages({state}){
  const{messages}=state;
  return(
    <div className="fade-up">
      <H size={32} style={{marginBottom:26}}>Message Log</H>
      {messages.length===0
        ?<Card style={{padding:52,textAlign:"center"}}><div style={{fontSize:36,marginBottom:14}}>💬</div><H size={22} style={{color:T.muted}}>No messages yet</H><div style={{color:T.muted,fontSize:14,marginTop:8}}>Trigger WhatsApp sends from Appointments or Follow-ups.</div></Card>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {messages.map((m,i)=>{
            const ok=m.status?.startsWith("Delivered")||m.status?.startsWith("SENT");
            const fail=m.status?.startsWith("Fail")||m.status?.startsWith("FAIL");
            const mock=m.status==="Mock";
            return(
              <Card key={i} style={{padding:"16px 22px"}}>
                <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                  <div style={{width:42,height:42,borderRadius:"50%",background:"rgba(37,211,102,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>💬</div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:10}}>
                      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                        <span style={{fontWeight:600,fontSize:14,color:T.text}}>WhatsApp</span>
                        <span style={{fontSize:12,color:T.muted}}>→ {m.to}</span>
                        <span style={{fontSize:11,fontWeight:600,color:T.muted,background:T.bg,padding:"2px 8px",borderRadius:6,textTransform:"uppercase",letterSpacing:"0.06em"}}>{m.kind}</span>
                      </div>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span style={{fontSize:12,fontWeight:600,color:ok?T.wa:fail?T.red:mock?T.amber:T.muted}}>{ok?"✓✓ Delivered":fail?"✗ Failed":mock?"◎ Mock":"⏳ Sending"}</span>
                        <span style={{fontSize:11,color:T.muted}}>{fmtDT(m.time)}</span>
                      </div>
                    </div>
                    <div style={{background:"#ECE5DD",borderRadius:"4px 14px 14px 14px",padding:"10px 14px",maxWidth:420,direction:"rtl",textAlign:"right"}}>
                      <div style={{fontSize:13,lineHeight:1.7,color:"#111",fontFamily:"Sora"}}>
                        {m.body.split("\n").map((l,j)=><div key={j}>{l||<br/>}</div>)}
                      </div>
                      <div style={{marginTop:5,fontSize:10,color:"#999",textAlign:"left",direction:"ltr"}}>{ok&&<span style={{color:T.wa}}>✓✓ </span>}{fmtT(m.time)}</div>
                    </div>
                    {m.wamid&&<div style={{fontSize:10,color:T.muted,marginTop:5}}>Message ID: {m.wamid}</div>}
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

/* ════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════ */
function Settings({state,dispatch,toast}){
  const{waConfig}=state;
  const[pid,setPid]=useState(waConfig.phoneNumberId);
  const[tkn,setTkn]=useState(waConfig.accessToken);
  const[live,setLive]=useState(waConfig.enabled);
  const[tp,setTp]=useState("");
  const[sending,setSending]=useState(false);

  const save=()=>{dispatch({type:"PATCH_WA",patch:{phoneNumberId:pid.trim(),accessToken:tkn.trim(),enabled:live}});toast("Settings saved");};
  const test=async()=>{
    if(!pid||!tkn||!tp){toast("Fill credentials + test phone.");return;}
    setSending(true);
    try{await callWA({phoneNumberId:pid.trim(),accessToken:tkn.trim(),to:tp,body:"🦷 LifeDent CRM — اختبار الاتصال. يعمل بشكل صحيح! ✅"});toast("Test sent! Check your phone.");}
    catch(e){toast(`❌ ${e.message}`);}
    finally{setSending(false);}
  };

  return(
    <div className="fade-up">
      <H size={32} style={{marginBottom:6}}>Settings</H>
      <div style={{color:T.muted,fontSize:14,marginBottom:26}}>WhatsApp Business API configuration</div>

      <div style={{padding:"15px 20px",borderRadius:14,marginBottom:24,background:live?"#E8FAF1":T.amberBg,border:`1px solid ${live?"#25D36630":T.amber+"30"}`,display:"flex",alignItems:"center",gap:14}}>
        <span style={{fontSize:24}}>{live?"✅":"⚙️"}</span>
        <div>
          <div style={{fontWeight:700,fontSize:15,color:T.text}}>{live?"Live — real WhatsApp messages will be sent":"Mock mode — safe for demo, no real messages"}</div>
          <div style={{fontSize:13,color:T.muted,marginTop:2}}>{live?"Phone Number ID configured · Token ready":"Configure credentials below and enable to go live."}</div>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1.1fr 0.9fr",gap:20,marginBottom:20}}>
        <Card style={{padding:"26px 28px"}}>
          <H size={20} style={{marginBottom:20}}>Meta Credentials</H>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Inp label="Phone Number ID" value={pid} onChange={e=>setPid(e.target.value)} placeholder="e.g. 123456789012345"/>
            <div>
              <Lbl>Access Token (System User)</Lbl>
              <textarea value={tkn} onChange={e=>setTkn(e.target.value)} placeholder="EAAxxxxx… (permanent system user token)" style={{width:"100%",border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 14px",fontSize:13,fontFamily:"Sora",resize:"vertical",height:88,background:"#FDFCFA",outline:"none",color:T.text,transition:"border 0.15s,box-shadow 0.15s"}}/>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:14,cursor:"pointer",padding:"14px 16px",background:T.bg,borderRadius:12}} onClick={()=>setLive(v=>!v)}>
              <div style={{width:46,height:26,borderRadius:13,position:"relative",background:live?T.wa:T.border,transition:"background 0.2s",flexShrink:0}}>
                <div style={{position:"absolute",top:3,left:live?23:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.2)"}}/>
              </div>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:T.text}}>{live?"Live Mode":"Mock Mode"}</div>
                <div style={{fontSize:12,color:T.muted,marginTop:1}}>{live?"Messages sent via Meta API":"Logged only, nothing sent"}</div>
              </div>
            </label>
            <Btn v="gold" onClick={save}>💾 Save Settings</Btn>
          </div>
        </Card>

        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card style={{padding:"22px 24px"}}>
            <H size={18} style={{marginBottom:16}}>Send Test Message</H>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Inp label="Test Phone Number" value={tp} onChange={e=>setTp(e.target.value)} placeholder="01012345678"/>
              {tp&&<div style={{fontSize:12,color:T.muted,background:T.bg,borderRadius:8,padding:"8px 12px"}}>Will send to: <strong style={{color:T.text}}>{toWA(tp)}</strong></div>}
              <Btn v="wa" onClick={test} disabled={sending}>{sending?"Sending…":"📤 Send Test"}</Btn>
            </div>
          </Card>
          <Card style={{padding:"22px 24px",background:T.sidebar,border:"none"}}>
            <div style={{fontFamily:"'Cormorant Garamond',serif",fontStyle:"italic",fontSize:17,color:T.goldL,marginBottom:14}}>Setup Checklist</div>
            {["Create Meta Business account","Add WhatsApp Business API product","Get Phone Number ID from dashboard","Generate a permanent System User token","Submit Arabic templates for Meta approval","Register clinic number — patients see clinic name"].map((t,i)=>(
              <div key={i} style={{display:"flex",gap:10,marginBottom:10,alignItems:"flex-start"}}>
                <div style={{width:20,height:20,borderRadius:"50%",background:T.gold,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",flexShrink:0,marginTop:1}}>{i+1}</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,0.65)",lineHeight:1.55}}>{t}</div>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Card style={{padding:"24px 28px"}}>
        <H size={20} style={{marginBottom:20}}>Message Template Previews</H>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
          {[
            {label:"Confirmation", body:WA.CONFIRMATION("Sara Ahmed","Tue 15 Apr","10:00 AM")},
            {label:"24h Reminder", body:WA.REMINDER("Omar Hassan","Wed 16 Apr","02:30 PM")},
            {label:"Recall",       body:WA.RECALL("Nour El-Din","6-month check-up")},
          ].map(t=>(
            <div key={t.label}>
              <div style={{fontSize:11,fontWeight:700,color:T.muted,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:10}}>{t.label}</div>
              <div style={{background:"#1A1A1A",borderRadius:22,padding:"12px 8px",boxShadow:"0 8px 32px rgba(0,0,0,0.18)"}}>
                <div style={{background:"#ECE5DD",borderRadius:14,padding:"10px 8px",minHeight:120}}>
                  <div style={{background:"#DCF8C6",borderRadius:"4px 12px 12px 12px",padding:"9px 12px",margin:"0 4px",direction:"rtl",textAlign:"right"}}>
                    <div style={{fontSize:12,lineHeight:1.7,color:"#111",fontFamily:"Sora"}}>{t.body.split("\n").map((l,j)=><div key={j}>{l||<br/>}</div>)}</div>
                    <div style={{fontSize:10,color:"#999",textAlign:"left",direction:"ltr",marginTop:4}}>{fmtT(now())} <span style={{color:T.wa}}>✓✓</span></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{marginTop:16,padding:"12px 16px",background:T.amberBg,borderLeft:`3px solid ${T.amber}`,borderRadius:"0 10px 10px 0",fontSize:13,color:T.text2}}>
          ⚠️ Templates must be submitted to Meta for approval before use as business-initiated messages outside the 24h reply window.
        </div>
      </Card>
    </div>
  );
}

/* ════════════════════════════════════════════════
   SIDEBAR
════════════════════════════════════════════════ */
const NAV=[
  {key:"Dashboard",    icon:"◈", label:"Dashboard"},
  {key:"Appointments", icon:"◷", label:"Appointments"},
  {key:"NewAppt",      icon:"＋", label:"New Appointment"},
  {key:"Patients",     icon:"◎", label:"Patients"},
  {key:"Followups",    icon:"◉", label:"Follow-ups"},
  {key:"Messages",     icon:"✦", label:"Messages"},
  {key:"Settings",     icon:"◐", label:"Settings"},
];

const TOOTH=`url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 6 C20 6 12 13 12 22 C12 30 15 36 18 42 L21 54 C21 55.5 22.5 57 24 57 C25.5 57 27 55.5 27 54 L27 46 C27 44 28.5 42.5 30 42.5 C31.5 42.5 33 44 33 46 L33 54 C33 55.5 34.5 57 36 57 C37.5 57 39 55.5 39 54 L42 42 C45 36 48 30 48 22 C48 13 40 6 30 6Z' fill='white' fill-opacity='0.025'/%3E%3C/svg%3E")`;

function Sidebar({page,setPage,state}){
  const{patients,appointments,recalls,messages,waConfig}=state;
  const pendingR=Object.values(recalls).filter(r=>r.status==="Pending").length;
  return(
    <aside style={{width:224,background:T.sidebar,display:"flex",flexDirection:"column",flexShrink:0,height:"100vh",position:"sticky",top:0,overflowY:"auto",backgroundImage:TOOTH,backgroundSize:"60px 60px"}}>
      <div style={{padding:"26px 20px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:11}}>
          <div style={{width:42,height:42,borderRadius:13,background:`linear-gradient(135deg,${T.gold},${T.goldL})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,boxShadow:`0 4px 16px ${T.gold}50`}}>🦷</div>
          <div>
            <div style={{fontFamily:"'Cormorant Garamond',serif",color:"#F0EDE6",fontSize:20,fontWeight:600,lineHeight:1}}>LifeDent</div>
            <div style={{color:T.gold+"99",fontSize:10.5,marginTop:3,fontFamily:"Sora",letterSpacing:"0.05em"}}>Clinic CRM</div>
          </div>
        </div>
      </div>

      <nav style={{padding:"14px 10px",flex:1}}>
        {NAV.map(n=>{
          const active=page===n.key;
          const badge=n.key==="Followups"&&pendingR>0?pendingR:null;
          return(
            <button key={n.key} onClick={()=>setPage(n.key)} className="nav-btn"
              style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",padding:"10px 12px",borderRadius:10,border:"none",cursor:"pointer",marginBottom:2,fontFamily:"Sora",fontSize:13.5,fontWeight:active?600:400,textAlign:"left",background:active?`${T.gold}1A`:"transparent",color:active?T.goldL:"rgba(255,255,255,0.5)",borderLeft:active?`2px solid ${T.gold}`:"2px solid transparent"}}>
              <span style={{display:"flex",alignItems:"center",gap:9}}><span style={{fontSize:13,opacity:0.75}}>{n.icon}</span>{n.label}</span>
              {badge&&<span style={{background:T.red,color:"#fff",fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:99}}>{badge}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{padding:"14px 18px 22px",borderTop:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{fontSize:10,fontWeight:600,color:"rgba(255,255,255,0.22)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:12}}>Overview</div>
        {[["Patients",Object.keys(patients).length],["Appointments",Object.keys(appointments).length],["Messages",messages.length]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12,color:"rgba(255,255,255,0.4)"}}>
            <span>{l}</span>
            <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:16,fontWeight:600,color:T.goldL}}>{v}</span>
          </div>
        ))}
        <div style={{marginTop:14,padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:8,fontSize:11,color:"rgba(255,255,255,0.28)",textAlign:"center"}}>
          {waConfig.enabled?<><span style={{color:T.wa}}>●</span> WhatsApp Live</>:<><span style={{color:T.amber}}>●</span> Mock · Settings</>}
        </div>
      </div>
    </aside>
  );
}

/* ════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════ */
export default function CRM({ role = "admin", canSeeClinical = true, userFullName = "" }){
  const[st,setSt]=useState(()=>seed());
  const dispatch=useCallback(a=>setSt(prev=>reducer(prev,a)),[]);
  const[page,setPage]=useState("Dashboard");
  const[toast,setToast]=useState("");
  const showToast=useCallback(msg=>{setToast(msg);setTimeout(()=>setToast(""),3000);},[]);

  return(
    <>
      <style>{G}</style>
      <div style={{display:"flex",height:"100vh",fontFamily:"'Sora',sans-serif",overflow:"hidden"}}>
        <Sidebar page={page} setPage={setPage} state={st}/>
        <main style={{flex:1,overflowY:"auto",padding:"36px 40px",background:T.bg,minWidth:0}}>
          {page==="Dashboard"    && <Dashboard    state={st} userFullName={userFullName}/>}
          {page==="Appointments" && <Appointments state={st} dispatch={dispatch} toast={showToast} canSeeClinical={canSeeClinical}/>}
          {page==="NewAppt"      && <NewAppt      state={st} dispatch={dispatch} toast={showToast} setPage={setPage}/>}
          {page==="Patients"     && <Patients     state={st} dispatch={dispatch} toast={showToast} canSeeClinical={canSeeClinical}/>}
          {page==="Followups"    && <Followups    state={st} dispatch={dispatch} toast={showToast}/>}
          {page==="Messages"     && <Messages     state={st}/>}
          {page==="Settings"     && <Settings     state={st} dispatch={dispatch} toast={showToast}/>}
        </main>
      </div>
      <Toast msg={toast} onClose={()=>setToast("")}/>
    </>
  );
}
