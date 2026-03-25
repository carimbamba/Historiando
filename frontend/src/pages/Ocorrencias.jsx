import { useState, useRef, useMemo, useCallback } from "react";
import {
  AreaChart,Area,BarChart,Bar,
  XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import AvatarCircle from "../components/AvatarCircle";

const CATS = [
  { key:"advertencia",  label:"Advertência",  icon:"⚠", color:"rose"    },
  { key:"gratificacao", label:"Gratificação", icon:"★", color:"emerald"  },
  { key:"observacao",   label:"Observação",   icon:"◎", color:"sky"     },
  { key:"notificacao",  label:"Notif. Azul",  icon:"✉", color:"violet"  },
];

const TEMPLATES = {
  advertencia:  ["Comportamento inadequado em sala","Uso indevido do celular","Perturbando colegas","Desrespeito ao professor","Recusa em realizar atividade"],
  gratificacao: ["Excelente participação na aula","Ajudou colega com dificuldade","Apresentação exemplar","Dedicação excepcional","Liderança positiva no grupo"],
  observacao:   ["Dificuldade no conteúdo de História","Progresso notável recentemente","Necessita acompanhamento extra","Ausência justificada","Conversa com responsável recomendada"],
  notificacao:  ["Notificação enviada aos responsáveis","Reunião agendada com família","Encaminhado para orientação pedagógica"],
};

const catStyle = (key,T) => ({
  advertencia:  { color:T.roseText,    bg:T.roseBg,    border:T.rose,    icon:"⚠", label:"Advertência"  },
  gratificacao: { color:T.emeraldText, bg:T.emeraldBg, border:T.emerald, icon:"★", label:"Gratificação" },
  observacao:   { color:T.skyText,     bg:T.skyBg,     border:T.sky,     icon:"◎", label:"Observação"   },
  notificacao:  { color:T.violetText,  bg:T.violetBg,  border:T.violet,  icon:"✉", label:"Notif. Azul"  },
}[key] || {});

const buildChart=(occs)=>{
  const m={};
  for(let i=29;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});
    m[k]={date:k,advertencia:0,gratificacao:0,observacao:0,notificacao:0};
  }
  occs.forEach(o=>{ if(m[o.date]) m[o.date][o.category]++; });
  return Object.values(m);
};

function AccordionItem({occ,open,toggle,T}){
  const cs=catStyle(occ.category,T);
  return (
    <div style={{ border:`1.5px solid ${open?cs.border+"60":T.border}`,borderRadius:12,overflow:"hidden",marginBottom:7,background:open?cs.bg:T.card,transition:"all 0.2s" }}>
      <button onClick={toggle} style={{ width:"100%",background:"transparent",border:"none",padding:"10px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:9,textAlign:"left" }}>
        <div style={{ width:28,height:28,borderRadius:7,background:cs.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:cs.color,flexShrink:0,border:`1.5px solid ${cs.border}30` }}>{cs.icon}</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,flexWrap:"wrap" }}>
            <span style={{ fontSize:12,fontWeight:700,color:T.primary }}>{occ.studentName}</span>
            <span style={{ fontSize:9,fontWeight:800,padding:"2px 7px",borderRadius:20,background:cs.bg,color:cs.color,border:`1px solid ${cs.border}25` }}>{cs.label}</span>
          </div>
          <div style={{ fontSize:10,color:T.secondary,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{occ.text}</div>
        </div>
        <div style={{ display:"flex",flexDirection:"column",alignItems:"flex-end",flexShrink:0,gap:1 }}>
          <span style={{ fontSize:10,color:T.muted }}>{occ.date}</span>
          <span style={{ fontSize:9,color:T.muted }}>{occ.time}</span>
        </div>
        <span style={{ fontSize:10,color:T.muted,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s",marginLeft:4 }}>▼</span>
      </button>
      {open && (
        <div style={{ padding:"0 13px 13px",borderTop:`1px solid ${cs.border}20`,animation:"expandDown 0.2s ease" }}>
          <div style={{ marginTop:10,fontSize:11,color:T.secondary,lineHeight:1.6,background:T.card,border:`1px solid ${T.border}`,borderRadius:9,padding:"8px 11px" }}>
            <strong style={{ color:T.primary }}>Descrição: </strong>{occ.text}
          </div>
          {occ.media?.length>0 && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:9,fontWeight:700,color:T.muted,letterSpacing:1,marginBottom:6 }}>ANEXOS ({occ.media.length})</div>
              <div style={{ display:"flex",gap:7,flexWrap:"wrap" }}>
                {occ.media.map((m,i)=>(
                  <div key={i} style={{ width:60,height:60,borderRadius:8,overflow:"hidden",border:`2px solid ${T.border}`,background:T.bgDeep,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {m.type?.startsWith("image/") ? <img src={m.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : <span style={{ fontSize:20 }}>🎬</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display:"flex",gap:7,marginTop:11 }}>
            <button style={{ fontSize:10,fontWeight:600,color:T.roseText,background:T.roseBg,border:`1px solid ${T.rose}20`,borderRadius:7,padding:"4px 11px",cursor:"pointer" }}>Excluir</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Ocorrencias(){
  const { T } = useTheme();
  const { students,occurrences,addOccurrence,selectedTurma,gratificar,advertir } = useApp();

  const [selStudent, setSelStudent] = useState("");
  const [selCat,     setSelCat]     = useState("advertencia");
  const [text,       setText]       = useState("");
  const [media,      setMedia]      = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [openItems,  setOpenItems]  = useState({});
  const [filterCat,  setFilterCat]  = useState("all");
  const [search,     setSearch]     = useState("");
  const [chartView,  setChartView]  = useState("area");
  const fileRef = useRef();

  const chartData = useMemo(()=>buildChart(occurrences),[occurrences]);
  const filtered  = useMemo(()=>occurrences.filter(o=>{
    if(filterCat!=="all"&&o.category!==filterCat) return false;
    if(search&&!o.text.toLowerCase().includes(search.toLowerCase())&&!o.studentName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }),[occurrences,filterCat,search]);

  const toggleItem=useCallback((id)=>setOpenItems(p=>({...p,[id]:!p[id]})),[]);

  const handleFile=(e)=>{
    const files=Array.from(e.target.files).slice(0,5-media.length);
    setMedia(p=>[...p,...files.map(f=>({file:f,type:f.type,name:f.name,url:URL.createObjectURL(f)}))]);
  };

  const handleSubmit=()=>{
    if(!selStudent||!text.trim()) return;
    const s=students.find(x=>String(x.id)===selStudent);
    setSubmitting(true);
    setTimeout(()=>{
      const now=new Date();
      addOccurrence({
        category:selCat, studentId:s.id, studentName:s.name, text:text.trim(),
        date:now.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"}),
        time:now.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),
        media,
      });
      if(selCat==="gratificacao") gratificar(s.id,text.trim());
      else if(selCat==="advertencia") advertir(s.id,text.trim());
      setSubmitting(false); setSubmitted(true);
      setText(""); setSelStudent(""); setMedia([]);
      setTimeout(()=>setSubmitted(false),2500);
    },600);
  };

  const catColors={advertencia:T.rose,gratificacao:T.emerald,observacao:T.sky,notificacao:T.violet};

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>
      <header style={{ background:T.card,borderBottom:`1px solid ${T.border}`,padding:"13px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:12,flexWrap:"wrap" }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Ocorrências</h1>
          <p style={{ margin:0,fontSize:11,color:T.muted,marginTop:1 }}>{selectedTurma} · {occurrences.length} registros</p>
        </div>
        <div style={{ display:"flex",gap:7 }}>
          {CATS.map(c=>{ const cs=catStyle(c.key,T); return (
            <div key={c.key} style={{ display:"flex",alignItems:"center",gap:5,background:cs.bg,border:`1.5px solid ${cs.border}25`,borderRadius:20,padding:"4px 10px" }}>
              <span style={{ fontSize:11 }}>{cs.icon}</span>
              <span style={{ fontSize:10,fontWeight:700,color:cs.color }}>{occurrences.filter(o=>o.category===c.key).length}</span>
            </div>
          ); })}
        </div>
      </header>

      <div style={{ flex:1,overflow:"hidden",display:"grid",gridTemplateColumns:"320px 1fr" }}>

        {/* Formulário */}
        <div style={{ background:T.card,borderRight:`1px solid ${T.border}`,overflowY:"auto",padding:"16px 18px",display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ fontSize:10,fontWeight:800,color:T.muted,letterSpacing:1.2 }}>NOVA OCORRÊNCIA</div>

          {/* Categoria */}
          <div>
            <label style={{ fontSize:10,fontWeight:700,color:T.secondary,display:"block",marginBottom:6 }}>CATEGORIA</label>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
              {CATS.map(c=>{ const cs=catStyle(c.key,T); const on=selCat===c.key; return (
                <button key={c.key} onClick={()=>setSelCat(c.key)} style={{ display:"flex",alignItems:"center",gap:7,padding:"8px 10px",borderRadius:10,border:`2px solid ${on?cs.border:T.border}`,background:on?cs.bg:T.cardAlt,cursor:"pointer",transition:"all 0.15s" }}>
                  <span style={{ fontSize:14 }}>{cs.icon}</span>
                  <span style={{ fontSize:11,fontWeight:700,color:on?cs.color:T.secondary }}>{cs.label}</span>
                  {on && <span style={{ marginLeft:"auto",width:6,height:6,borderRadius:"50%",background:cs.border }}/>}
                </button>
              ); })}
            </div>
          </div>

          {/* Aluno */}
          <div>
            <label style={{ fontSize:10,fontWeight:700,color:T.secondary,display:"block",marginBottom:6 }}>ALUNO</label>
            <select value={selStudent} onChange={(e)=>setSelStudent(e.target.value)} style={{ width:"100%",appearance:"none",background:T.input,border:`1.5px solid ${selStudent?T.indigo+"60":T.inputBorder}`,borderRadius:10,padding:"9px 12px",fontSize:12,color:selStudent?T.primary:T.muted,cursor:"pointer",outline:"none" }}>
              <option value="">Selecionar aluno…</option>
              {students.map(s=><option key={s.id} value={String(s.id)}>{s.name}</option>)}
            </select>
          </div>

          {/* Templates */}
          <div>
            <label style={{ fontSize:10,fontWeight:700,color:T.secondary,display:"block",marginBottom:6 }}>TEMPLATES RÁPIDOS</label>
            {(TEMPLATES[selCat]||[]).map((t,i)=>(
              <button key={i} onClick={()=>setText(t)} style={{ width:"100%",textAlign:"left",background:text===t?T.indigoBg:T.cardAlt,border:`1.5px solid ${text===t?T.indigo+"50":T.border}`,borderRadius:8,padding:"7px 10px",fontSize:11,color:text===t?T.indigoText:T.secondary,cursor:"pointer",fontFamily:"inherit",lineHeight:1.4,fontWeight:text===t?700:400,marginBottom:4,display:"block" }}>
                {text===t?`✓ ${t}`:t}
              </button>
            ))}
          </div>

          {/* Textarea */}
          <div>
            <label style={{ fontSize:10,fontWeight:700,color:T.secondary,display:"block",marginBottom:6 }}>DESCRIÇÃO</label>
            <textarea value={text} onChange={(e)=>setText(e.target.value)} rows={3} placeholder="Descreva a ocorrência…" style={{ width:"100%",resize:"none",background:T.input,border:`1.5px solid ${text?T.indigo+"50":T.inputBorder}`,borderRadius:10,padding:"9px 12px",fontSize:12,color:T.primary,lineHeight:1.6,outline:"none" }}/>
            <div style={{ fontSize:9,color:T.muted,marginTop:2,textAlign:"right" }}>{text.length}/300</div>
          </div>

          {/* Upload */}
          <div>
            <label style={{ fontSize:10,fontWeight:700,color:T.secondary,display:"block",marginBottom:6 }}>FOTOS / VÍDEOS</label>
            <div
              onClick={()=>fileRef.current?.click()}
              onDragOver={(e)=>e.preventDefault()}
              onDrop={(e)=>{
                e.preventDefault();
                const files=Array.from(e.dataTransfer.files).filter(f=>f.type.startsWith("image/")||f.type.startsWith("video/"));
                setMedia(p=>[...p,...files.slice(0,5-p.length).map(f=>({file:f,type:f.type,name:f.name,url:URL.createObjectURL(f)}))]);
              }}
              style={{ border:`2px dashed ${T.border}`,borderRadius:11,padding:"14px 12px",textAlign:"center",cursor:"pointer",background:T.cardAlt }}>
              <div style={{ fontSize:20,marginBottom:3 }}>📎</div>
              <div style={{ fontSize:11,color:T.secondary }}>Arraste ou <span style={{ color:T.indigoText }}>clique</span></div>
              <div style={{ fontSize:9,color:T.muted,marginTop:2 }}>JPG, PNG, MP4 · até 5 arquivos</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={handleFile}/>
            {media.length>0 && (
              <div style={{ display:"flex",gap:6,marginTop:8,flexWrap:"wrap" }}>
                {media.map((m,i)=>(
                  <div key={i} style={{ width:52,height:52,borderRadius:8,overflow:"hidden",border:`2px solid ${T.indigo}40`,position:"relative",background:T.bgDeep,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {m.type?.startsWith("image/")?<img src={m.url} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/>:<span style={{ fontSize:16 }}>🎬</span>}
                    <button onClick={()=>setMedia(p=>p.filter((_,j)=>j!==i))} style={{ position:"absolute",top:-3,right:-3,width:14,height:14,borderRadius:"50%",background:T.rose,border:"none",color:"#fff",fontSize:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700 }}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={!selStudent||!text.trim()||submitting} style={{ width:"100%",padding:"11px 0",borderRadius:11,border:"none",background:submitted?T.emerald:(!selStudent||!text.trim())?T.border:T.indigo,color:(!selStudent||!text.trim())?"rgba(0,0,0,0.3)":"#fff",fontSize:13,fontWeight:700,cursor:(!selStudent||!text.trim())?"not-allowed":"pointer",boxShadow:(!selStudent||!text.trim())?"none":`0 3px 12px ${T.indigo}50`,transition:"all 0.2s",animation:submitted?"successPop 0.35s ease":"none" }}>
            {submitting?"Registrando…":submitted?"✓ Registrado!":"Registrar Ocorrência"}
          </button>
        </div>

        {/* Gráfico + Histórico */}
        <div style={{ display:"flex",flexDirection:"column",overflow:"hidden" }}>
          {/* Chart */}
          <div style={{ background:T.card,borderBottom:`1px solid ${T.border}`,padding:"16px 20px",flexShrink:0 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
              <div>
                <div style={{ fontSize:13,fontWeight:800,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Tendências — 30 dias</div>
                <div style={{ fontSize:9,color:T.muted,marginTop:1 }}>Volume por categoria</div>
              </div>
              <div style={{ display:"flex",background:T.bg,borderRadius:9,padding:3,gap:2 }}>
                {[["area","Área"],["bar","Barras"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setChartView(v)} style={{ background:chartView===v?T.card:"transparent",border:"none",borderRadius:7,padding:"3px 10px",fontSize:9,fontWeight:700,color:chartView===v?T.primary:T.muted,cursor:"pointer" }}>{l}</button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              {chartView==="area"?(
                <AreaChart data={chartData} margin={{ top:4,right:4,left:-28,bottom:0 }}>
                  <defs>{Object.entries(catColors).map(([k,c])=>(
                    <linearGradient key={k} id={`gc-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={c} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={c} stopOpacity={0}/>
                    </linearGradient>
                  ))}</defs>
                  <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:8,fill:T.muted }} axisLine={false} tickLine={false} interval={6}/>
                  <YAxis tick={{ fontSize:8,fill:T.muted }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:9,fontSize:10 }}/>
                  {Object.entries(catColors).map(([k,c])=>(
                    <Area key={k} type="monotone" dataKey={k} stroke={c} strokeWidth={1.8} fill={`url(#gc-${k})`} dot={false}/>
                  ))}
                </AreaChart>
              ):(
                <BarChart data={chartData} margin={{ top:4,right:4,left:-28,bottom:0 }}>
                  <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
                  <XAxis dataKey="date" tick={{ fontSize:8,fill:T.muted }} axisLine={false} tickLine={false} interval={6}/>
                  <YAxis tick={{ fontSize:8,fill:T.muted }} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:9,fontSize:10 }}/>
                  {Object.entries(catColors).map(([k,c])=><Bar key={k} dataKey={k} fill={c} radius={[2,2,0,0]} maxBarSize={8}/>)}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Filtros */}
          <div style={{ background:T.card,borderBottom:`1px solid ${T.border}`,padding:"9px 20px",display:"flex",gap:7,alignItems:"center",flexShrink:0,flexWrap:"wrap" }}>
            {[["all","Todos"],...CATS.map(c=>[c.key,c.label])].map(([v,l])=>{
              const cs=v==="all"?null:catStyle(v,T);
              const on=filterCat===v;
              return (
                <button key={v} onClick={()=>setFilterCat(on&&v!=="all"?"all":v)} style={{ fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20,border:`1.5px solid ${on?(cs?.border||T.indigo):T.border}`,background:on?(cs?.bg||T.indigoBg):T.cardAlt,color:on?(cs?.color||T.indigoText):T.secondary,cursor:"pointer" }}>
                  {cs?.icon&&`${cs.icon} `}{l}
                </button>
              );
            })}
            <div style={{ flex:1 }}/>
            <input type="text" placeholder="Buscar…" value={search} onChange={(e)=>setSearch(e.target.value)} style={{ background:T.cardAlt,border:`1.5px solid ${T.border}`,borderRadius:8,padding:"4px 10px",fontSize:10,color:T.primary,outline:"none",width:120 }}/>
            <span style={{ fontSize:9,color:T.muted,fontWeight:600 }}>{filtered.length} resultado{filtered.length!==1?"s":""}</span>
          </div>

          {/* Accordion */}
          <div style={{ flex:1,overflowY:"auto",padding:"14px 20px" }}>
            <div style={{ fontSize:9,fontWeight:800,color:T.muted,letterSpacing:1.2,marginBottom:10 }}>HISTÓRICO DE OCORRÊNCIAS</div>
            {filtered.length===0?(
              <div style={{ textAlign:"center",padding:"48px 0",color:T.muted }}>
                <div style={{ fontSize:28,marginBottom:8 }}>⚑</div>
                <div style={{ fontSize:12,fontWeight:600 }}>Nenhuma ocorrência encontrada</div>
              </div>
            ):filtered.map(o=>(
              <AccordionItem key={o.id} occ={o} open={!!openItems[o.id]} toggle={()=>toggleItem(o.id)} T={T}/>
            ))}
            <div style={{ height:20 }}/>
          </div>
        </div>
      </div>
    </div>
  );
}
