import { useState, useCallback, useMemo } from "react";
import {
  AreaChart,Area,BarChart,Bar,RadarChart,Radar,
  PolarGrid,PolarAngleAxis,XAxis,YAxis,CartesianGrid,
  Tooltip,ResponsiveContainer,Legend,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import AvatarCircle from "../components/AvatarCircle";

const META = {
  "9º Ano A":{ total:28, media:7.4, presenca:82, risco:3, evolucao:[6.1,6.3,6.8,7.0,7.2,7.4] },
  "9º Ano B":{ total:30, media:8.1, presenca:91, risco:1, evolucao:[7.5,7.6,7.8,7.9,8.0,8.1] },
  "8º Ano A":{ total:25, media:6.9, presenca:76, risco:5, evolucao:[5.8,6.0,6.2,6.5,6.7,6.9] },
};
const WEEKS=["Sem 1","Sem 2","Sem 3","Sem 4","Sem 5","Sem 6"];
const TCOLORS={"9º Ano A":"#4F46E5","9º Ano B":"#059669","8º Ano A":"#D97706"};
const RADAR_KEYS=["Presença","Desempenho","Engajamento","Ocorrências","Roadmap"];
const RADAR_DATA={"9º Ano A":[82,74,68,50,72],"9º Ano B":[91,81,85,70,88],"8º Ano A":[76,69,55,38,60]};

const RISK=[
  {id:1,name:"Henrique Dias", turma:"9º Ano A",avatar:"HD",risk:"alto", absences:7,reasons:["7 faltas seguidas","3 advertências","Sem progresso no roadmap"]},
  {id:2,name:"Diego Rocha",   turma:"9º Ano A",avatar:"DR",risk:"alto", absences:5,reasons:["5 faltas","Conflitos com colegas","Rendimento abaixo de 5"]},
  {id:3,name:"Lucas Batista", turma:"9º Ano A",avatar:"LB",risk:"medio",absences:3,reasons:["3 faltas","Desengajamento nas atividades"]},
  {id:4,name:"Tobias Viana",  turma:"8º Ano A",avatar:"TV",risk:"alto", absences:9,reasons:["9 faltas seguidas","Sem entrega de atividades"]},
  {id:5,name:"Marina Luz",    turma:"8º Ano A",avatar:"ML",risk:"medio",absences:4,reasons:["4 faltas","Dificuldade no conteúdo"]},
];

const SUGEST=[
  {id:1,turma:"9º Ano A",title:"Reforço em Escravidão no Brasil",  body:"3 alunos com lacunas. Revisão em dupla pode elevar média em 1.2 pts.",      tag:"Conteúdo",    color:"emerald"},
  {id:2,turma:"9º Ano A",title:"Reorganizar mapa da sala",          body:"Henrique e Diego juntos acumulam 60% das advertências. Separar posições.",   tag:"Gestão",      color:"sky"},
  {id:3,turma:"8º Ano A",title:"Gamificação: Desafio Semanal",      body:"Turma com menor engajamento. Quiz semanal pode +35% participação.",          tag:"Engajamento", color:"amber"},
  {id:4,turma:"8º Ano A",title:"Contato com responsáveis",          body:"5 alunos em risco. Reunião coletiva recomendada antes do fim do bimestre.",  tag:"Evasão",      color:"rose"},
  {id:5,turma:"9º Ano B",title:"Turma destaque — compartilhar",     body:"9º B tem ótimos resultados. Apresentar práticas ao 8º A pode elevar média.", tag:"Boas Práticas",color:"violet"},
];

function downloadCSV(data,filename){
  if(!data.length) return;
  const h=Object.keys(data[0]).join(",");
  const r=data.map(x=>Object.values(x).map(v=>`"${v}"`).join(",")).join("\n");
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([`${h}\n${r}`],{type:"text/csv"}));
  a.download=filename; a.click();
}

function useDragList(init){
  const [items,setItems]=useState(init);
  const [dragIdx,setDragIdx]=useState(null);
  const [overIdx,setOverIdx]=useState(null);
  const onStart=useCallback((i)=>setDragIdx(i),[]);
  const onEnter=useCallback((i)=>setOverIdx(i),[]);
  const onEnd=useCallback(()=>{
    if(dragIdx!==null&&overIdx!==null&&dragIdx!==overIdx){
      setItems(p=>{ const n=[...p]; const [m]=n.splice(dragIdx,1); n.splice(overIdx,0,m); return n; });
    }
    setDragIdx(null); setOverIdx(null);
  },[dragIdx,overIdx]);
  return {items,dragIdx,overIdx,onStart,onEnter,onEnd};
}

function RiskCard({s,T}){
  const [open,setOpen]=useState(false);
  const cfg={
    alto:  {label:"Alto Risco",  color:T.roseText,    bg:T.roseBg,    border:T.rose},
    medio: {label:"Risco Médio", color:T.amberText,   bg:T.amberBg,   border:T.amber},
    baixo: {label:"Baixo Risco", color:T.emeraldText, bg:T.emeraldBg, border:T.emerald},
  }[s.risk]||{};
  return (
    <div style={{ border:`1.5px solid ${open?cfg.border+"60":T.border}`,borderRadius:12,background:open?cfg.bg:T.card,marginBottom:8,overflow:"hidden",transition:"all 0.2s" }}>
      <div onClick={()=>setOpen(p=>!p)} style={{ display:"flex",alignItems:"center",gap:9,padding:"11px 13px",cursor:"pointer" }}>
        <AvatarCircle initials={s.avatar} size={32} color={cfg.color} bg={cfg.bg}/>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",gap:6,alignItems:"center",flexWrap:"wrap" }}>
            <span style={{ fontSize:12,fontWeight:700,color:T.primary }}>{s.name}</span>
            <span style={{ fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:20,background:cfg.bg,color:cfg.color,border:`1.5px solid ${cfg.border}40`,animation:s.risk==="alto"?"pulseRisk 2s infinite":"none" }}>
              <span style={{ display:"inline-block",width:5,height:5,borderRadius:"50%",background:cfg.border,marginRight:4,verticalAlign:"middle" }}/>
              {cfg.label.toUpperCase()}
            </span>
          </div>
          <div style={{ fontSize:10,color:T.muted,marginTop:1 }}>{s.turma} · {s.absences} falta{s.absences!==1?"s":""}</div>
        </div>
        <span style={{ fontSize:10,color:T.muted,display:"inline-block",transform:open?"rotate(180deg)":"none",transition:"transform 0.2s" }}>▼</span>
      </div>
      {open&&(
        <div style={{ padding:"0 13px 13px",borderTop:`1px solid ${cfg.border}20`,animation:"expandDown 0.2s ease" }}>
          <div style={{ fontSize:9,fontWeight:700,color:T.muted,letterSpacing:1,marginBottom:7,marginTop:10 }}>FATORES DE RISCO</div>
          {s.reasons.map((r,i)=>(
            <div key={i} style={{ display:"flex",gap:6,alignItems:"center",marginBottom:4 }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:cfg.border,flexShrink:0 }}/>
              <span style={{ fontSize:11,color:T.secondary }}>{r}</span>
            </div>
          ))}
          <div style={{ display:"flex",gap:7,marginTop:11 }}>
            <button style={{ flex:1,fontSize:10,fontWeight:700,padding:"5px 0",borderRadius:8,border:`1px solid ${T.rose}30`,background:T.roseBg,color:T.roseText,cursor:"pointer" }}>Contatar Família</button>
            <button style={{ flex:1,fontSize:10,fontWeight:700,padding:"5px 0",borderRadius:8,border:`1px solid ${T.indigo}30`,background:T.indigoBg,color:T.indigoText,cursor:"pointer" }}>Ver Perfil</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SugCard({s,T,delay=0}){
  const [dismissed,setDismissed]=useState(false);
  const [applied,setApplied]=useState(false);
  if(dismissed) return null;
  const ck={emerald:{color:T.emeraldText,bg:T.emeraldBg,border:T.emerald},sky:{color:T.skyText,bg:T.skyBg,border:T.sky},amber:{color:T.amberText,bg:T.amberBg,border:T.amber},rose:{color:T.roseText,bg:T.roseBg,border:T.rose},violet:{color:T.violetText,bg:T.violetBg,border:T.violet}}[s.color]||{};
  return (
    <div style={{ background:T.card,border:`1.5px solid ${ck.border}30`,borderLeft:`4px solid ${ck.border}`,borderRadius:12,padding:"13px 14px",animation:`fadeUp 0.4s ease ${delay}ms both`,opacity:applied?0.65:1,transition:"opacity 0.2s" }}>
      <div style={{ display:"flex",gap:10,marginBottom:8 }}>
        <div style={{ width:34,height:34,borderRadius:9,background:ck.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0 }}>💡</div>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:3 }}>
            <span style={{ fontSize:11,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>{s.title}</span>
            <span style={{ fontSize:8,fontWeight:800,padding:"2px 7px",borderRadius:20,background:ck.bg,color:ck.color }}>{s.tag}</span>
          </div>
          <div style={{ fontSize:10,color:T.secondary,lineHeight:1.5 }}>{s.body}</div>
        </div>
        <button onClick={()=>setDismissed(true)} style={{ background:"none",border:"none",cursor:"pointer",color:T.muted,fontSize:16,lineHeight:1,flexShrink:0 }}>×</button>
      </div>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <span style={{ fontSize:9,color:T.muted }}>📍 {s.turma}</span>
        <button onClick={()=>setApplied(p=>!p)} style={{ fontSize:9,fontWeight:700,padding:"3px 11px",borderRadius:20,border:`1.5px solid ${applied?ck.border+"60":T.border}`,background:applied?ck.bg:T.cardAlt,color:applied?ck.color:T.secondary,cursor:"pointer",transition:"all 0.15s" }}>
          {applied?"✓ Aplicado":"Aplicar sugestão"}
        </button>
      </div>
    </div>
  );
}

function ExportBtn({label,icon,onClick,variant="default",T}){
  const [h,setH]=useState(false);
  const cfg={pdf:{bg:h?T.roseBg:T.cardAlt,color:T.roseText,border:h?T.rose+"30":T.border},excel:{bg:h?T.emeraldBg:T.cardAlt,color:T.emeraldText,border:h?T.emerald+"30":T.border},default:{bg:h?T.indigoBg:T.cardAlt,color:T.indigoText,border:h?T.indigo+"30":T.border}}[variant]||{};
  return (
    <button onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={onClick} style={{ display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:9,border:`1.5px solid ${cfg.border}`,background:cfg.bg,color:cfg.color,fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.15s",transform:h?"translateY(-1px)":"none",boxShadow:h?`0 3px 10px ${T.shadow}`:"none" }}>
      <span style={{ fontSize:13 }}>{icon}</span>{label}
    </button>
  );
}

export default function Analytics(){
  const { T } = useTheme();
  const [cmp,setCmp]=useState(["9º Ano A","9º Ano B"]);
  const [riskF,setRiskF]=useState("all");

  const toggle=(t)=>setCmp(p=>p.includes(t)?(p.length>1?p.filter(x=>x!==t):p):[...p,t]);

  const barData=useMemo(()=>WEEKS.map((w,i)=>{ const o={week:w}; cmp.forEach(t=>{o[t]=META[t]?.evolucao[i]??0;}); return o; }),[cmp]);
  const radData=useMemo(()=>RADAR_KEYS.map((k,ki)=>{ const o={subject:k}; cmp.forEach(t=>{o[t]=RADAR_DATA[t]?.[ki]??0;}); return o; }),[cmp]);

  const tableData=Object.entries(META).map(([t,s])=>({Turma:t,Alunos:s.total,Média:s.media,"Presença(%)":s.presenca,"Em Risco":s.risco}));
  const filtRisk=RISK.filter(s=>riskF==="all"||s.risk===riskF);

  const dl=useDragList([
    {id:"evolucao",title:"Evolução de Desempenho",sub:"Média por bimestre · comparação entre turmas"},
    {id:"radar",   title:"Radar Pedagógico",       sub:"Visão multidimensional por turma"},
  ]);

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>
      <header style={{ background:T.card,borderBottom:`1px solid ${T.border}`,padding:"13px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:12,flexWrap:"wrap" }}>
        <div>
          <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Analytics Pedagógico</h1>
          <p style={{ margin:0,fontSize:11,color:T.muted,marginTop:1 }}>Visão geral · {Object.keys(META).length} turmas · 2º Bimestre 2025</p>
        </div>
        <div style={{ display:"flex",gap:7,alignItems:"center" }}>
          <span style={{ fontSize:10,fontWeight:700,color:T.muted }}>EXPORTAR</span>
          <ExportBtn T={T} label="PDF Relatório" icon="⎙" variant="pdf" onClick={()=>window.print()}/>
          <ExportBtn T={T} label="Excel / CSV"   icon="⊞" variant="excel" onClick={()=>downloadCSV(tableData,"historiando-analytics.csv")}/>
        </div>
      </header>

      <div style={{ flex:1,overflowY:"auto",padding:"22px 24px",display:"flex",flexDirection:"column",gap:20 }}>

        {/* Stat cards */}
        <section style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
          {Object.entries(META).map(([t,s],i)=>{
            const active=cmp.includes(t);
            return (
              <div key={t} onClick={()=>toggle(t)} style={{ background:active?T.indigoBg:T.card,border:`2px solid ${active?T.indigo+"60":T.border}`,borderRadius:14,padding:"14px 16px",cursor:"pointer",transition:"all 0.18s",animation:`fadeUp 0.4s ease ${i*60}ms both`,position:"relative" }}>
                {active&&<div style={{ position:"absolute",top:8,right:8,width:8,height:8,borderRadius:"50%",background:TCOLORS[t] }}/>}
                <div style={{ fontSize:11,fontWeight:700,color:active?T.indigoText:T.primary,fontFamily:"'Syne',sans-serif",marginBottom:6 }}>{t}</div>
                <div style={{ fontSize:26,fontWeight:800,color:active?T.indigoText:T.primary,fontFamily:"'Syne',sans-serif",lineHeight:1 }}>{s.media}</div>
                <div style={{ fontSize:9,color:T.muted,marginBottom:8 }}>média geral</div>
                <div style={{ display:"flex",gap:6 }}>
                  <span style={{ fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:T.emeraldBg,color:T.emeraldText }}>{s.presenca}%</span>
                  {s.risco>0&&<span style={{ fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:6,background:T.roseBg,color:T.roseText }}>⚠{s.risco}</span>}
                </div>
              </div>
            );
          })}
        </section>

        {/* Comparison bar */}
        <div style={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:14,padding:"12px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
          <div style={{ fontSize:9,fontWeight:800,color:T.muted,letterSpacing:1,flexShrink:0 }}>COMPARAR TURMAS:</div>
          <div style={{ display:"flex",gap:7,flex:1,flexWrap:"wrap" }}>
            {Object.keys(META).map(t=>{
              const on=cmp.includes(t);
              return (
                <button key={t} onClick={()=>toggle(t)} style={{ display:"flex",alignItems:"center",gap:7,padding:"5px 12px",borderRadius:20,border:`2px solid ${on?TCOLORS[t]+"80":T.border}`,background:on?TCOLORS[t]+"18":T.cardAlt,cursor:"pointer",fontSize:11,fontWeight:700,color:on?TCOLORS[t]:T.secondary,transition:"all 0.15s" }}>
                  <span style={{ width:8,height:8,borderRadius:"50%",background:on?TCOLORS[t]:T.muted,transition:"background 0.15s" }}/>
                  {t}{on&&" ✓"}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize:10,color:T.muted }}>{cmp.length} selecionada{cmp.length!==1?"s":""}</span>
        </div>

        {/* Draggable charts */}
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          <div style={{ fontSize:9,fontWeight:700,color:T.muted,letterSpacing:1 }}>
            GRÁFICOS · <span style={{ fontWeight:500,color:T.muted }}>Arraste para reorganizar</span>
          </div>
          {dl.items.map((chart,idx)=>(
            <div key={chart.id}
              draggable
              onDragStart={()=>dl.onStart(idx)}
              onDragEnter={()=>dl.onEnter(idx)}
              onDragEnd={dl.onEnd}
              style={{ background:T.card,borderRadius:16,padding:"18px 20px",boxShadow:`0 1px 5px ${T.shadow}`,cursor:dl.dragIdx===idx?"grabbing":"default",transform:dl.dragIdx===idx?"scale(1.02)":"scale(1)",opacity:dl.overIdx===idx&&dl.dragIdx!==idx?0.5:1,transition:"all 0.15s",outline:dl.overIdx===idx&&dl.dragIdx!==idx?`2px dashed ${T.indigo}60`:"none",position:"relative" }}>
              {/* drag handle */}
              <div style={{ position:"absolute",top:8,left:"50%",transform:"translateX(-50%)",width:28,height:4,borderRadius:99,background:T.border,cursor:"grab" }} title="Arrastar"/>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,marginTop:8 }}>
                <div>
                  <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>{chart.title}</div>
                  <div style={{ fontSize:10,color:T.muted,marginTop:1 }}>{chart.sub}</div>
                </div>
                <ExportBtn T={T} label="CSV" icon="⊞" variant="excel" onClick={()=>downloadCSV(barData,`${chart.id}.csv`)}/>
              </div>

              {chart.id==="evolucao"&&(
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={barData} margin={{ top:4,right:4,left:-28,bottom:0 }}>
                    <CartesianGrid stroke={T.border} strokeDasharray="3 3" vertical={false}/>
                    <XAxis dataKey="week" tick={{ fontSize:10,fill:T.muted }} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,10]} tick={{ fontSize:9,fill:T.muted }} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:9,fontSize:10 }}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10 }}/>
                    {cmp.map(t=><Bar key={t} dataKey={t} fill={TCOLORS[t]} radius={[4,4,0,0]} maxBarSize={32}/>)}
                  </BarChart>
                </ResponsiveContainer>
              )}
              {chart.id==="radar"&&(
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radData}>
                    <PolarGrid stroke={T.border}/>
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize:10,fill:T.secondary }}/>
                    <Tooltip contentStyle={{ background:T.card,border:`1px solid ${T.border}`,borderRadius:9,fontSize:10 }}/>
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10 }}/>
                    {cmp.map(t=><Radar key={t} name={t} dataKey={t} stroke={TCOLORS[t]} fill={TCOLORS[t]} fillOpacity={0.12} strokeWidth={2}/>)}
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          ))}
        </div>

        {/* Risk + Suggestions */}
        <section style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18 }}>
          <div style={{ background:T.card,borderRadius:16,padding:"18px",boxShadow:`0 1px 5px ${T.shadow}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Risco de Evasão</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:1 }}>{RISK.filter(s=>s.risk==="alto").length} em alto risco · {RISK.length} monitorados</div>
              </div>
              <div style={{ display:"flex",background:T.bg,borderRadius:9,padding:3,gap:2 }}>
                {[["all","Todos"],["alto","Alto"],["medio","Médio"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setRiskF(v)} style={{ background:riskF===v?T.card:"transparent",border:"none",borderRadius:7,padding:"3px 9px",fontSize:9,fontWeight:700,color:riskF===v?T.primary:T.muted,cursor:"pointer",transition:"all 0.15s" }}>{l}</button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight:360,overflowY:"auto" }}>
              {filtRisk.map(s=><RiskCard key={s.id} s={s} T={T}/>)}
            </div>
            <div style={{ marginTop:12 }}>
              <ExportBtn T={T} label="Exportar lista CSV" icon="⊞" variant="excel" onClick={()=>downloadCSV(RISK.map(s=>({Nome:s.name,Turma:s.turma,Risco:s.risk,Faltas:s.absences})),"alunos-em-risco.csv")}/>
            </div>
          </div>

          <div style={{ background:T.card,borderRadius:16,padding:"18px",boxShadow:`0 1px 5px ${T.shadow}` }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Sugestões Pedagógicas</div>
                <div style={{ fontSize:10,color:T.muted,marginTop:1 }}>Baseadas nos dados das turmas</div>
              </div>
              <span style={{ fontSize:20 }}>💡</span>
            </div>
            <div style={{ maxHeight:380,overflowY:"auto",display:"flex",flexDirection:"column",gap:9 }}>
              {SUGEST.filter(s=>cmp.includes(s.turma)).map((s,i)=>(
                <SugCard key={s.id} s={s} T={T} delay={i*60}/>
              ))}
              {SUGEST.filter(s=>cmp.includes(s.turma)).length===0&&(
                <div style={{ textAlign:"center",padding:"32px 0",color:T.muted }}>
                  <div style={{ fontSize:24,marginBottom:8 }}>💡</div>
                  <div style={{ fontSize:12 }}>Selecione turmas para ver sugestões.</div>
                </div>
              )}
            </div>
          </div>
        </section>

        <div style={{ height:16 }}/>
      </div>
    </div>
  );
}
