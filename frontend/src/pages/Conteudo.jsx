import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";

const MODULES = [
  { id:1, title:"Brasil Colônia",        lessons:8,  done:8,  color:"amber",   icon:"🏛" },
  { id:2, title:"Brasil Império",        lessons:10, done:7,  color:"indigo",  icon:"👑" },
  { id:3, title:"Escravidão no Brasil",  lessons:6,  done:4,  color:"rose",    icon:"⛓" },
  { id:4, title:"Guerra do Paraguai",    lessons:5,  done:2,  color:"emerald", icon:"⚔" },
  { id:5, title:"Questão Christie",      lessons:4,  done:0,  color:"violet",  icon:"🚢" },
  { id:6, title:"Proclamação República", lessons:7,  done:0,  color:"sky",     icon:"🗳" },
];

export default function Conteudo() {
  const { T } = useTheme();
  const { selectedTurma } = useApp();

  const ck = (color) => ({
    amber:   { color:T.amberText,   bg:T.amberBg,   border:T.amber   },
    indigo:  { color:T.indigoText,  bg:T.indigoBg,  border:T.indigo  },
    rose:    { color:T.roseText,    bg:T.roseBg,    border:T.rose    },
    emerald: { color:T.emeraldText, bg:T.emeraldBg, border:T.emerald },
    violet:  { color:T.violetText,  bg:T.violetBg,  border:T.violet  },
    sky:     { color:T.skyText,     bg:T.skyBg,     border:T.sky     },
  })[color] || {};

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>
      <header style={{ background:T.card,borderBottom:`1px solid ${T.border}`,padding:"14px 28px",flexShrink:0 }}>
        <h1 style={{ margin:0,fontSize:20,fontWeight:800,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Conteúdo</h1>
        <p style={{ margin:0,fontSize:11,color:T.muted,marginTop:1 }}>{selectedTurma} · Trilha de História · BNCC alinhado</p>
      </header>

      <div style={{ flex:1,overflowY:"auto",padding:"24px 28px" }}>
        <div style={{ fontSize:11,fontWeight:700,color:T.muted,letterSpacing:1,marginBottom:18 }}>MÓDULOS · 2º BIMESTRE 2025</div>

        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
          {MODULES.map((m,i)=>{
            const c=ck(m.color);
            const pct=Math.round((m.done/m.lessons)*100);
            return (
              <div key={m.id} style={{ background:T.card,border:`1.5px solid ${c.border}30`,borderRadius:16,padding:"18px",cursor:"pointer",transition:"all 0.18s",boxShadow:`0 1px 5px ${T.shadow}`,animation:`fadeUp 0.4s ease ${i*70}ms both` }}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                  <div style={{ width:44,height:44,borderRadius:12,background:c.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>{m.icon}</div>
                  <span style={{ fontSize:10,fontWeight:800,padding:"3px 9px",borderRadius:20,background:c.bg,color:c.color }}>{pct}%</span>
                </div>
                <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif",marginBottom:4 }}>{m.title}</div>
                <div style={{ fontSize:10,color:T.muted,marginBottom:12 }}>{m.done}/{m.lessons} aulas concluídas</div>
                <div style={{ height:5,borderRadius:99,background:T.border,overflow:"hidden",marginBottom:12 }}>
                  <div style={{ height:"100%",width:`${pct}%`,borderRadius:99,background:c.border,transition:"width 0.6s" }}/>
                </div>
                <div style={{ display:"flex",gap:8 }}>
                  <button style={{ flex:1,fontSize:10,fontWeight:700,padding:"6px 0",borderRadius:8,border:`1px solid ${c.border}30`,background:c.bg,color:c.color,cursor:"pointer" }}>Editar</button>
                  <button style={{ flex:1,fontSize:10,fontWeight:700,padding:"6px 0",borderRadius:8,border:`1px solid ${T.border}`,background:T.cardAlt,color:T.secondary,cursor:"pointer" }}>Ver Alunos</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:28,textAlign:"center",padding:"28px",background:T.card,borderRadius:16,border:`2px dashed ${T.border}` }}>
          <div style={{ fontSize:28,marginBottom:8 }}>◈</div>
          <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Criar Novo Módulo</div>
          <div style={{ fontSize:11,color:T.muted,marginTop:4,marginBottom:14 }}>Adicione conteúdo gamificado alinhado à BNCC</div>
          <button style={{ background:T.indigo,color:"#fff",border:"none",borderRadius:10,padding:"9px 22px",fontSize:12,fontWeight:700,cursor:"pointer" }}>+ Novo Módulo</button>
        </div>
        <div style={{ height:24 }}/>
      </div>
    </div>
  );
}
