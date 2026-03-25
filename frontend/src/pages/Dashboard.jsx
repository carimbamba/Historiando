import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { useApp, TURMAS } from "../context/AppContext";
import AvatarCircle from "../components/AvatarCircle";

const PRESENCA = {
  "9º Ano A": [{ d:"Seg",v:24 },{ d:"Ter",v:27 },{ d:"Qua",v:22 },{ d:"Qui",v:26 },{ d:"Sex",v:25 },{ d:"Seg",v:28 },{ d:"Hoje",v:23 }],
  "9º Ano B": [{ d:"Seg",v:28 },{ d:"Ter",v:29 },{ d:"Qua",v:27 },{ d:"Qui",v:30 },{ d:"Sex",v:26 },{ d:"Seg",v:29 },{ d:"Hoje",v:28 }],
  "8º Ano A": [{ d:"Seg",v:18 },{ d:"Ter",v:20 },{ d:"Qua",v:17 },{ d:"Qui",v:21 },{ d:"Sex",v:19 },{ d:"Seg",v:20 },{ d:"Hoje",v:18 }],
};
const TOTAL = { "9º Ano A": 28, "9º Ano B": 30, "8º Ano A": 25 };

const ATALHOS = [
  { icon:"◫", label:"Mapa da Sala",    path:"/mapa",        color:"indigo"  },
  { icon:"★", label:"Gratificar",       path:"/ocorrencias", color:"emerald" },
  { icon:"⚠", label:"Advertência",      path:"/ocorrencias", color:"rose"    },
  { icon:"◈", label:"Conteúdo",         path:"/conteudo",    color:"amber"   },
  { icon:"◉", label:"Analytics",        path:"/analytics",   color:"violet"  },
  { icon:"⊟", label:"Relatório",        path:"/analytics",   color:"sky"     },
];

function CustomTooltip({ active, payload, label, total, T }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div style={{ background:T.primary, borderRadius:10, padding:"8px 13px", boxShadow:`0 4px 16px ${T.shadowMd}` }}>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.45)", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:16, fontWeight:800, color:"#fff", fontFamily:"'Syne',sans-serif" }}>
        {v} <span style={{ fontSize:10, fontWeight:400, color:"rgba(255,255,255,0.5)" }}>alunos</span>
      </div>
      <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:1 }}>
        {Math.round((v/total)*100)}% da turma
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { T } = useTheme();
  const navigate = useNavigate();
  const { selectedTurma, setSelectedTurma, students, occurrences } = useApp();
  const [alertFilter, setAlertFilter] = useState("hoje");
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    try { localStorage.setItem("historiando_turma", selectedTurma); } catch {}
  }, [selectedTurma]);

  const serie  = PRESENCA[selectedTurma] || PRESENCA["9º Ano A"];
  const total  = TOTAL[selectedTurma] || 28;
  const media  = Math.round(serie.reduce((a,b)=>a+b.v,0)/serie.length);
  const hoje   = new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});

  const top5   = [...students].sort((a,b)=>b.points-a.points).slice(0,5);
  const alertas = occurrences.filter((o) => alertFilter==="hoje" ? o.date===hoje : true).slice(0,6);

  const catStyle = (cat) => ({
    gratificacao: { icon:"★", color:T.emeraldText, bg:T.emeraldBg, border:T.emerald },
    advertencia:  { icon:"⚠", color:T.roseText,    bg:T.roseBg,    border:T.rose    },
    observacao:   { icon:"◎", color:T.skyText,     bg:T.skyBg,     border:T.sky     },
    notificacao:  { icon:"✉", color:T.violetText,  bg:T.violetBg,  border:T.violet  },
  })[cat] || { icon:"●", color:T.secondary, bg:T.cardAlt, border:T.border };

  const colorKey = (c) => ({
    indigo:  { color:T.indigoText,  bg:T.indigoBg  },
    emerald: { color:T.emeraldText, bg:T.emeraldBg },
    rose:    { color:T.roseText,    bg:T.roseBg    },
    amber:   { color:T.amberText,   bg:T.amberBg   },
    violet:  { color:T.violetText,  bg:T.violetBg  },
    sky:     { color:T.skyText,     bg:T.skyBg     },
  })[c] || {};

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden",fontFamily:"'DM Sans',sans-serif" }}>

      {/* Header */}
      <header style={{ background:T.card, borderBottom:`1px solid ${T.border}`, padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, gap:12, flexWrap:"wrap" }}>
        <div>
          <h1 style={{ margin:0, fontSize:20, fontWeight:800, color:T.primary, fontFamily:"'Syne',sans-serif", letterSpacing:-0.5 }}>
            Bom dia, Prof. Marcos 👋
          </h1>
          <p style={{ margin:0, fontSize:11, color:T.muted, marginTop:2 }}>
            {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})} · 3 turmas ativas
          </p>
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:T.muted, letterSpacing:1, marginBottom:4 }}>TURMA EM FOCO</div>
          <select value={selectedTurma} onChange={(e)=>setSelectedTurma(e.target.value)} style={{
            appearance:"none", background:T.indigoBg, border:`1.5px solid ${T.indigo}30`,
            borderRadius:10, padding:"7px 32px 7px 12px", fontSize:13, fontWeight:700,
            color:T.indigoText, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", outline:"none",
            backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234F46E5' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
            backgroundRepeat:"no-repeat", backgroundPosition:"right 10px center",
          }}>
            {TURMAS.map((t)=><option key={t}>{t}</option>)}
          </select>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex:1, overflowY:"auto", padding:"24px 28px", display:"flex", flexDirection:"column", gap:20 }}>

        {/* Stat cards */}
        <section style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
          {[
            { label:"Presença Hoje",   value:`${serie.at(-1).v}/${total}`, sub:`${Math.round((serie.at(-1).v/total)*100)}% frequência`, icon:"◻", color:T.emeraldText, bg:T.emeraldBg },
            { label:"Ocorrências Hoje", value: occurrences.filter(o=>o.date===hoje).length, sub:"Requerem atenção", icon:"⚠", color:T.roseText, bg:T.roseBg },
            { label:"Top Pontuação",   value: top5[0]?.points??0, sub:`Líder: ${top5[0]?.name.split(" ")[0]??"—"}`, icon:"★", color:T.amberText, bg:T.amberBg },
          ].map((s,i)=>(
            <div key={i} style={{ background:T.card, borderRadius:16, padding:"20px 22px", boxShadow:`0 1px 6px ${T.shadow}`, position:"relative", overflow:"hidden", animation:`fadeUp 0.4s ease ${i*80}ms both`, transition:"transform 0.18s,box-shadow 0.18s" }}>
              <div style={{ position:"absolute",top:0,right:0,width:70,height:70,borderRadius:"0 16px 0 100%",background:s.bg,opacity:0.5 }} />
              <div style={{ display:"flex",justifyContent:"space-between",marginBottom:8 }}>
                <span style={{ fontSize:9,fontWeight:700,color:T.muted,letterSpacing:1 }}>{s.label.toUpperCase()}</span>
                <span style={{ fontSize:20 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize:32,fontWeight:800,color:s.color,fontFamily:"'Syne',sans-serif",lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:11,color:T.muted,marginTop:4 }}>{s.sub}</div>
            </div>
          ))}
        </section>

        {/* Gráfico + Top alunos */}
        <section style={{ display:"grid", gridTemplateColumns:"1fr 300px", gap:16 }}>
          <div style={{ background:T.card, borderRadius:18, padding:"20px 22px", boxShadow:`0 1px 6px ${T.shadow}`, animation:"fadeUp 0.4s ease 0.1s both" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18 }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Presença Semanal</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>Últimos 7 dias · {selectedTurma}</div>
              </div>
              <div style={{ background:T.indigoBg,borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700,color:T.indigoText }}>
                Média: {media}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={serie} margin={{ top:4,right:4,left:-24,bottom:0 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4F46E5" stopOpacity={0.18}/>
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border} strokeDasharray="4 4" vertical={false}/>
                <XAxis dataKey="d" tick={{ fontSize:10,fill:T.muted }} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,total]} tick={{ fontSize:9,fill:T.muted }} axisLine={false} tickLine={false}/>
                <Tooltip content={<CustomTooltip total={total} T={T}/>} cursor={{ stroke:T.indigo,strokeWidth:1,strokeDasharray:"4 4" }}/>
                <ReferenceLine y={media} stroke={T.indigoMid} strokeDasharray="6 4" strokeWidth={1.5}/>
                <Area type="monotone" dataKey="v" stroke={T.indigo} strokeWidth={2.5} fill="url(#grad)"
                  dot={{ fill:T.card,stroke:T.indigo,strokeWidth:2,r:4 }}
                  activeDot={{ r:6,fill:T.indigo,stroke:T.card,strokeWidth:2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background:T.card,borderRadius:18,padding:"20px 18px",boxShadow:`0 1px 6px ${T.shadow}`,animation:"fadeUp 0.4s ease 0.18s both" }}>
            <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif",marginBottom:4 }}>Top 5 Alunos</div>
            <div style={{ fontSize:10,color:T.muted,marginBottom:14 }}>Por pontuação · {selectedTurma}</div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {top5.map((a,i)=>{
                const badges=["🏆","🥈","🥉","⭐","⭐"];
                const pct=Math.round((a.points/(top5[0]?.points||1))*100);
                const first=i===0;
                return (
                  <div key={a.id} style={{ display:"flex",alignItems:"center",gap:9,padding:"8px 9px",borderRadius:11,background:first?T.amberBg:"transparent",border:`1.5px solid ${first?T.amber+"30":"transparent"}` }}>
                    <span style={{ fontSize:14,width:20 }}>{badges[i]}</span>
                    <AvatarCircle initials={a.avatar} size={28} color={first?T.amberText:T.indigoText} bg={first?"#FDE68A":T.indigoBg}/>
                    <div style={{ flex:1,minWidth:0 }}>
                      <div style={{ fontSize:11,fontWeight:700,color:T.primary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{a.name}</div>
                      <div style={{ marginTop:3,height:3,borderRadius:99,background:T.border }}>
                        <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:first?T.amber:T.indigo,transition:"width 0.6s" }}/>
                      </div>
                    </div>
                    <span style={{ fontSize:13,fontWeight:800,color:first?T.amberText:T.primary,fontFamily:"'Syne',sans-serif" }}>{a.points}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Alertas + Atalhos */}
        <section style={{ display:"grid", gridTemplateColumns:"1fr 320px", gap:16 }}>
          <div style={{ background:T.card,borderRadius:18,padding:"18px 20px",boxShadow:`0 1px 6px ${T.shadow}`,animation:"fadeUp 0.4s ease 0.25s both" }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Alertas Recentes</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>{alertas.length} {alertFilter==="hoje"?"hoje":"nos últimos 7 dias"}</div>
              </div>
              <div style={{ display:"flex",background:T.bg,borderRadius:9,padding:3,gap:2 }}>
                {[["hoje","Hoje"],["7d","7 dias"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setAlertFilter(v)} style={{ background:alertFilter===v?T.card:"transparent",border:"none",borderRadius:7,padding:"4px 11px",fontSize:10,fontWeight:700,color:alertFilter===v?T.primary:T.muted,cursor:"pointer",transition:"all 0.15s",boxShadow:alertFilter===v?`0 1px 4px ${T.shadow}`:"none" }}>{l}</button>
                ))}
              </div>
            </div>
            {alertas.length===0 ? (
              <div style={{ textAlign:"center",padding:"28px 0",color:T.emeraldText }}>
                <div style={{ fontSize:24,marginBottom:8 }}>✓</div>
                <div style={{ fontSize:12,fontWeight:600 }}>Nenhum alerta!</div>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
                {alertas.map((o)=>{
                  const cs=catStyle(o.category);
                  return (
                    <div key={o.id} style={{ display:"flex",gap:9,alignItems:"flex-start",padding:"9px 11px",borderRadius:10,background:cs.bg,borderLeft:`3px solid ${cs.border}` }}>
                      <span style={{ fontSize:12,color:cs.color }}>{cs.icon}</span>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:11,fontWeight:700,color:T.primary }}>{o.studentName}</div>
                        <div style={{ fontSize:10,color:T.secondary,marginTop:1 }}>{o.text}</div>
                      </div>
                      <span style={{ fontSize:9,color:T.muted,flexShrink:0 }}>{o.time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div style={{ background:T.card,borderRadius:18,padding:"18px 18px",boxShadow:`0 1px 6px ${T.shadow}`,animation:"fadeUp 0.4s ease 0.32s both" }}>
            <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif",marginBottom:4 }}>Atalhos Rápidos</div>
            <div style={{ fontSize:10,color:T.muted,marginBottom:14 }}>Acesso direto às principais ações</div>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:9 }}>
              {ATALHOS.map((a,i)=>{
                const ck=colorKey(a.color);
                const on=hovered===i;
                return (
                  <button key={i} onClick={()=>navigate(a.path)} onMouseEnter={()=>setHovered(i)} onMouseLeave={()=>setHovered(null)} style={{ background:on?ck.bg:T.cardAlt,border:`2px solid ${on?ck.color+"40":"transparent"}`,borderRadius:13,padding:"13px 7px",display:"flex",flexDirection:"column",alignItems:"center",gap:7,cursor:"pointer",transition:"all 0.17s",transform:on?"translateY(-2px)":"none",animation:`fadeUp 0.4s ease ${0.32+i*0.05}s both` }}>
                    <div style={{ width:44,height:44,borderRadius:12,background:on?ck.color:"rgba(30,41,59,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,color:on?"#fff":T.secondary,transition:"all 0.17s" }}>{a.icon}</div>
                    <span style={{ fontSize:9.5,fontWeight:700,color:on?ck.color:T.muted,textAlign:"center",lineHeight:1.4,transition:"color 0.17s" }}>{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div style={{ height:8 }}/>
      </div>
    </div>
  );
}
