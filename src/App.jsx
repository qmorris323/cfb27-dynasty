import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./supabase.js";

// ── constants ──────────────────────────────────────────────────────────────────
const POSITIONS = ["QB","HB","FB","WR","TE","OT","OG","C","DE","DT","OLB","MLB","CB","FS","SS","K","P"];
const POSITION_TARGETS = { QB:4, HB:5, FB:0, WR:8, TE:4, OT:8, OG:6, C:3, DE:8, DT:5, OLB:8, MLB:6, CB:8, FS:5, SS:5, K:1, P:1 };
const CLASSES = ["FR","SO","JR","SR","Graduate"];
const DEV_TRAITS = ["Elite","Star","Impact","Normal"];
const STAR_LEVELS = ["5 Star","4 Star","3 Star","2 Star","1 Star"];
const GEM_BUST = ["Normal","GEM","Bust"];
const ORIGINS = ["Recruit","Transfer","Walk On","Original"];
const DEALBREAKERS = ["A","B+","B","C+","C","D+","D"];
const SPEND_CATEGORIES = ["NIL","Facilities","Staff","Equipment","Other"];
const AD_STATUSES = ["On Track","At Risk","Met","Failed"];
const ARCHETYPES = {
  QB:["Scrambler","Pocket Passer","Strong Arm","Field General"],
  HB:["Elusive Back","Power Back","Receiving Back"],
  FB:["Blocking Back","Receiving Back"],
  WR:["Deep Threat","Slot","Physical","Route Runner"],
  TE:["Vertical Threat","Blocking","Hybrid"],
  OT:["Agile","Power"], OG:["Agile","Power"],
  C:["Agile","Pass Protector","Power"],
  DE:["Speed Rusher","Power Rusher"],
  DT:["Run Stopper","Power Rusher","Pass Rusher"],
  OLB:["Speed Rusher","Power Rusher","Pass Coverage"],
  MLB:["Run Stopper","Pass Coverage","Field General"],
  CB:["Slot","Zone","Man To Man"],
  FS:["Hybrid","Zone","Run Support"],
  SS:["Hybrid","Run Support","Zone"],
  K:["Accurate","Power"], P:["Accurate","Power"],
};
const CLASS_ORDER = { FR:0, SO:1, JR:2, SR:3, Graduate:4 };
const DEV_COLOR = { Elite:"#f59e0b", Star:"#60a5fa", Impact:"#34d399", Normal:"#94a3b8" };
const STAR_COLOR = { "5 Star":"#f59e0b","4 Star":"#60a5fa","3 Star":"#94a3b8","2 Star":"#78716c","1 Star":"#6b7280" };
const AD_STATUS_COLOR = { "On Track":"#34d399","At Risk":"#f59e0b","Met":"#60a5fa","Failed":"#ef4444" };

const EMPTY_PLAYER = {
  id:null, pos:"QB", name:"", class:"FR", redshirt:false, devTrait:"Normal",
  stars:"4 Star", gemBust:"Normal", baseOVR:"", ovr:"", arch:"", skillCaps:"",
  origin:"Recruit", nilDeal:"", nilDemand:"", dealbreaker:"", portalRisk:false,
  draftRisk:false, startingOVR:"", notes:""
};

const EMPTY_PROGRAM = {
  dynastyPoints:"", spendLog:[],
  adGoals:[{id:"1",label:"",status:"On Track"},{id:"2",label:"",status:"On Track"},{id:"3",label:"",status:"On Track"}],
  adHistory:[],
};

let _id = Date.now();
const uid = () => String(++_id);
const advanceClass = c => ({FR:"SO",SO:"JR",JR:"SR",SR:"Graduate"}[c]||c);
const ovrChange = p => { const b=Number(p.baseOVR),c=Number(p.ovr); return (b&&c)?c-b:null; };
const nilAtRisk = p => { const d=Number(p.nilDeal),dm=Number(p.nilDemand); return d>0&&dm>0&&dm>d; };
const toBase64 = file => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=()=>rej(new Error("Read failed")); r.readAsDataURL(file); });

// ── Auth Screen ────────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const inp = { width:"100%", background:"#1e293b", color:"#f1f5f9", border:"1px solid #334155", borderRadius:7, padding:"10px 14px", fontSize:14, boxSizing:"border-box", outline:"none" };

  const handle = async () => {
    setLoading(true); setError(""); setMessage("");
    try {
      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuth(data.user);
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Check your email for a confirmation link, then come back to log in.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage("Password reset email sent — check your inbox.");
        setMode("login");
      }
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#020617", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Inter',system-ui,sans-serif", padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>🏈</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#f8fafc" }}>CFB 27 Dynasty</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:4 }}>Roster & Recruiting Manager</div>
        </div>
        <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:28 }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#f8fafc", marginBottom:20 }}>
            {mode==="login"?"Sign In":mode==="signup"?"Create Account":"Reset Password"}
          </div>
          {error && <div style={{ background:"#1a0a0a", border:"1px solid #7f1d1d", borderRadius:7, padding:"10px 14px", color:"#fca5a5", fontSize:13, marginBottom:16 }}>{error}</div>}
          {message && <div style={{ background:"#052e16", border:"1px solid #065f46", borderRadius:7, padding:"10px 14px", color:"#34d399", fontSize:13, marginBottom:16 }}>{message}</div>}
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:5 }}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} placeholder="you@example.com" onKeyDown={e=>e.key==="Enter"&&handle()} />
          </div>
          {mode !== "reset" && (
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, color:"#64748b", display:"block", marginBottom:5 }}>Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} style={inp} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handle()} />
            </div>
          )}
          <button onClick={handle} disabled={loading}
            style={{ width:"100%", background:"#3b82f6", color:"#fff", border:"none", borderRadius:7, padding:"11px", fontWeight:700, fontSize:14, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
            {loading?"Loading...":(mode==="login"?"Sign In":mode==="signup"?"Create Account":"Send Reset Email")}
          </button>
          <div style={{ marginTop:16, display:"flex", flexDirection:"column", gap:8, alignItems:"center" }}>
            {mode==="login" && <>
              <button onClick={()=>setMode("signup")} style={{ background:"none", border:"none", color:"#60a5fa", cursor:"pointer", fontSize:13 }}>Don't have an account? Sign up</button>
              <button onClick={()=>setMode("reset")} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:12 }}>Forgot password?</button>
            </>}
            {mode!=="login" && <button onClick={()=>setMode("login")} style={{ background:"none", border:"none", color:"#60a5fa", cursor:"pointer", fontSize:13 }}>Back to sign in</button>}
          </div>
        </div>
        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#334155" }}>
          Your roster data is private and only accessible to you
        </div>
      </div>
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ label, color, bg }) {
  return <span style={{ background:bg||"#1e293b", color:color||"#94a3b8", padding:"1px 7px", borderRadius:4, fontSize:11, fontWeight:600, whiteSpace:"nowrap" }}>{label}</span>;
}

function StatBox({ label, value, sub, accent }) {
  return (
    <div style={{ background:"#0f172a", border:`1px solid ${accent||"#1e293b"}`, borderRadius:8, padding:"12px 16px", minWidth:90 }}>
      <div style={{ fontSize:22, fontWeight:700, color:accent||"#f8fafc" }}>{value}</div>
      <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:1 }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

// ── PlayerForm ─────────────────────────────────────────────────────────────────
function PlayerForm({ initial, onSave, onCancel }) {
  const [p, setP] = useState({ ...EMPTY_PLAYER, ...initial, id:initial?.id||uid() });
  const set = (k,v) => setP(prev=>({...prev,[k]:v}));
  const inp = { background:"#1e293b", color:"#f1f5f9", border:"1px solid #334155", borderRadius:5, padding:"5px 8px", fontSize:13, width:"100%", boxSizing:"border-box" };
  const nilRisk = nilAtRisk(p);
  return (
    <div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:20, marginBottom:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))", gap:10 }}>
        {[["Position","pos","sel",POSITIONS],["Name","name","txt"],["Class","class","sel",CLASSES],
          ["Dev Trait","devTrait","sel",DEV_TRAITS],["Stars","stars","sel",STAR_LEVELS],["GEM/Bust","gemBust","sel",GEM_BUST],
          ["Archetype","arch","sel",ARCHETYPES[p.pos]||[]],["Origin","origin","sel",ORIGINS],
          ["Baseline OVR","baseOVR","num"],["Current OVR","ovr","num"],["Starting OVR","startingOVR","num"],
          ["Skill Caps","skillCaps","num"],["Dealbreaker","dealbreaker","sel",DEALBREAKERS],
        ].map(([lbl,key,type,opts])=>(
          <div key={key}>
            <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>{lbl}</label>
            {type==="sel"?<select value={p[key]||""} onChange={e=>set(key,e.target.value)} style={inp}><option value="">—</option>{(opts||[]).map(o=><option key={o}>{o}</option>)}</select>
            :<input type={type==="num"?"number":"text"} value={p[key]||""} onChange={e=>set(key,e.target.value)} style={inp} />}
          </div>
        ))}
        <div>
          <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>NIL Deal (pts)</label>
          <input type="number" value={p.nilDeal||""} onChange={e=>set("nilDeal",e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{ fontSize:11, color:nilRisk?"#f87171":"#64748b", display:"block", marginBottom:3 }}>NIL Demand{nilRisk?" ⚠":""}</label>
          <input type="number" value={p.nilDemand||""} onChange={e=>set("nilDemand",e.target.value)} style={{ ...inp, borderColor:nilRisk?"#ef4444":"#334155" }} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", justifyContent:"flex-end", gap:6 }}>
          {[["redshirt","Redshirt"],["portalRisk","Portal Risk"],["draftRisk","Draft Risk"]].map(([k,lbl])=>(
            <label key={k} style={{ fontSize:11, color:"#64748b", display:"flex", alignItems:"center", gap:6, cursor:"pointer" }}>
              <input type="checkbox" checked={!!p[k]} onChange={e=>set(k,e.target.checked)} />{lbl}
            </label>
          ))}
        </div>
      </div>
      <div style={{ marginTop:10 }}>
        <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Notes</label>
        <input value={p.notes||""} onChange={e=>set("notes",e.target.value)} style={inp} />
      </div>
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={()=>onSave(p)} style={{ background:"#3b82f6", color:"#fff", border:"none", borderRadius:6, padding:"7px 18px", cursor:"pointer", fontWeight:600 }}>{initial?.id?"Save Changes":"Add Player"}</button>
        <button onClick={onCancel} style={{ background:"#1e293b", color:"#94a3b8", border:"1px solid #334155", borderRadius:6, padding:"7px 18px", cursor:"pointer" }}>Cancel</button>
      </div>
    </div>
  );
}

// ── InlineCell ─────────────────────────────────────────────────────────────────
function InlineCell({ value, options, onSave }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const commit = () => { onSave(val); setEditing(false); };
  const inp = { background:"#1e293b", color:"#f1f5f9", border:"1px solid #3b82f6", borderRadius:4, padding:"2px 5px", fontSize:12, width:"100%" };
  if (!editing) return <span onClick={()=>setEditing(true)} style={{ cursor:"text", borderBottom:"1px dashed #334155" }} title="Click to edit">{value||"—"}</span>;
  if (options) return <select autoFocus value={val} onChange={e=>setVal(e.target.value)} onBlur={commit} style={inp}>{options.map(o=><option key={o}>{o}</option>)}</select>;
  return <input autoFocus value={val} onChange={e=>setVal(e.target.value)} onBlur={commit} onKeyDown={e=>e.key==="Enter"&&commit()} style={inp} />;
}

// ── Program Tab ────────────────────────────────────────────────────────────────
function ProgramTab({ program, setProgram, season }) {
  const [showAddSpend, setShowAddSpend] = useState(false);
  const [spend, setSpend] = useState({ amount:"", category:"NIL", note:"" });
  const inp = { background:"#1e293b", color:"#f1f5f9", border:"1px solid #334155", borderRadius:5, padding:"5px 8px", fontSize:13, width:"100%", boxSizing:"border-box" };
  const totalSpent = program.spendLog.reduce((a,s)=>a+Number(s.amount),0);
  const balance = Number(program.dynastyPoints)||0;
  const remaining = balance - totalSpent;
  const spentByCategory = SPEND_CATEGORIES.map(cat=>({ cat, total:program.spendLog.filter(s=>s.category===cat).reduce((a,s)=>a+Number(s.amount),0) }));
  const addSpend = () => {
    if (!spend.amount) return;
    setProgram(prev=>({...prev,spendLog:[...prev.spendLog,{id:uid(),...spend,season}]}));
    setSpend({amount:"",category:"NIL",note:""}); setShowAddSpend(false);
  };
  const updateGoal = (id,field,val) => setProgram(prev=>({...prev,adGoals:prev.adGoals.map(g=>g.id===id?{...g,[field]:val}:g)}));
  const metCount = program.adGoals.filter(g=>g.status==="Met").length;
  return (
    <div>
      <h2 style={{ color:"#60a5fa", marginBottom:20, fontWeight:700, fontSize:16 }}>Season {season} — Program Management</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:10, padding:20 }}>
          <div style={{ fontWeight:700, color:"#f59e0b", fontSize:14, marginBottom:16 }}>◆ Dynasty Points</div>
          <div style={{ display:"flex", gap:12, marginBottom:20, flexWrap:"wrap" }}>
            <div style={{ flex:1, minWidth:100 }}>
              <label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>Total Budget</label>
              <input type="number" value={program.dynastyPoints||""} placeholder="0" onChange={e=>setProgram(prev=>({...prev,dynastyPoints:e.target.value}))} style={{ ...inp, fontSize:18, fontWeight:700, color:"#f59e0b", padding:"8px 10px" }} />
            </div>
            <div style={{ flex:1, minWidth:100 }}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>Spent</label><div style={{ fontSize:18, fontWeight:700, color:"#ef4444", padding:"8px 0" }}>{totalSpent.toLocaleString()}</div></div>
            <div style={{ flex:1, minWidth:100 }}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:4 }}>Remaining</label><div style={{ fontSize:18, fontWeight:700, color:remaining<0?"#ef4444":"#10b981", padding:"8px 0" }}>{remaining.toLocaleString()}</div></div>
          </div>
          <div style={{ marginBottom:16 }}>
            {spentByCategory.map(s=>{ const pct=balance?Math.min(100,s.total/balance*100).toFixed(0):0; const colors={NIL:"#f59e0b",Facilities:"#34d399",Staff:"#60a5fa",Equipment:"#a78bfa",Other:"#64748b"}; return (
              <div key={s.cat} style={{ marginBottom:7 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}><span style={{ fontSize:12, color:colors[s.cat], fontWeight:600 }}>{s.cat}</span><span style={{ fontSize:12, color:"#64748b" }}>{s.total.toLocaleString()}</span></div>
                <div style={{ background:"#1e293b", height:4, borderRadius:2 }}><div style={{ width:`${pct}%`, background:colors[s.cat], height:4, borderRadius:2 }} /></div>
              </div>
            ); })}
          </div>
          {showAddSpend?(
            <div style={{ background:"#070c18", borderRadius:8, padding:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Amount</label><input type="number" value={spend.amount} onChange={e=>setSpend(s=>({...s,amount:e.target.value}))} style={inp} autoFocus /></div>
                <div><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Category</label><select value={spend.category} onChange={e=>setSpend(s=>({...s,category:e.target.value}))} style={inp}>{SPEND_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
              </div>
              <div style={{ marginBottom:8 }}><label style={{ fontSize:11, color:"#64748b", display:"block", marginBottom:3 }}>Note</label><input value={spend.note} onChange={e=>setSpend(s=>({...s,note:e.target.value}))} style={inp} placeholder="e.g. NIL deal for J. Smith" /></div>
              <div style={{ display:"flex", gap:8 }}><button onClick={addSpend} style={{ background:"#f59e0b", color:"#000", border:"none", borderRadius:5, padding:"6px 14px", cursor:"pointer", fontWeight:700, fontSize:12 }}>Log Spend</button><button onClick={()=>setShowAddSpend(false)} style={{ background:"#1e293b", color:"#94a3b8", border:"1px solid #334155", borderRadius:5, padding:"6px 12px", cursor:"pointer", fontSize:12 }}>Cancel</button></div>
            </div>
          ):<button onClick={()=>setShowAddSpend(true)} style={{ background:"#1e293b", color:"#f59e0b", border:"1px solid #92400e", borderRadius:6, padding:"6px 14px", cursor:"pointer", fontWeight:600, fontSize:12 }}>+ Log Spend</button>}
          {program.spendLog.length>0&&(
            <div style={{ marginTop:14 }}>
              <div style={{ fontSize:11, color:"#475569", marginBottom:6, textTransform:"uppercase", letterSpacing:.5 }}>Spend Log</div>
              <div style={{ maxHeight:160, overflowY:"auto" }}>
                {[...program.spendLog].reverse().map(s=>{ const colors={NIL:"#f59e0b",Facilities:"#34d399",Staff:"#60a5fa",Equipment:"#a78bfa",Other:"#64748b"}; return (
                  <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #0f172a", alignItems:"center" }}>
                    <div><span style={{ fontSize:11, color:colors[s.category], fontWeight:600, marginRight:6 }}>{s.category}</span><span style={{ fontSize:11, color:"#64748b" }}>{s.note||"—"}</span></div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#ef4444" }}>-{Number(s.amount).toLocaleString()}</span>
                      <button onClick={()=>setProgram(prev=>({...prev,spendLog:prev.spendLog.filter(x=>x.id!==s.id)}))} style={{ background:"none", border:"none", color:"#334155", cursor:"pointer", fontSize:11, padding:0 }}>✕</button>
                    </div>
                  </div>
                ); })}
              </div>
            </div>
          )}
        </div>
        <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:10, padding:20 }}>
          <div style={{ fontWeight:700, color:"#60a5fa", fontSize:14, marginBottom:4, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span>🎓 AD Expectations</span>
            <span style={{ fontSize:12, color:metCount===3?"#34d399":metCount===2?"#60a5fa":"#64748b", fontWeight:600 }}>{metCount}/3 Met</span>
          </div>
          <div style={{ fontSize:11, color:"#475569", marginBottom:16 }}>Season {season} goals</div>
          {program.adGoals.map((g,i)=>(
            <div key={g.id} style={{ background:"#070c18", borderRadius:8, padding:12, marginBottom:10, border:`1px solid ${AD_STATUS_COLOR[g.status]}22` }}>
              <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#475569", minWidth:20, paddingTop:2 }}>{i+1}.</div>
                <div style={{ flex:1 }}>
                  <input value={g.label} onChange={e=>updateGoal(g.id,"label",e.target.value)} placeholder={`Goal ${i+1}`} style={{ background:"transparent", border:"none", borderBottom:"1px solid #1e293b", color:"#f1f5f9", fontSize:13, width:"100%", outline:"none", padding:"2px 0", marginBottom:8 }} />
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                    {AD_STATUSES.map(st=>(
                      <button key={st} onClick={()=>updateGoal(g.id,"status",st)} style={{ padding:"3px 10px", borderRadius:12, border:`1px solid ${AD_STATUS_COLOR[st]}`, cursor:"pointer", fontSize:11, fontWeight:600, background:g.status===st?AD_STATUS_COLOR[st]+"33":"transparent", color:g.status===st?AD_STATUS_COLOR[st]:"#475569" }}>{st}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {program.adHistory.length>0&&(
            <div style={{ marginTop:16 }}>
              <div style={{ fontSize:11, color:"#475569", marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Past Seasons</div>
              {[...program.adHistory].reverse().map(h=>(
                <div key={h.season} style={{ marginBottom:8 }}>
                  <div style={{ fontSize:11, color:"#64748b", marginBottom:4 }}>Season {h.season}</div>
                  {h.goals.map((g,i)=>(
                    <div key={i} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:3 }}>
                      <span style={{ fontSize:11, color:AD_STATUS_COLOR[g.status] }}>●</span>
                      <span style={{ fontSize:11, color:"#64748b" }}>{g.label||`Goal ${i+1}`}</span>
                      <span style={{ fontSize:10, color:AD_STATUS_COLOR[g.status], fontWeight:600 }}>{g.status}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Screenshot Scanner ─────────────────────────────────────────────────────────
function ScreenshotScanner({ onAddPlayers }) {
  const [images, setImages] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState([]);
  const [selected, setSelected] = useState({});
  const [confirmed, setConfirmed] = useState({});
  const [error, setError] = useState("");

  const handleFiles = (files) => { const imgs=Array.from(files).filter(f=>f.type.startsWith("image/")); if(!imgs.length)return; setImages(prev=>[...prev,...imgs]); setError(""); };

  const scanAll = async () => {
    if (!images.length) return;
    setScanning(true); setError(""); setScanned([]);
    try {
      const imageContents = await Promise.all(images.map(async img => { const b64=await toBase64(img); return {type:"image",source:{type:"base64",media_type:img.type||"image/png",data:b64}}; }));
      const systemPrompt = `You are an expert data extractor for EA Sports College Football 27 (CFB 27) on PS5. Extract every visible player's data from the images provided — these may be native PS5 screenshots or phone photos of a TV screen.

Screen types:
- Depth Chart/Roster List: shows multiple players. Extract name, pos, OVR, class. Leave other fields empty.
- Player Profile Card: shows one player's full details. Extract everything visible including dev trait, stars, archetype, starting OVR, skill caps, dealbreaker, NIL values, portal/draft indicators.

For phone photos: work through glare, angles, moiré patterns. Make best inference for partially visible values.

Dev Trait: X-Factor=Elite, Superstar=Star, Impact=Impact, Normal=Normal
If same player appears in multiple images, merge data — profile card values take priority.

Return ONLY a valid JSON array, nothing else, no markdown:
[{"pos":"QB","name":"Player Name","class":"JR","ovr":"87","devTrait":"Star","stars":"4 Star","arch":"Pocket Passer","gemBust":"Normal","origin":"Recruit","redshirt":"false","baseOVR":"87","startingOVR":"87","skillCaps":"","nilDeal":"","nilDemand":"","dealbreaker":"","portalRisk":"false","draftRisk":"false","notes":""}]`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST",
        headers:{"Content-Type":"application/json","anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:8000, system:systemPrompt, messages:[{role:"user",content:[...imageContents,{type:"text",text:"Extract all players. Return only the JSON array."}]}] })
      });
      const data = await response.json();
      if (!response.ok||data.error) throw new Error("API: "+(data.error?.message||JSON.stringify(data).slice(0,300)));
      const raw = (data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
      if (!raw) throw new Error("Empty response from API");
      const jsonMatch = raw.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error("Could not parse response: "+raw.slice(0,200));
      const players = JSON.parse(jsonMatch[0]);
      const mapped = players.map(p=>({ id:uid(), pos:p.pos||"QB", name:p.name||"", class:p.class||"FR", redshirt:p.redshirt==="true", devTrait:p.devTrait||"Normal", stars:p.stars||"4 Star", gemBust:p.gemBust||"Normal", baseOVR:p.ovr||"", ovr:p.ovr||"", arch:p.arch||"", skillCaps:"", origin:p.origin||"Recruit", nilDeal:"", nilDemand:"", dealbreaker:"", portalRisk:false, draftRisk:false, startingOVR:p.ovr||"", notes:"" }));
      setScanned(mapped);
      const sel={}; mapped.forEach(p=>{sel[p.id]=true;}); setSelected(sel); setConfirmed({});
    } catch(err) { setError("Scan failed: "+(err.message||"Unknown error")); }
    finally { setScanning(false); }
  };

  const toggleSelect = id => setSelected(prev=>({...prev,[id]:!prev[id]}));
  const toggleAll = () => { const allOn=scanned.every(p=>selected[p.id]); const next={}; scanned.forEach(p=>{next[p.id]=!allOn;}); setSelected(next); };
  const updateScanned = (id,field,val) => { setScanned(prev=>prev.map(p=>p.id===id?{...p,[field]:val}:p)); setConfirmed(prev=>({...prev,[id]:false})); };
  const toggleConfirm = id => setConfirmed(prev=>({...prev,[id]:!prev[id]}));
  const confirmAll = () => { const next={}; scanned.filter(p=>selected[p.id]).forEach(p=>{next[p.id]=true;}); setConfirmed(prev=>({...prev,...next})); };
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const confirmedCount = scanned.filter(p=>selected[p.id]&&confirmed[p.id]).length;
  const addSelected = () => { onAddPlayers(scanned.filter(p=>selected[p.id]).map(p=>({...p,scanConfirmed:!!confirmed[p.id]}))); setScanned([]); setImages([]); setSelected({}); setConfirmed({}); };

  return (
    <div>
      <div style={{ background:"#0a1628", border:"1px solid #1e3a5f", borderRadius:8, padding:16, marginBottom:16 }}>
        <div style={{ fontWeight:700, color:"#60a5fa", marginBottom:8, fontSize:14 }}>📸 How to use the Scanner</div>
        <div style={{ color:"#94a3b8", fontSize:12, lineHeight:1.8 }}>
          <strong style={{color:"#f1f5f9"}}>Option A — Phone photo:</strong> Point your phone at the TV and snap a photo of any screen.<br/>
          <strong style={{color:"#f1f5f9"}}>Option B — PS5 screenshot:</strong> Press Share → Take Screenshot, transfer via PS App or USB.<br/>
          <strong style={{color:"#f1f5f9"}}>Best results:</strong> Depth chart = fast bulk load. <strong style={{color:"#f1f5f9"}}>Profile card</strong> = full details (dev trait, stars, archetype, etc).<br/>
          <span style={{color:"#64748b"}}>💡 Mix depth chart + profile card photos in one scan — data merges automatically.</span>
        </div>
      </div>
      <div onClick={()=>document.getElementById("ss-input").click()} onDrop={e=>{e.preventDefault();handleFiles(e.dataTransfer.files);}} onDragOver={e=>e.preventDefault()}
        style={{ border:"2px dashed #334155", borderRadius:10, padding:"32px 20px", textAlign:"center", cursor:"pointer", marginBottom:16, background:images.length?"#0a1628":"#070c18" }}
        onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"} onMouseLeave={e=>e.currentTarget.style.borderColor="#334155"}>
        <input id="ss-input" type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} />
        <div style={{ fontSize:32, marginBottom:8 }}>🖼</div>
        <div style={{ color:"#60a5fa", fontWeight:600, marginBottom:4 }}>Drop screenshots or phone photos here</div>
        <div style={{ color:"#475569", fontSize:12 }}>or tap to browse · PNG, JPG accepted · multiple files OK</div>
      </div>
      {images.length>0&&(<div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>{images.map((img,i)=>(<div key={i} style={{ position:"relative" }}><img src={URL.createObjectURL(img)} alt="" style={{ height:80, borderRadius:6, border:"1px solid #334155" }} /><button onClick={()=>setImages(prev=>prev.filter((_,j)=>j!==i))} style={{ position:"absolute", top:-6, right:-6, background:"#ef4444", border:"none", color:"#fff", borderRadius:"50%", width:18, height:18, cursor:"pointer", fontSize:11, lineHeight:"18px", padding:0 }}>✕</button></div>))}</div>)}
      {images.length>0&&!scanning&&scanned.length===0&&(<button onClick={scanAll} style={{ background:"#3b82f6", color:"#fff", border:"none", borderRadius:7, padding:"10px 24px", cursor:"pointer", fontWeight:700, fontSize:14, marginBottom:16 }}>🔍 Scan {images.length} Image{images.length>1?"s":""}</button>)}
      {scanning&&(<div style={{ background:"#0a1628", border:"1px solid #1e3a5f", borderRadius:8, padding:20, textAlign:"center", marginBottom:16 }}><div style={{ fontSize:24, marginBottom:8 }}>⚡</div><div style={{ color:"#60a5fa", fontWeight:600 }}>Reading player data…</div><div style={{ color:"#475569", fontSize:12, marginTop:4 }}>Usually 5–15 seconds</div></div>)}
      {error&&<div style={{ background:"#1a0a0a", border:"1px solid #7f1d1d", borderRadius:8, padding:12, marginBottom:16, color:"#fca5a5", fontSize:12 }}>{error}</div>}
      {scanned.length>0&&(
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
            <div style={{ fontWeight:700, color:"#f8fafc" }}>Found {scanned.length} players <span style={{ color:"#64748b", fontWeight:400, fontSize:12 }}>{selectedCount} selected</span> <span style={{ color:"#10b981", fontWeight:600, fontSize:12 }}>· {confirmedCount} confirmed</span></div>
            <div style={{ flex:1 }} />
            <button onClick={toggleAll} style={{ background:"#1e293b", color:"#94a3b8", border:"1px solid #334155", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>{scanned.every(p=>selected[p.id])?"Deselect All":"Select All"}</button>
            <button onClick={confirmAll} style={{ background:"#064e3b", color:"#34d399", border:"1px solid #065f46", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:600 }}>✓ Confirm All</button>
            <button onClick={addSelected} disabled={!selectedCount} style={{ background:selectedCount?"#3b82f6":"#1e293b", color:selectedCount?"#fff":"#475569", border:"none", borderRadius:6, padding:"7px 16px", cursor:selectedCount?"pointer":"default", fontWeight:700, fontSize:13 }}>Add {selectedCount} to Roster</button>
            <button onClick={()=>{setScanned([]);setImages([]);setSelected({});setConfirmed({});}} style={{ background:"#1e293b", color:"#94a3b8", border:"1px solid #334155", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontSize:12 }}>Clear</button>
          </div>
          <div style={{ display:"flex", gap:16, marginBottom:10, fontSize:11, color:"#64748b" }}>
            <span><span style={{ width:10, height:10, borderRadius:2, background:"#422006", display:"inline-block", marginRight:5 }} />Unreviewed</span>
            <span><span style={{ width:10, height:10, borderRadius:2, background:"#052e16", display:"inline-block", marginRight:5 }} />Confirmed</span>
            <span style={{ color:"#94a3b8" }}>Click any cell to edit</span>
          </div>
          <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #1e293b" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr style={{ background:"#0a0f1e" }}>{["✓","Pos","Name","Class","Dev","Stars","OVR","Arch","Origin","G/B","DB","Status"].map(h=>(<th key={h} style={{ padding:"8px 10px", fontSize:11, color:"#475569", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>))}</tr></thead>
              <tbody>
                {scanned.map(p=>{ const isConfirmed=!!confirmed[p.id]; const isSelected=!!selected[p.id]; return (
                  <tr key={p.id} style={{ background:!isSelected?"#040810":isConfirmed?"#021a0e":"#1a1000", borderBottom:"1px solid #0f172a", opacity:isSelected?1:0.4 }}>
                    <td style={{ padding:"7px 10px" }}><input type="checkbox" checked={isSelected} onChange={()=>toggleSelect(p.id)} style={{ cursor:"pointer" }} /></td>
                    <td style={{ padding:"7px 10px" }}><InlineCell value={p.pos} options={POSITIONS} onSave={v=>updateScanned(p.id,"pos",v)} /></td>
                    <td style={{ padding:"7px 10px", minWidth:130 }}><InlineCell value={p.name} onSave={v=>updateScanned(p.id,"name",v)} /></td>
                    <td style={{ padding:"7px 10px" }}><InlineCell value={p.class} options={CLASSES.filter(c=>c!=="Graduate")} onSave={v=>updateScanned(p.id,"class",v)} /></td>
                    <td style={{ padding:"7px 10px" }}><span style={{ color:DEV_COLOR[p.devTrait] }}><InlineCell value={p.devTrait} options={DEV_TRAITS} onSave={v=>updateScanned(p.id,"devTrait",v)} /></span></td>
                    <td style={{ padding:"7px 10px" }}><span style={{ color:STAR_COLOR[p.stars] }}><InlineCell value={p.stars} options={STAR_LEVELS} onSave={v=>updateScanned(p.id,"stars",v)} /></span></td>
                    <td style={{ padding:"7px 10px", fontWeight:700, color:Number(p.ovr)>=90?"#f59e0b":Number(p.ovr)>=85?"#34d399":"#f1f5f9" }}><InlineCell value={p.ovr} onSave={v=>updateScanned(p.id,"ovr",v)} /></td>
                    <td style={{ padding:"7px 10px", color:"#94a3b8", minWidth:120 }}><InlineCell value={p.arch} onSave={v=>updateScanned(p.id,"arch",v)} /></td>
                    <td style={{ padding:"7px 10px" }}><InlineCell value={p.origin} options={ORIGINS} onSave={v=>updateScanned(p.id,"origin",v)} /></td>
                    <td style={{ padding:"7px 10px" }}><InlineCell value={p.gemBust} options={GEM_BUST} onSave={v=>updateScanned(p.id,"gemBust",v)} /></td>
                    <td style={{ padding:"7px 10px" }}><InlineCell value={p.dealbreaker||""} options={["", ...DEALBREAKERS]} onSave={v=>updateScanned(p.id,"dealbreaker",v)} /></td>
                    <td style={{ padding:"7px 10px", whiteSpace:"nowrap" }}>
                      {isConfirmed?(<span style={{ color:"#34d399", fontWeight:700, fontSize:12, display:"flex", alignItems:"center", gap:4 }}>✓ Good<button onClick={()=>toggleConfirm(p.id)} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontSize:10 }}>↩</button></span>)
                      :(<button onClick={()=>toggleConfirm(p.id)} style={{ background:"#064e3b", color:"#34d399", border:"1px solid #065f46", borderRadius:5, padding:"3px 10px", cursor:"pointer", fontSize:11, fontWeight:700 }}>✓ Confirm</button>)}
                    </td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop:10, background:"#0f172a", borderRadius:6, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:11 }}><span style={{ color:"#64748b" }}>Review progress</span><span style={{ color:confirmedCount===selectedCount&&selectedCount>0?"#34d399":"#f59e0b", fontWeight:600 }}>{confirmedCount}/{selectedCount} confirmed</span></div>
              <div style={{ background:"#1e293b", height:6, borderRadius:3 }}><div style={{ width:selectedCount?`${confirmedCount/selectedCount*100}%`:"0%", background:confirmedCount===selectedCount&&selectedCount>0?"#34d399":"#f59e0b", height:6, borderRadius:3, transition:"width .3s" }} /></div>
            </div>
            <button onClick={addSelected} disabled={!selectedCount} style={{ background:selectedCount?"#3b82f6":"#1e293b", color:selectedCount?"#fff":"#475569", border:"none", borderRadius:7, padding:"8px 20px", cursor:selectedCount?"pointer":"default", fontWeight:700, fontSize:13, whiteSpace:"nowrap" }}>Add {selectedCount} to Roster →</button>
          </div>
          {confirmedCount<selectedCount&&selectedCount>0&&(<div style={{ marginTop:8, fontSize:11, color:"#92400e", background:"#1c1000", border:"1px solid #92400e", borderRadius:6, padding:"7px 12px" }}>⚠ {selectedCount-confirmedCount} player{selectedCount-confirmedCount!==1?"s":""} not yet confirmed — you can still add them.</div>)}
        </div>
      )}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [roster, setRoster] = useState([]);
  const [alumni, setAlumni] = useState([]);
  const [season, setSeason] = useState(1);
  const [teamName, setTeamName] = useState("My Dynasty");
  const [program, setProgram] = useState(EMPTY_PROGRAM);
  const [syncing, setSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [editingTeam, setEditingTeam] = useState(false);
  const [tab, setTab] = useState("roster");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editPlayer, setEditPlayer] = useState(null);
  const [filterPos, setFilterPos] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [filterNIL, setFilterNIL] = useState(false);
  const [sortKey, setSortKey] = useState("ovr");
  const [sortDir, setSortDir] = useState("desc");
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [flash, setFlash] = useState("");

  // ── Auth ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Load data from Supabase ────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      setSyncing(true);
      try {
        const [{ data: playersData }, { data: alumniData }, { data: programData }, { data: metaData }] = await Promise.all([
          supabase.from("players").select("*").eq("user_id", user.id),
          supabase.from("alumni").select("*").eq("user_id", user.id),
          supabase.from("program").select("*").eq("user_id", user.id).single(),
          supabase.from("meta").select("*").eq("user_id", user.id).single(),
        ]);
        if (playersData?.length) setRoster(playersData.map(r => r.data));
        if (alumniData?.length) setAlumni(alumniData.map(r => r.data));
        if (programData?.data) setProgram(programData.data);
        if (metaData?.data) { setSeason(metaData.data.season || 1); setTeamName(metaData.data.teamName || "My Dynasty"); }
      } catch(e) { console.error("Load error", e); }
      finally { setSyncing(false); }
    };
    loadData();
  }, [user]);

  // ── Save to Supabase (debounced) ──────────────────────────────────────────
  const saveTimeout = useRef(null);
  const saveToSupabase = useCallback((newRoster, newAlumni, newProgram, newSeason, newTeamName) => {
    if (!user) return;
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSyncing(true);
      try {
        // Upsert all players
        if (newRoster.length > 0) {
          await supabase.from("players").upsert(newRoster.map(p => ({ id: p.id, user_id: user.id, data: p })));
        }
        // Upsert alumni batches
        if (newAlumni.length > 0) {
          await supabase.from("alumni").upsert(newAlumni.map(a => ({ id: `${user.id}_s${a.season}`, user_id: user.id, data: a })));
        }
        // Upsert program
        await supabase.from("program").upsert({ user_id: user.id, data: newProgram, updated_at: new Date().toISOString() });
        // Upsert meta
        await supabase.from("meta").upsert({ user_id: user.id, data: { season: newSeason, teamName: newTeamName }, updated_at: new Date().toISOString() });
        setLastSaved(new Date());
      } catch(e) { console.error("Save error", e); }
      finally { setSyncing(false); }
    }, 1500);
  }, [user]);

  const showFlash = useCallback((msg) => { setFlash(msg); setTimeout(()=>setFlash(""),2500); }, []);

  const addPlayer = useCallback((p) => {
    const newRoster = [...roster, {...p, id:p.id||uid()}];
    setRoster(newRoster); setShowAddForm(false); showFlash("Player added ✓");
    saveToSupabase(newRoster, alumni, program, season, teamName);
  }, [roster, alumni, program, season, teamName, saveToSupabase, showFlash]);

  const addPlayers = useCallback((ps) => {
    const newRoster = [...roster, ...ps.map(p=>({...p,id:p.id||uid()}))];
    setRoster(newRoster); showFlash(`${ps.length} player${ps.length!==1?"s":""} added ✓`);
    saveToSupabase(newRoster, alumni, program, season, teamName);
  }, [roster, alumni, program, season, teamName, saveToSupabase, showFlash]);

  const saveEdit = useCallback((p) => {
    const newRoster = roster.map(r=>r.id===p.id?p:r);
    setRoster(newRoster); setEditPlayer(null); showFlash("Saved ✓");
    saveToSupabase(newRoster, alumni, program, season, teamName);
  }, [roster, alumni, program, season, teamName, saveToSupabase, showFlash]);

  const deletePlayer = useCallback(async (id) => {
    const newRoster = roster.filter(r=>r.id!==id);
    setRoster(newRoster);
    if (user) await supabase.from("players").delete().eq("id", id);
    saveToSupabase(newRoster, alumni, program, season, teamName);
  }, [roster, alumni, program, season, teamName, user, saveToSupabase]);

  const updateProgram = useCallback((newProgram) => {
    setProgram(newProgram);
    saveToSupabase(roster, alumni, newProgram, season, teamName);
  }, [roster, alumni, season, teamName, saveToSupabase]);

  const advanceSeason = useCallback(() => {
    const graduating = roster.filter(p=>p.class==="SR");
    const newAlumni = [...alumni, {season, players:graduating}];
    const newRoster = roster.filter(p=>p.class!=="SR").map(p=>({...p, class:p.redshirt?p.class:advanceClass(p.class), redshirt:false, portalRisk:false, draftRisk:false, startingOVR:p.ovr||p.startingOVR, baseOVR:p.ovr||p.baseOVR}));
    const newProgram = {...program, adHistory:[...program.adHistory,{season,goals:program.adGoals}], adGoals:EMPTY_PROGRAM.adGoals};
    const newSeason = season + 1;
    setAlumni(newAlumni); setRoster(newRoster); setProgram(newProgram); setSeason(newSeason);
    setConfirmAdvance(false); showFlash(`Season ${season} complete — ${graduating.length} seniors graduated`);
    saveToSupabase(newRoster, newAlumni, newProgram, newSeason, teamName);
  }, [roster, alumni, program, season, teamName, saveToSupabase, showFlash]);

  const handleTeamNameChange = useCallback((name) => {
    setTeamName(name);
    saveToSupabase(roster, alumni, program, season, name);
  }, [roster, alumni, program, season, saveToSupabase]);

  const exportCSV = useCallback(() => {
    const hdrs=["Pos","Name","Class","Redshirt","Dev Trait","Stars","GEM/Bust","Baseline OVR","OVR","OVR Change","Archetype","Skill Caps","Origin","NIL Deal","NIL Demand","Dealbreaker","Portal Risk","Draft Risk","Starting OVR","Notes"];
    const rows=roster.map(p=>[p.pos,p.name,p.class,p.redshirt?"Yes":"",p.devTrait,p.stars,p.gemBust,p.baseOVR,p.ovr,ovrChange(p)??"",p.arch,p.skillCaps,p.origin,p.nilDeal,p.nilDemand,p.dealbreaker,p.portalRisk?"Yes":"",p.draftRisk?"Yes":"",p.startingOVR,p.notes]);
    const csv=[hdrs,...rows].map(r=>r.map(c=>`"${String(c??"").replace(/"/g,'""')}"`).join(",")).join("\n");
    const a=Object.assign(document.createElement("a"),{href:URL.createObjectURL(new Blob([csv],{type:"text/csv"})),download:`CFB27_Season${season}_Roster.csv`}); a.click();
  }, [roster, season]);

  const handleImport = useCallback(() => {
    try {
      const lines=importText.trim().split("\n").filter(Boolean);
      const imported=lines.slice(1).map(line=>{ const c=line.split(",").map(x=>x.replace(/^"|"$/g,"").trim()); return {id:uid(),pos:c[0]||"QB",name:c[1]||"",class:c[2]||"FR",redshirt:c[3]==="Yes",devTrait:c[4]||"Normal",stars:c[5]||"4 Star",gemBust:c[6]||"Normal",baseOVR:c[7]||"",ovr:c[8]||"",arch:c[10]||"",skillCaps:c[11]||"",origin:c[12]||"Recruit",nilDeal:c[13]||"",nilDemand:c[14]||"",dealbreaker:c[15]||"",portalRisk:c[16]==="Yes",draftRisk:c[17]==="Yes",startingOVR:c[18]||"",notes:c[19]||""}; });
      const newRoster = [...roster, ...imported];
      setRoster(newRoster); setImportText(""); setShowImport(false); showFlash(`Imported ${imported.length} players ✓`);
      saveToSupabase(newRoster, alumni, program, season, teamName);
    } catch { showFlash("Import failed — check CSV format"); }
  }, [importText, roster, alumni, program, season, teamName, saveToSupabase, showFlash]);

  const signOut = async () => { await supabase.auth.signOut(); setUser(null); setRoster([]); setAlumni([]); setSeason(1); setTeamName("My Dynasty"); setProgram(EMPTY_PROGRAM); };

  // ── computed ────────────────────────────────────────────────────────────────
  const overview = useMemo(()=>POSITIONS.map(pos=>{ const g=roster.filter(p=>p.pos===pos); const by={FR:0,SO:0,JR:0,SR:0}; g.forEach(p=>{if(by[p.class]!==undefined)by[p.class]++;}); const target=POSITION_TARGETS[pos]||0,current=g.length; const dr=g.filter(p=>p.draftRisk&&["JR","SO","FR"].includes(p.class)).length; const pr=g.filter(p=>p.portalRisk).length; return {pos,target,current,...by,need:Math.max(0,target-current+by.SR-dr),draftRisk:dr,portalRisk:pr}; }),[roster]);
  const devMix = useMemo(()=>DEV_TRAITS.map(d=>{const n=roster.filter(p=>p.devTrait===d).length;return{trait:d,total:n,pct:roster.length?(n/roster.length*100).toFixed(1):0};}),[roster]);
  const starMix = useMemo(()=>STAR_LEVELS.map(s=>{const n=roster.filter(p=>p.stars===s).length;return{stars:s,total:n,pct:roster.length?(n/roster.length*100).toFixed(1):0};}),[roster]);
  const blueChip = useMemo(()=>{const n=roster.filter(p=>p.stars==="4 Star"||p.stars==="5 Star").length;return roster.length?(n/roster.length*100).toFixed(1):0;},[roster]);
  const nilAtRiskCount = useMemo(()=>roster.filter(nilAtRisk).length,[roster]);
  const totalNilSpend = useMemo(()=>roster.reduce((a,p)=>a+Number(p.nilDeal||0),0),[roster]);

  const displayed = useMemo(()=>{
    let r=[...roster];
    if(filterPos!=="All") r=r.filter(p=>p.pos===filterPos);
    if(filterClass!=="All") r=r.filter(p=>p.class===filterClass);
    if(filterNIL) r=r.filter(nilAtRisk);
    r.sort((a,b)=>{ let va=a[sortKey],vb=b[sortKey]; if(sortKey==="class"){va=CLASS_ORDER[va]??99;vb=CLASS_ORDER[vb]??99;} else if(["ovr","baseOVR","nilDeal","nilDemand"].includes(sortKey)){va=Number(va)||0;vb=Number(vb)||0;} else{va=String(va||"").toLowerCase();vb=String(vb||"").toLowerCase();} return va<vb?(sortDir==="asc"?-1:1):va>vb?(sortDir==="asc"?1:-1):0; });
    return r;
  },[roster,filterPos,filterClass,filterNIL,sortKey,sortDir]);

  const toggleSort = k=>{ if(sortKey===k)setSortDir(d=>d==="asc"?"desc":"asc"); else{setSortKey(k);setSortDir("desc");} };

  const S = {
    app:{ fontFamily:"'Inter',system-ui,sans-serif", background:"#020617", minHeight:"100vh", color:"#f1f5f9", fontSize:13 },
    header:{ background:"#0a0f1e", borderBottom:"1px solid #1e293b", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" },
    tabBtn:active=>({ padding:"7px 14px", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600, fontSize:12, background:active?"#3b82f6":"#1e293b", color:active?"#fff":"#64748b" }),
    th:k=>({ padding:"8px 8px", textAlign:"left", fontSize:11, color:sortKey===k?"#60a5fa":"#475569", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, cursor:"pointer", whiteSpace:"nowrap", userSelect:"none" }),
    td:{ padding:"6px 8px", borderBottom:"1px solid #0f172a", verticalAlign:"middle" },
    btn:(v="primary")=>({ background:{primary:"#3b82f6",danger:"#ef4444",success:"#10b981",secondary:"#1e293b"}[v]||"#1e293b", color:"#fff", border:"none", borderRadius:6, padding:"7px 14px", cursor:"pointer", fontWeight:600, fontSize:12 }),
  };

  if (!authChecked) return <div style={{ minHeight:"100vh", background:"#020617", display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b", fontFamily:"Inter,system-ui,sans-serif" }}>Loading…</div>;
  if (!user) return <AuthScreen onAuth={setUser} />;

  const TABS = [["roster","Roster"],["scan","📸 Scan"],["overview","Overview"],["program","◆ Program"],["alumni","Alumni"]];

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div style={{ flex:1 }}>
          {editingTeam
            ?<input value={teamName} onChange={e=>setTeamName(e.target.value)} onBlur={e=>{setEditingTeam(false);handleTeamNameChange(e.target.value);}} autoFocus style={{ background:"transparent", border:"none", borderBottom:"1px solid #3b82f6", color:"#f8fafc", fontSize:17, fontWeight:700, outline:"none" }} />
            :<span onClick={()=>setEditingTeam(true)} style={{ fontSize:17, fontWeight:700, color:"#f8fafc", cursor:"pointer" }} title="Click to rename">{teamName}</span>
          }
          <span style={{ marginLeft:10, fontSize:11, color:"#64748b" }}>Season {season} · CFB 27</span>
          {syncing&&<span style={{ marginLeft:8, fontSize:10, color:"#475569" }}>saving…</span>}
          {!syncing&&lastSaved&&<span style={{ marginLeft:8, fontSize:10, color:"#1e3a5f" }}>✓ synced</span>}
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          {TABS.map(([t,lbl])=>(
            <button key={t} onClick={()=>setTab(t)} style={{ ...S.tabBtn(tab===t), position:"relative" }}>
              {lbl}
              {t==="program"&&nilAtRiskCount>0&&<span style={{ position:"absolute", top:-4, right:-4, background:"#ef4444", color:"#fff", borderRadius:"50%", width:14, height:14, fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center" }}>{nilAtRiskCount}</span>}
            </button>
          ))}
          <button onClick={signOut} style={{ background:"none", border:"1px solid #1e293b", color:"#475569", borderRadius:6, padding:"6px 12px", cursor:"pointer", fontSize:11 }}>Sign out</button>
        </div>
      </div>

      {flash&&<div style={{ background:"#10b981", color:"#fff", padding:"8px 20px", fontSize:13, fontWeight:600 }}>{flash}</div>}

      <div style={{ padding:20 }}>

        {tab==="roster"&&<>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
            <StatBox label="Roster" value={roster.length} sub={`Target: ${Object.values(POSITION_TARGETS).reduce((a,b)=>a+b,0)}`} accent="#3b82f6" />
            <StatBox label="Seniors" value={roster.filter(p=>p.class==="SR").length} sub="Graduating" accent="#f59e0b" />
            <StatBox label="NIL Spend" value={totalNilSpend} sub="Total pts" accent="#f59e0b" />
            <StatBox label="NIL Risk" value={nilAtRiskCount} sub="Demand>Deal" accent={nilAtRiskCount>0?"#ef4444":"#1e293b"} />
            <StatBox label="Portal Risk" value={roster.filter(p=>p.portalRisk).length} accent="#f87171" />
            <StatBox label="Draft Risk" value={roster.filter(p=>p.draftRisk).length} accent="#8b5cf6" />
            <StatBox label="Blue Chip%" value={`${blueChip}%`} sub="4★+5★" accent="#60a5fa" />
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14, alignItems:"center" }}>
            <select value={filterPos} onChange={e=>setFilterPos(e.target.value)} style={{ background:"#1e293b", color:"#f1f5f9", border:"1px solid #334155", borderRadius:6, padding:"6px 10px", fontSize:12 }}><option value="All">All Positions</option>{POSITIONS.map(p=><option key={p}>{p}</option>)}</select>
            <select value={filterClass} onChange={e=>setFilterClass(e.target.value)} style={{ background:"#1e293b", color:"#f1f5f9", border:"1px solid #334155", borderRadius:6, padding:"6px 10px", fontSize:12 }}><option value="All">All Classes</option>{CLASSES.filter(c=>c!=="Graduate").map(c=><option key={c}>{c}</option>)}</select>
            <label style={{ fontSize:12, color:filterNIL?"#ef4444":"#64748b", display:"flex", alignItems:"center", gap:5, cursor:"pointer", border:`1px solid ${filterNIL?"#ef4444":"#334155"}`, borderRadius:6, padding:"5px 10px" }}><input type="checkbox" checked={filterNIL} onChange={e=>setFilterNIL(e.target.checked)} />NIL at Risk</label>
            <div style={{ flex:1 }} />
            <button onClick={()=>setShowAddForm(v=>!v)} style={S.btn("primary")}>+ Add Player</button>
            <button onClick={()=>setShowImport(v=>!v)} style={S.btn("secondary")}>⬆ Import CSV</button>
            <button onClick={exportCSV} style={S.btn("secondary")}>⬇ Export CSV</button>
            <button onClick={()=>setConfirmAdvance(true)} style={S.btn("success")}>⏭ Advance Season</button>
          </div>
          {showAddForm&&<PlayerForm initial={null} onSave={addPlayer} onCancel={()=>setShowAddForm(false)} />}
          {showImport&&(<div style={{ background:"#0f172a", border:"1px solid #334155", borderRadius:10, padding:16, marginBottom:16 }}><div style={{ fontSize:12, color:"#64748b", marginBottom:6 }}>Paste CSV rows (same format as export). First row = headers.</div><textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={5} style={{ width:"100%", background:"#1e293b", color:"#f1f5f9", border:"1px solid #334155", borderRadius:5, padding:8, fontSize:11, fontFamily:"monospace", boxSizing:"border-box" }} /><div style={{ display:"flex", gap:8, marginTop:8 }}><button onClick={handleImport} style={S.btn("primary")}>Import</button><button onClick={()=>setShowImport(false)} style={S.btn("secondary")}>Cancel</button></div></div>)}
          {editPlayer&&<PlayerForm initial={editPlayer} onSave={saveEdit} onCancel={()=>setEditPlayer(null)} />}
          {confirmAdvance&&(<div style={{ background:"#1a0a00", border:"1px solid #92400e", borderRadius:10, padding:16, marginBottom:16 }}><div style={{ fontWeight:700, color:"#fbbf24", marginBottom:6 }}>⚠ Advance to Season {season+1}?</div><div style={{ color:"#94a3b8", fontSize:12, marginBottom:12 }}>Graduates {roster.filter(p=>p.class==="SR").length} seniors, advances all classes, resets flags. Cannot be undone.</div><div style={{ display:"flex", gap:8 }}><button onClick={advanceSeason} style={S.btn("danger")}>Yes, Advance Season</button><button onClick={()=>setConfirmAdvance(false)} style={S.btn("secondary")}>Cancel</button></div></div>)}
          <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #1e293b" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr style={{ background:"#0a0f1e" }}>{[["pos","Pos"],["name","Name"],["class","Cls"],["devTrait","Dev"],["stars","Stars"],["gemBust","G/B"],["ovr","OVR"],["arch","Arch"],["dealbreaker","DB"],["nilDeal","NIL Deal"],["nilDemand","NIL Dmnd"],["origin","Origin"]].map(([k,lbl])=>(<th key={k} onClick={()=>toggleSort(k)} style={S.th(k)}>{lbl}{sortKey===k?(sortDir==="asc"?" ↑":" ↓"):""}</th>))}<th style={S.th("_f")}>Flags</th><th style={{ ...S.th("_a"), textAlign:"right" }}>Act.</th></tr></thead>
              <tbody>
                {displayed.map(p=>{ const chg=ovrChange(p); const nilRisk=nilAtRisk(p); return (
                  <tr key={p.id} style={{ background:nilRisk?"#1a0800":"#070c18" }} onMouseEnter={e=>e.currentTarget.style.background=nilRisk?"#220a00":"#0d1526"} onMouseLeave={e=>e.currentTarget.style.background=nilRisk?"#1a0800":"#070c18"}>
                    <td style={S.td}><span style={{ fontWeight:700, color:"#60a5fa" }}>{p.pos}</span></td>
                    <td style={{ ...S.td, minWidth:110 }}><div style={{ fontWeight:600, color:"#f8fafc" }}>{p.name||<span style={{color:"#475569"}}>—</span>}</div>{p.redshirt&&<span style={{fontSize:10,color:"#f59e0b"}}>RS</span>}</td>
                    <td style={S.td}><span style={{ color:{SR:"#f59e0b",JR:"#34d399",SO:"#60a5fa",FR:"#94a3b8"}[p.class]||"#94a3b8", fontWeight:600 }}>{p.class}</span></td>
                    <td style={S.td}><Badge label={p.devTrait} color={DEV_COLOR[p.devTrait]} bg="#1e293b" /></td>
                    <td style={S.td}><span style={{ color:STAR_COLOR[p.stars]||"#94a3b8", fontWeight:600 }}>{p.stars?.replace(" Star","★")}</span></td>
                    <td style={S.td}><span style={{ color:p.gemBust==="GEM"?"#10b981":p.gemBust==="Bust"?"#ef4444":"#475569", fontWeight:p.gemBust!=="Normal"?700:400 }}>{p.gemBust}</span></td>
                    <td style={S.td}><span style={{ fontWeight:700, color:Number(p.ovr)>=90?"#f59e0b":Number(p.ovr)>=85?"#34d399":"#f1f5f9" }}>{p.ovr||"—"}</span>{chg!==null&&<span style={{ fontSize:10, color:chg>0?"#10b981":"#ef4444", marginLeft:3 }}>{chg>0?`+${chg}`:chg}</span>}</td>
                    <td style={{ ...S.td, color:"#94a3b8", maxWidth:110, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.arch||"—"}</td>
                    <td style={S.td}>{p.dealbreaker?<span style={{ fontWeight:600, color:"#a78bfa" }}>{p.dealbreaker}</span>:<span style={{color:"#334155"}}>—</span>}</td>
                    <td style={S.td}><span style={{ color:"#34d399", fontWeight:600 }}>{p.nilDeal||"—"}</span></td>
                    <td style={S.td}><span style={{ color:nilRisk?"#ef4444":"#94a3b8", fontWeight:nilRisk?700:400 }}>{p.nilDemand||"—"}{nilRisk&&" ⚠"}</span></td>
                    <td style={S.td}><span style={{ color:p.origin==="Transfer"?"#a78bfa":"#94a3b8" }}>{p.origin}</span></td>
                    <td style={S.td}><div style={{ display:"flex", gap:3 }}>{p.portalRisk&&<Badge label="PR" color="#f87171" bg="#450a0a" />}{p.draftRisk&&<Badge label="DR" color="#c084fc" bg="#2e1065" />}{nilRisk&&<Badge label="NIL⚠" color="#fbbf24" bg="#451a00" />}</div></td>
                    <td style={{ ...S.td, textAlign:"right", whiteSpace:"nowrap" }}><button onClick={()=>{setEditPlayer(p);setShowAddForm(false);}} style={{ background:"none", border:"none", color:"#60a5fa", cursor:"pointer", fontSize:11, padding:"2px 4px" }}>Edit</button><button onClick={()=>deletePlayer(p.id)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:11, padding:"2px 4px" }}>✕</button></td>
                  </tr>
                ); })}
                {displayed.length===0&&<tr><td colSpan={14} style={{ ...S.td, textAlign:"center", color:"#334155", padding:40 }}>No players — use 📸 Scan or Add Player to get started</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {tab==="scan"&&<ScreenshotScanner onAddPlayers={ps=>{addPlayers(ps);setTab("roster");}} />}

        {tab==="overview"&&<>
          <h2 style={{ color:"#60a5fa", marginBottom:16, fontWeight:700, fontSize:16 }}>Season {season} — Depth Overview</h2>
          <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #1e293b", marginBottom:24 }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr style={{ background:"#0a0f1e" }}>{["Pos","Target","Total","SR","JR","SO","FR","Need","Portal Risk","Draft Risk"].map(h=>(<th key={h} style={{ padding:"8px 12px", fontSize:11, color:"#475569", fontWeight:600, textTransform:"uppercase", letterSpacing:.5, textAlign:"center" }}>{h}</th>))}</tr></thead>
              <tbody>
                {overview.map(row=>(<tr key={row.pos} style={{ background:"#070c18", borderBottom:"1px solid #0f172a" }}>
                  <td style={{ ...S.td, textAlign:"center", fontWeight:700, color:"#60a5fa" }}>{row.pos}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#64748b" }}>{row.target||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", fontWeight:700, color:row.current>row.target&&row.target>0?"#f59e0b":row.current<row.target&&row.target>0?"#ef4444":"#10b981" }}>{row.current}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#f59e0b" }}>{row.SR||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#34d399" }}>{row.JR||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#60a5fa" }}>{row.SO||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#94a3b8" }}>{row.FR||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", fontWeight:row.need>0?700:400, color:row.need>0?"#ef4444":"#475569" }}>{row.need>0?row.need:"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", color:row.portalRisk>0?"#f87171":"#475569" }}>{row.portalRisk||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", color:row.draftRisk>0?"#c084fc":"#475569" }}>{row.draftRisk||"—"}</td>
                </tr>))}
                <tr style={{ background:"#0a0f1e", borderTop:"2px solid #1e293b" }}>
                  <td style={{ ...S.td, fontWeight:700, color:"#f8fafc", textAlign:"center" }}>TOTAL</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#64748b" }}>{Object.values(POSITION_TARGETS).reduce((a,b)=>a+b,0)}</td>
                  <td style={{ ...S.td, textAlign:"center", fontWeight:700, color:"#f8fafc" }}>{roster.length}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#f59e0b" }}>{roster.filter(p=>p.class==="SR").length}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#34d399" }}>{roster.filter(p=>p.class==="JR").length}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#60a5fa" }}>{roster.filter(p=>p.class==="SO").length}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#94a3b8" }}>{roster.filter(p=>p.class==="FR").length}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#ef4444" }}>{overview.reduce((a,r)=>a+r.need,0)||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#f87171" }}>{roster.filter(p=>p.portalRisk).length||"—"}</td>
                  <td style={{ ...S.td, textAlign:"center", color:"#c084fc" }}>{roster.filter(p=>p.draftRisk).length||"—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:16 }}>
              <div style={{ fontWeight:700, color:"#60a5fa", marginBottom:12, fontSize:13 }}>Dev Trait Mix</div>
              {devMix.map(d=>(<div key={d.trait} style={{ marginBottom:8 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:DEV_COLOR[d.trait], fontWeight:600, fontSize:12 }}>{d.trait}</span><span style={{ color:"#64748b", fontSize:12 }}>{d.total} ({d.pct}%)</span></div><div style={{ background:"#1e293b", height:5, borderRadius:3 }}><div style={{ width:`${d.pct}%`, background:DEV_COLOR[d.trait], height:5, borderRadius:3 }} /></div></div>))}
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:16 }}>
              <div style={{ fontWeight:700, color:"#60a5fa", marginBottom:12, fontSize:13 }}>Star Mix</div>
              {starMix.map(s=>(<div key={s.stars} style={{ marginBottom:8 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:STAR_COLOR[s.stars], fontWeight:600, fontSize:12 }}>{s.stars}</span><span style={{ color:"#64748b", fontSize:12 }}>{s.total} ({s.pct}%)</span></div><div style={{ background:"#1e293b", height:5, borderRadius:3 }}><div style={{ width:`${s.pct}%`, background:STAR_COLOR[s.stars], height:5, borderRadius:3 }} /></div></div>))}
              <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #1e293b", display:"flex", justifyContent:"space-between" }}><span style={{ color:"#94a3b8", fontSize:12 }}>Blue Chip Ratio</span><span style={{ color:"#f59e0b", fontWeight:700 }}>{blueChip}%</span></div>
            </div>
            <div style={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:8, padding:16 }}>
              <div style={{ fontWeight:700, color:"#60a5fa", marginBottom:12, fontSize:13 }}>OVR Snapshot</div>
              {[["90+",p=>Number(p.ovr)>=90,"#f59e0b"],["85–89",p=>Number(p.ovr)>=85&&Number(p.ovr)<90,"#34d399"],["80–84",p=>Number(p.ovr)>=80&&Number(p.ovr)<85,"#60a5fa"],["75–79",p=>Number(p.ovr)>=75&&Number(p.ovr)<80,"#94a3b8"],["<75",p=>Number(p.ovr)>0&&Number(p.ovr)<75,"#475569"]].map(([lbl,fn,col])=>{ const n=roster.filter(fn).length,pct=roster.length?(n/roster.length*100).toFixed(0):0; return(<div key={lbl} style={{ marginBottom:8 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:col, fontWeight:600, fontSize:12 }}>{lbl}</span><span style={{ color:"#64748b", fontSize:12 }}>{n}</span></div><div style={{ background:"#1e293b", height:5, borderRadius:3 }}><div style={{ width:`${pct}%`, background:col, height:5, borderRadius:3 }} /></div></div>); })}
            </div>
          </div>
        </>}

        {tab==="program"&&<ProgramTab program={program} setProgram={updateProgram} season={season} />}

        {tab==="alumni"&&<>
          <h2 style={{ color:"#60a5fa", marginBottom:16, fontWeight:700, fontSize:16 }}>Graduating Classes Archive</h2>
          {alumni.length===0&&<div style={{ color:"#334155", padding:40, textAlign:"center" }}>No seasons completed yet.</div>}
          {[...alumni].reverse().map(batch=>(<div key={batch.season} style={{ marginBottom:24 }}>
            <div style={{ fontWeight:700, color:"#f8fafc", marginBottom:8, fontSize:14 }}>Season {batch.season} Graduates <span style={{ color:"#64748b", fontWeight:400, fontSize:12 }}>{batch.players.length} players</span></div>
            <div style={{ overflowX:"auto", borderRadius:8, border:"1px solid #1e293b" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead><tr style={{ background:"#0a0f1e" }}>{["Pos","Name","Dev","Stars","G/B","Final OVR","OVR Chg","Arch","Origin","NIL Deal","DB","PR","DR"].map(h=>(<th key={h} style={{ padding:"6px 8px", fontSize:11, color:"#475569", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{h}</th>))}</tr></thead>
                <tbody>
                  {batch.players.map(p=>{ const chg=ovrChange(p); return (
                    <tr key={p.id} style={{ background:"#070c18", borderBottom:"1px solid #0f172a" }}>
                      <td style={{ ...S.td, color:"#60a5fa", fontWeight:700 }}>{p.pos}</td>
                      <td style={{ ...S.td, fontWeight:600, color:"#f8fafc" }}>{p.name}</td>
                      <td style={S.td}><Badge label={p.devTrait} color={DEV_COLOR[p.devTrait]} bg="#1e293b" /></td>
                      <td style={{ ...S.td, color:STAR_COLOR[p.stars] }}>{p.stars?.replace(" Star","★")}</td>
                      <td style={{ ...S.td, color:p.gemBust==="GEM"?"#10b981":p.gemBust==="Bust"?"#ef4444":"#475569" }}>{p.gemBust}</td>
                      <td style={{ ...S.td, fontWeight:700, color:Number(p.ovr)>=90?"#f59e0b":Number(p.ovr)>=85?"#34d399":"#f1f5f9" }}>{p.ovr||"—"}</td>
                      <td style={{ ...S.td, color:chg>0?"#10b981":"#ef4444" }}>{chg!==null?(chg>0?`+${chg}`:chg):"—"}</td>
                      <td style={{ ...S.td, color:"#94a3b8" }}>{p.arch||"—"}</td>
                      <td style={{ ...S.td, color:"#64748b" }}>{p.origin}</td>
                      <td style={{ ...S.td, color:"#34d399" }}>{p.nilDeal||"—"}</td>
                      <td style={{ ...S.td, color:"#a78bfa", fontWeight:600 }}>{p.dealbreaker||"—"}</td>
                      <td style={S.td}>{p.portalRisk&&<Badge label="PR" color="#f87171" bg="#450a0a" />}</td>
                      <td style={S.td}>{p.draftRisk&&<Badge label="DR" color="#c084fc" bg="#2e1065" />}</td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </div>))}
        </>}

      </div>
    </div>
  );
}
