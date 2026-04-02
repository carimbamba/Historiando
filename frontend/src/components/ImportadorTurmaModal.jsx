import { useState, useRef } from "react";
import { useTheme } from "../context/ThemeContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

function getToken() {
  try {
    const s = JSON.parse(localStorage.getItem("historiando_session"));
    return s?.token || "";
  } catch { return ""; }
}

export default function ImportadorTurmaModal({ onClose, onSaved }) {
  const { T, dark } = useTheme();
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  
  const fileInputRef = useRef(null);

  const SERIES_LABELS = {
    "6_fund": "6º Ano (Fund.)",  "7_fund": "7º Ano (Fund.)",
    "8_fund": "8º Ano (Fund.)",  "9_fund": "9º Ano (Fund.)",
    "1_medio": "1º Ano (EM)",    "2_medio": "2º Ano (EM)",
    "3_medio": "3º Ano (EM)",
  };
  const TURNO_LABELS = { matutino: "Matutino", vespertino: "Vespertino", noturno: "Noturno" };

  // 1. Download Template
  const handleDownloadTemplate = () => {
    window.location.href = `${API}/api/turmas/import/template`;
  };

  // 2. Upload and Validate
  const handleValidate = async (selectedFile) => {
    if (!selectedFile) return;
    setErrorMsg("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch(`${API}/api/turmas/import/validate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setFile(selectedFile);
      setPreviewData(data);
      setStep(2);
    } catch (err) {
      setErrorMsg(err.message || "Erro ao ler a planilha. Verifique o formato.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Confirm and Execute Transaction
  const handleExecute = async () => {
    if (!previewData || previewData.turma.collide) return;
    
    setErrorMsg("");
    setLoading(true);
    
    try {
      const res = await fetch(`${API}/api/turmas/import/execute`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${getToken()}` 
        },
        body: JSON.stringify(previewData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStep(3); // Sucesso
    } catch (err) {
      setErrorMsg(err.message || "Erro fatal ao salvar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {/* Modal Box */}
      <div onClick={(e) => e.stopPropagation()} style={{ background: T.card, borderRadius: 24, padding: "32px", width: 560, maxWidth: "100%", boxShadow: `0 10px 40px ${T.shadowMd}`, animation: "fadeUp 0.3s ease", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif" }}>
            {step === 1 && "Importar Planilha"}
            {step === 2 && "Revisão dos Dados"}
            {step === 3 && "Sucesso!"}
          </h2>
          {step !== 3 && (
            <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, color: T.muted, cursor: "pointer" }}>✕</button>
          )}
        </div>

        {errorMsg && (
          <div style={{ padding: "12px 16px", borderRadius: 12, background: T.roseBg, border: `1px solid ${T.rose}40`, color: T.roseText, fontSize: 13, fontWeight: 600, marginBottom: 20, lineHeight: 1.4 }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 1: UPLOAD */}
        {/* ========================================================= */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 14, color: T.secondary, margin: 0, lineHeight: 1.5 }}>
              Faça o upload de uma planilha contendo a Turma e os Alunos. Primeiro, utilize o nosso gabarito como base.
            </p>
            
            <button onClick={handleDownloadTemplate} style={{ alignSelf: "flex-start", padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${T.indigo}40`, background: "transparent", color: T.indigo, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              ↓ Baixar Planilha Modelo
            </button>

            {/* Drag Drop Zone */}
            <label style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              marginTop: 10, padding: "40px 20px", border: `2px dashed ${T.inputBorder}`, borderRadius: 16,
              background: T.input, cursor: "pointer", transition: "all 0.2s"
            }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = T.indigo}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = T.inputBorder}
            >
              <span style={{ fontSize: 40, marginBottom: 12 }}>📤</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: T.primary }}>Selecione ou solte aqui</span>
              <span style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>CSV ou XLSX (Máx: 2MB)</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                style={{ display: "none" }}
                onChange={(e) => handleValidate(e.target.files[0])}
              />
            </label>

            {loading && <div style={{ textAlign: "center", fontSize: 13, color: T.primary, fontWeight: 600 }}>Processando arquivo... ⏳</div>}
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: PREVIEW */}
        {/* ========================================================= */}
        {step === 2 && previewData && (
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
            {previewData.turma.collide && (
              <div style={{ padding: "14px 18px", borderRadius: 12, background: T.roseBg, border: `1px solid ${T.rose}`, color: T.roseText, fontSize: 13, fontWeight: 700 }}>
                {previewData.turma.warning}
              </div>
            )}

            <div style={{ background: T.input, borderRadius: 16, padding: "16px 20px", border: `1.5px solid ${T.border}` }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 14, color: T.muted, textTransform: "uppercase", letterSpacing: 1 }}>Turma Detectada</h3>
              <div style={{ fontSize: 18, fontWeight: 800, color: T.primary, fontFamily: "'Syne',sans-serif", marginBottom: 4 }}>
                {previewData.turma.nome}
              </div>
              <div style={{ fontSize: 13, color: T.secondary, display: "flex", gap: 14 }}>
                <span style={{ background: T.indigoBg, color: T.indigoText, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                  {SERIES_LABELS[previewData.turma.serie]}
                </span>
                <span style={{ background: T.card, padding: "2px 8px", borderRadius: 6, fontWeight: 700, border: `1px solid ${T.border}` }}>
                  {TURNO_LABELS[previewData.turma.turno]}
                </span>
              </div>
            </div>

            <div>
              <h3 style={{ margin: "10px 0", fontSize: 14, color: T.primary, fontWeight: 700 }}>
                Alunos Encontrados: <span style={{ color: T.indigo }}>{previewData.alunos.length}</span>
              </h3>
              
              <div style={{ background: T.card, border: `1.5px solid ${T.border}`, borderRadius: 12, maxHeight: 180, overflowY: "auto" }}>
                {previewData.alunos.map((a, i) => (
                  <div key={i} style={{ padding: "10px 14px", borderBottom: i < previewData.alunos.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>{a.nomeCompleto}</div>
                      <div style={{ fontSize: 11, color: T.muted }}>Mat: {a.matricula} · {a.email}</div>
                    </div>
                  </div>
                ))}
                {previewData.alunos.length === 0 && (
                  <div style={{ padding: 20, textAlign: "center", color: T.muted, fontSize: 13 }}>Nenhum aluno válido detectado na planilha.</div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 14 }}>
              <button onClick={() => setStep(1)} style={{ padding: "10px 20px", borderRadius: 10, border: `1.5px solid ${T.border}`, background: "transparent", color: T.secondary, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Voltar e Trocar
              </button>
              <button 
                onClick={handleExecute} 
                disabled={loading || previewData.turma.collide || previewData.alunos.length === 0} 
                style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: T.indigo, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: (loading || previewData.turma.collide || previewData.alunos.length === 0) ? 0.5 : 1 }}
              >
                {loading ? "Salvando..." : "Confirmar Importação"}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: SUCCESS */}
        {/* ========================================================= */}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <h2 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 800, color: "#059669", fontFamily: "'Syne',sans-serif" }}>
              Importação Concluída!
            </h2>
            <p style={{ fontSize: 14, color: T.secondary, marginBottom: 30 }}>
              A turma <strong>{previewData.turma.nome}</strong> e os seus {previewData.alunos.length} alunos foram cadastrados com sucesso e já estão ativos no sistema.
            </p>
            <button onClick={() => onSaved()} style={{ padding: "12px 30px", borderRadius: 12, border: "none", background: "#059669", color: "#fff", fontWeight: 800, fontSize: 14, cursor: "pointer", width: "100%" }}>
              Ir para Turmas
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
