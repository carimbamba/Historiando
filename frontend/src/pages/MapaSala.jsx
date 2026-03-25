import { useReducer, useEffect, useState, useCallback } from "react";
import { useTheme } from "../context/ThemeContext";
import { useApp } from "../context/AppContext";
import AvatarCircle from "../components/AvatarCircle";

const ROWS = 4, COLS = 6, MAX_HIST = 40;
const AI = { "0-0":7,"0-2":3,"0-4":11,"1-1":1 };

const buildMap = () => {
  const m={};
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++) m[`${r}-${c}`]=null;
  return m;
};
const nowT  = () => new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const todayT = () => new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});

function reducer(state,action){
  const {past,present,future}=state;
  const commit=(next)=>({ past:[...past.slice(-MAX_HIST),present], present:next, future:[] });

  switch(action.type){
    case "MOVE":{
      const {id,slot}=action;
      const map={...present.seatMap};
      Object.keys(map).forEach(k=>{ if(map[k]===id) map[k]=null; });
      map[slot]=id;
      const students=present.students.map(s=>
        s.id===id ? {...s,present:true,lastMoved:nowT(),lastMovedDate:todayT(),slot} : s
      );
      return commit({seatMap:map,students});
    }
    case "REMOVE":{
      const map={...present.seatMap};
      Object.keys(map).forEach(k=>{ if(map[k]===action.id) map[k]=null; });
      const students=present.students.map(s=>
        s.id===action.id ? {...s,present:false,lastMoved:null,slot:null} : s
      );
      return commit({seatMap:map,students});
    }
    case "APPLY_AI":{
      const map={...present.seatMap};
      const students=[...present.students];
      Object.entries(AI).forEach(([slot,id])=>{
        if(!map[slot]){
          Object.keys(map).forEach(k=>{ if(map[k]===id) map[k]=null; });
          map[slot]=id;
          const i=students.findIndex(s=>s.id===id);
          if(i!==-1) students[i]={...students[i],present:true,lastMoved:nowT(),lastMovedDate:todayT(),slot,aiSuggested:true};
        }
      });
      return commit({seatMap:map,students});
    }
    case "ACTION":{
      const students=present.students.map(s=>
        s.id===action.id
          ? action.kind==="gratificar" ? {...s,points:s.points+1} : {...s,warnings:s.warnings+1}
          : s
      );
      return {...state,present:{...present,students}};
    }
    case "UNDO": return past.length ? {past:past.slice(0,-1),present:past.at(-1),future:[present,...future]} : state;
    case "REDO": return future.length ? {past:[...past,present],present:future[0],future:future.slice(1)} : state;
    default: return state;
  }
}

function Popover({student,anchorPos,onClose,onAction,turma,T}){
  if(!student) return null;
  const top=Math.min(anchorPos.y,window.innerHeight-320);
  const left=Math.min(anchorPos.x,window.innerWidth-260);
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:48 }}/>
      <div className="pop-in" style={{ position:"fixed",top,left,zIndex:50,width:252,background:T.card,borderRadius:18,boxShadow:`0 8px 40px ${T.shadowMd}`,border:`1px solid ${T.border}`,padding:18 }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14 }}>
          <div style={{ display:"flex",gap:10,alignItems:"center" }}>
            <AvatarCircle initials={student.avatar} size={44} color={T.indigoText} bg={T.indigoBg}/>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:T.primary,fontFamily:"'Syne',sans-serif" }}>{student.name}</div>
              <div style={{ display:"flex",gap:5,marginTop:3,alignItems:"center" }}>
                <span style={{ fontSize:10,color:T.muted }}>{turma}</span>
                {student.aiSuggested && <span style={{ fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:5,background:T.violetBg,color:T.violetText }}>IA</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.muted }}>×</button>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12 }}>
          <div style={{ background:T.emeraldBg,borderRadius:10,padding:"9px 8px",textAlign:"center" }}>
            <div style={{ fontSize:22,fontWeight:800,color:T.emeraldText,fontFamily:"'Syne',sans-serif" }}>{student.points}</div>
            <div style={{ fontSize:9,color:T.emeraldText,fontWeight:700 }}>PONTOS</div>
          </div>
          <div style={{ background:student.warnings>0?T.roseBg:T.bgDeep,borderRadius:10,padding:"9px 8px",textAlign:"center" }}>
            <div style={{ fontSize:22,fontWeight:800,color:student.warnings>0?T.roseText:T.muted,fontFamily:"'Syne',sans-serif" }}>{student.warnings}</div>
            <div style={{ fontSize:9,color:student.warnings>0?T.roseText:T.muted,fontWeight:700 }}>ADVERTÊNCIAS</div>
          </div>
        </div>
        {student.lastMoved && (
          <div style={{ background:T.borderLight,borderRadius:8,padding:"7px 10px",marginBottom:12,fontSize:10,color:T.secondary }}>
            ◷ Lugar <strong style={{ color:T.primary }}>{student.slot}</strong> — {student.lastMovedDate} às {student.lastMoved}
          </div>
        )}
        <div style={{ display:"flex",gap:7,marginBottom:10 }}>
          <button onClick={()=>onAction(student.id,"gratificar")} style={{ flex:1,background:T.emeraldBg,border:`1.5px solid ${T.emerald}40`,borderRadius:9,padding:"8px 0",fontSize:12,fontWeight:700,color:T.emeraldText,cursor:"pointer" }}>★ Gratificar</button>
          <button onClick={()=>onAction(student.id,"advertir")}   style={{ flex:1,background:T.roseBg,border:`1.5px solid ${T.rose}40`,borderRadius:9,padding:"8px 0",fontSize:12,fontWeight:700,color:T.roseText,cursor:"pointer" }}>⚠ Advertir</button>
        </div>
        <span style={{ fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:student.present?T.emeraldBg:T.roseBg,color:student.present?T.emeraldText:T.roseText }}>
          {student.present?"● Presente":"○ Ausente"}
        </span>
      </div>
    </>
  );
}

function Timeline({students,T,onClose}){
  const moved=students.filter(s=>s.lastMoved);
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed",inset:0,zIndex:58,background:"rgba(0,0,0,0.2)" }}/>
      <div style={{ position:"fixed",right:0,top:0,bottom:0,width:296,background:T.card,borderLeft:`1px solid ${T.border}`,zIndex:60,display:"flex",flexDirection:"column",boxShadow:`-8px 0 32px ${T.shadow}`,animation:"slideInRight 0.22s ease" }}>
        <div style={{ padding:"18px 18px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:14,fontWeight:800,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Timeline</div>
            <div style={{ fontSize:10,color:T.muted,marginTop:2 }}>Histórico de posicionamentos</div>
          </div>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,color:T.muted,cursor:"pointer" }}>×</button>
        </div>
        <div style={{ flex:1,overflowY:"auto",padding:"16px 18px" }}>
          {moved.length===0 ? (
            <div style={{ textAlign:"center",padding:"40px 0",color:T.muted }}>
              <div style={{ fontSize:28,marginBottom:8 }}>◫</div>
              Arraste alunos para o mapa.
            </div>
          ) : (
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute",left:14,top:8,bottom:8,width:2,background:T.border,borderRadius:2 }}/>
              {moved.map((s)=>(
                <div key={s.id} style={{ display:"flex",gap:14,marginBottom:18,position:"relative" }}>
                  <div style={{ width:28,height:28,borderRadius:"50%",flexShrink:0,background:s.aiSuggested?T.violetBg:T.indigoBg,border:`2px solid ${s.aiSuggested?T.violet:T.indigo}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:s.aiSuggested?T.violetText:T.indigoText,zIndex:1 }}>
                    {s.avatar.charAt(0)}
                  </div>
                  <div style={{ flex:1,paddingTop:3 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ fontSize:12,fontWeight:700,color:T.primary }}>{s.name.split(" ")[0]}</span>
                      {s.aiSuggested && <span style={{ fontSize:8,fontWeight:800,padding:"1px 5px",borderRadius:5,background:T.violetBg,color:T.violetText }}>IA</span>}
                    </div>
                    <div style={{ fontSize:10,color:T.secondary,marginTop:1 }}>Lugar <strong style={{ color:T.indigoText }}>{s.slot}</strong></div>
                    <div style={{ display:"flex",gap:7,marginTop:3 }}>
                      <span style={{ fontSize:9,color:T.muted,background:T.borderLight,padding:"1px 6px",borderRadius:5 }}>{s.lastMovedDate}</span>
                      <span style={{ fontSize:9,color:T.muted }}>às {s.lastMoved}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function MapaSala(){
  const { T } = useTheme();
  const { selectedTurma, students:ctxStudents, occurrences, gratificar, advertir } = useApp();

  const [state,dispatch] = useReducer(reducer,{
    past:[], future:[],
    present:{ seatMap:buildMap(), students:ctxStudents.map(s=>({...s})) }
  });
  const [dragId,   setDragId]   = useState(null);
  const [overSlot, setOverSlot] = useState(null);
  const [popover,  setPopover]  = useState(null);
  const [timeline, setTimeline] = useState(false);

  const {seatMap,students}=state.present;
  const canUndo=state.past.length>0, canRedo=state.future.length>0;
  const unplaced=students.filter(s=>!Object.values(seatMap).includes(s.id));
  const presentCount=Object.values(seatMap).filter(Boolean).length;

  useEffect(()=>{
    const h=(e)=>{
      if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key==="z"){ e.preventDefault(); dispatch({type:"UNDO"}); }
      if((e.ctrlKey||e.metaKey)&&(e.key==="y"||(e.shiftKey&&e.key==="z"))){ e.preventDefault(); dispatch({type:"REDO"}); }
    };
    window.addEventListener("keydown",h);
    return ()=>window.removeEventListener("keydown",h);
  },[]);

  const onAction=useCallback((id,kind)=>{
    dispatch({type:"ACTION",id,kind});
    if(kind==="gratificar") gratificar(id); else advertir(id);
    setPopover(null);
  },[gratificar,advertir]);

  const tbBtn=(disabled=false,active=false)=>({
    background:active?T.indigoBg:T.card, border:`1.5px solid ${active?T.indigo+"50":T.border}`,
    borderRadius:9, padding:"6px 11px", fontSize:11, fontWeight:700,
    color:disabled?T.muted:active?T.indigoText:T.primary,
    cursor:disabled?"not-allowed":"pointer", display:"flex", alignItems:"center", gap:5,
    opacity:disabled?0.45:1, boxShadow:`0 1px 3px ${T.shadow}`,
  });

  function SeatSlot({k}){
    const sid=seatMap[k];
    const s=sid?students.find(x=>x.id===sid):null;
    const isOver=overSlot===k;
    const aiId=AI[k];
    const hint=!sid&&aiId&&unplaced.find(x=>x.id===aiId);
    const hasW=s?.warnings>0, isStar=s?.points>=14;

    return (
      <div onDragOver={(e)=>{e.preventDefault();setOverSlot(k);}} onDrop={(e)=>{e.preventDefault();if(dragId) dispatch({type:"MOVE",id:dragId,slot:k});setDragId(null);setOverSlot(null);}}
        style={{ width:94,height:88,border:`2px ${isOver?"solid":"dashed"} ${isOver?T.indigo:hint?T.violet+"70":s?"transparent":T.border}`,borderRadius:11,background:isOver?T.indigoBg:hint?T.violetBg:T.borderLight,display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.14s",position:"relative" }}>
        {s ? (
          <div draggable onDragStart={(e)=>{setDragId(s.id);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>{setDragId(null);setOverSlot(null);}}
            onClick={(e)=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setPopover({student:s,x:r.left+r.width/2-126,y:r.bottom+8});}}
            style={{ width:"100%",padding:"0 3px" }}>
            <div style={{ background:T.card,border:`2px solid ${hasW?T.rose:isStar?T.amber:T.border}`,borderRadius:10,padding:"7px 8px",cursor:"grab",display:"flex",flexDirection:"column",alignItems:"center",gap:3,position:"relative",userSelect:"none",opacity:dragId===s.id?0.4:1 }}>
              {isStar && <span style={{ position:"absolute",top:-8,right:-3,fontSize:11 }}>★</span>}
              {s.aiSuggested && <span style={{ position:"absolute",top:-7,left:-3,fontSize:7,fontWeight:800,padding:"1px 4px",borderRadius:4,background:T.violetBg,color:T.violetText }}>IA</span>}
              <AvatarCircle initials={s.avatar} size={28} color={hasW?T.roseText:isStar?T.amberText:T.indigoText} bg={hasW?T.roseBg:isStar?T.amberBg:T.indigoBg}/>
              <span style={{ fontSize:9,fontWeight:700,color:T.primary,textAlign:"center" }}>{s.name.split(" ")[0]}</span>
              <div style={{ display:"flex",gap:3 }}>
                <span style={{ fontSize:8,color:T.emeraldText,fontWeight:700 }}>+{s.points}</span>
                {s.warnings>0 && <span style={{ fontSize:8,color:T.roseText,fontWeight:700 }}>⚠{s.warnings}</span>}
              </div>
            </div>
          </div>
        ):hint?(
          <div style={{ textAlign:"center",padding:4 }}>
            <div style={{ fontSize:7,color:T.violetText,fontWeight:800 }}>IA SUGERE</div>
            <div style={{ fontSize:9,color:T.secondary,marginTop:1 }}>{students.find(x=>x.id===aiId)?.name.split(" ")[0]}</div>
          </div>
        ):(
          <span style={{ fontSize:10,color:isOver?T.indigoText:T.muted }}>{isOver?"Soltar":""}</span>
        )}
      </div>
    );
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%",overflow:"hidden" }}>
      {/* Header */}
      <header style={{ background:T.card,borderBottom:`1px solid ${T.border}`,padding:"12px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,gap:10,flexWrap:"wrap" }}>
        <div>
          <h1 style={{ margin:0,fontSize:19,fontWeight:800,color:T.primary,fontFamily:"'Syne',sans-serif" }}>Mapa da Sala</h1>
          <p style={{ margin:0,fontSize:11,color:T.muted,marginTop:1 }}>{selectedTurma} · {presentCount}/{students.length} presentes</p>
        </div>
        <div style={{ display:"flex",gap:7,alignItems:"center",flexWrap:"wrap" }}>
          <button style={tbBtn(!canUndo)} disabled={!canUndo} onClick={()=>dispatch({type:"UNDO"})} title="Ctrl+Z">↩ Desfazer {canUndo&&<span style={{ fontSize:9,background:T.indigoBg,color:T.indigoText,padding:"1px 4px",borderRadius:4 }}>{state.past.length}</span>}</button>
          <button style={tbBtn(!canRedo)} disabled={!canRedo} onClick={()=>dispatch({type:"REDO"})} title="Ctrl+Y">↪ Refazer</button>
          <div style={{ width:1,height:22,background:T.border }}/>
          <button style={{ ...tbBtn(),background:T.violetBg,borderColor:T.violet+"40",color:T.violetText }} onClick={()=>dispatch({type:"APPLY_AI"})}>✦ Sugestão IA</button>
          <button style={tbBtn(false,timeline)} onClick={()=>setTimeline(p=>!p)}>◷ Timeline</button>
          <div style={{ width:1,height:22,background:T.border }}/>
          <button style={{ background:T.indigo,color:"#fff",border:"none",borderRadius:9,padding:"7px 16px",fontSize:12,fontWeight:700,cursor:"pointer" }}>Salvar Chamada ✓</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex:1,display:"flex",overflow:"hidden" }}>
        {/* Mapa */}
        <div id="printable" style={{ flex:1,overflowY:"auto",padding:"22px 24px" }}>
          {/* Quadro */}
          <div style={{ background:T.blackboard,borderRadius:14,padding:"13px 24px",textAlign:"center",marginBottom:28,position:"relative",boxShadow:`0 4px 20px ${T.shadow}` }}>
            <div style={{ position:"absolute",top:-6,left:"50%",transform:"translateX(-50%)",background:"#6B4C2A",borderRadius:4,padding:"2px 50px",height:5 }}/>
            <span style={{ color:"rgba(255,255,255,0.82)",fontSize:12,fontWeight:600,fontFamily:"'Syne',sans-serif",letterSpacing:2 }}>✦ QUADRO ✦</span>
            <p style={{ margin:"3px 0 0",color:"rgba(255,255,255,0.35)",fontSize:10 }}>Arraste para posicionar · Clique para detalhes · Ctrl+Z desfaz</p>
          </div>

          <div style={{ display:"flex",flexDirection:"column",gap:12,alignItems:"center" }}>
            {Array.from({length:ROWS}).map((_,r)=>(
              <div key={r} style={{ display:"flex",gap:10,alignItems:"center" }}>
                <span style={{ fontSize:9,color:T.muted,fontWeight:700,width:18,textAlign:"right" }}>{r+1}</span>
                {Array.from({length:COLS}).map((_,c)=><SeatSlot key={`${r}-${c}`} k={`${r}-${c}`}/>)}
              </div>
            ))}
          </div>

          <div style={{ display:"flex",justifyContent:"center",marginTop:28 }}>
            <div style={{ background:T.card,border:`2px solid ${T.indigo}`,borderRadius:11,padding:"9px 32px",fontSize:11,fontWeight:700,color:T.indigoText,letterSpacing:1 }}>⊕ MESA DO PROFESSOR</div>
          </div>
        </div>

        {/* Painel direito */}
        <div style={{ width:268,flexShrink:0,background:T.card,borderLeft:`1px solid ${T.border}`,display:"flex",flexDirection:"column",overflow:"hidden" }}>
          <div onDragOver={(e)=>e.preventDefault()} onDrop={(e)=>{e.preventDefault();if(dragId) dispatch({type:"REMOVE",id:dragId});setDragId(null);}}
            style={{ padding:"14px 12px",borderBottom:`1px solid ${T.border}` }}>
            <div style={{ fontSize:9,fontWeight:800,color:T.muted,letterSpacing:1.2,marginBottom:8 }}>NÃO POSICIONADOS ({unplaced.length})</div>
            {unplaced.length===0 ? (
              <div style={{ textAlign:"center",padding:"10px 0",color:T.emeraldText,fontSize:11,fontWeight:700 }}>✓ Todos posicionados!</div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:5,maxHeight:210,overflowY:"auto" }}>
                {unplaced.map(s=>(
                  <div key={s.id} draggable onDragStart={(e)=>{setDragId(s.id);e.dataTransfer.effectAllowed="move";}} onDragEnd={()=>setDragId(null)}
                    onClick={(e)=>{const r=e.currentTarget.getBoundingClientRect();setPopover({student:s,x:r.right+8,y:r.top});}}
                    style={{ background:T.card,border:`1.5px solid ${T.border}`,borderRadius:10,padding:"8px 11px",cursor:"grab",display:"flex",alignItems:"center",gap:8,opacity:dragId===s.id?0.4:1,transition:"opacity 0.15s" }}>
                    <AvatarCircle initials={s.avatar} size={30} color={T.indigoText} bg={T.indigoBg}/>
                    <div>
                      <div style={{ fontSize:11,fontWeight:700,color:T.primary }}>{s.name}</div>
                      <div style={{ fontSize:10,color:T.emeraldText }}>+{s.points} pts</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ flex:1,overflowY:"auto",padding:"12px" }}>
            <div style={{ fontSize:9,fontWeight:800,color:T.muted,letterSpacing:1.2,marginBottom:8 }}>OCORRÊNCIAS DE HOJE</div>
            {occurrences.slice(0,8).map(o=>{
              const g=o.category==="gratificacao";
              return (
                <div key={o.id} style={{ display:"flex",gap:7,marginBottom:6,padding:"8px 9px",borderRadius:9,background:g?T.emeraldBg:T.roseBg,border:`1px solid ${g?T.emerald:T.rose}20` }}>
                  <span style={{ fontSize:12 }}>{g?"★":"⚠"}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:10,fontWeight:700,color:T.primary }}>{o.studentName}</div>
                    <div style={{ fontSize:9,color:T.secondary,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{o.text}</div>
                  </div>
                  <span style={{ fontSize:8,color:T.muted }}>{o.time}</span>
                </div>
              );
            })}
          </div>

          <div style={{ padding:"10px 12px",borderTop:`1px solid ${T.border}`,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6 }}>
            {[
              {label:"Presentes",val:presentCount,color:T.emeraldText,bg:T.emeraldBg},
              {label:"Advertidos",val:students.filter(s=>s.warnings>0).length,color:T.roseText,bg:T.roseBg},
              {label:"Destaque",val:students.filter(s=>s.points>=14).length,color:T.amberText,bg:T.amberBg},
            ].map(x=>(
              <div key={x.label} style={{ background:x.bg,borderRadius:8,padding:"7px 4px",textAlign:"center" }}>
                <div style={{ fontSize:16,fontWeight:800,color:x.color,fontFamily:"'Syne',sans-serif" }}>{x.val}</div>
                <div style={{ fontSize:8,color:x.color,fontWeight:700 }}>{x.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {timeline && <Timeline students={students} T={T} onClose={()=>setTimeline(false)}/>}
      {popover && <Popover student={students.find(s=>s.id===popover.student.id)} anchorPos={{x:popover.x,y:popover.y}} onClose={()=>setPopover(null)} onAction={onAction} turma={selectedTurma} T={T}/>}
    </div>
  );
}
