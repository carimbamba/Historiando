import { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

export const TURMAS = ["9º Ano A", "9º Ano B", "8º Ano A"];

const INITIAL_STUDENTS = [
  { id:  1, name: "Ana Souza",       avatar: "AS", points: 12, warnings: 0, present: false },
  { id:  2, name: "Bruno Lima",      avatar: "BL", points:  8, warnings: 1, present: false },
  { id:  3, name: "Carla Mendes",    avatar: "CM", points: 15, warnings: 0, present: false },
  { id:  4, name: "Diego Rocha",     avatar: "DR", points:  5, warnings: 2, present: false },
  { id:  5, name: "Elena Costa",     avatar: "EC", points: 10, warnings: 0, present: false },
  { id:  6, name: "Felipe Neto",     avatar: "FN", points:  7, warnings: 1, present: false },
  { id:  7, name: "Giovana Alves",   avatar: "GA", points: 18, warnings: 0, present: false },
  { id:  8, name: "Henrique Dias",   avatar: "HD", points:  3, warnings: 3, present: false },
  { id:  9, name: "Isabel Ferreira", avatar: "IF", points: 11, warnings: 0, present: false },
  { id: 10, name: "João Pedro",      avatar: "JP", points:  9, warnings: 1, present: false },
  { id: 11, name: "Karina Teles",    avatar: "KT", points: 14, warnings: 0, present: false },
  { id: 12, name: "Lucas Batista",   avatar: "LB", points:  6, warnings: 2, present: false },
];

const now   = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const today = () => new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const INITIAL_OCCURRENCES = [
  { id: 1, category: "gratificacao", studentId: 7,  studentName: "Giovana Alves",  text: "Excelente participação na aula de Império",   date: today(), time: "10:02", media: [] },
  { id: 2, category: "advertencia",  studentId: 4,  studentName: "Diego Rocha",    text: "Comportamento inadequado em sala",              date: today(), time: "09:14", media: [] },
  { id: 3, category: "notificacao",  studentId: 2,  studentName: "Bruno Lima",     text: "Notificação enviada aos responsáveis",          date: today(), time: "08:50", media: [] },
  { id: 4, category: "observacao",   studentId: 8,  studentName: "Henrique Dias",  text: "Necessita acompanhamento pedagógico extra",     date: today(), time: "11:30", media: [] },
  { id: 5, category: "advertencia",  studentId: 12, studentName: "Lucas Batista",  text: "Uso indevido do celular durante a aula",        date: today(), time: "09:45", media: [] },
];

export function AppProvider({ children }) {
  const [selectedTurma, setSelectedTurma] = useState(TURMAS[0]);
  const [students,      setStudents]      = useState(INITIAL_STUDENTS);
  const [occurrences,   setOccurrences]   = useState(INITIAL_OCCURRENCES);
  const [sidebarOpen,   setSidebarOpen]   = useState(true);

  const gratificar = useCallback((studentId, note = "+1 ponto") => {
    const s = students.find((x) => x.id === studentId);
    if (!s) return;
    setStudents((p) => p.map((x) => x.id === studentId ? { ...x, points: x.points + 1 } : x));
    setOccurrences((p) => [{
      id: Date.now(), category: "gratificacao",
      studentId, studentName: s.name, text: note,
      date: today(), time: now(), media: [],
    }, ...p]);
  }, [students]);

  const advertir = useCallback((studentId, note = "Advertência registrada") => {
    const s = students.find((x) => x.id === studentId);
    if (!s) return;
    setStudents((p) => p.map((x) => x.id === studentId ? { ...x, warnings: x.warnings + 1 } : x));
    setOccurrences((p) => [{
      id: Date.now(), category: "advertencia",
      studentId, studentName: s.name, text: note,
      date: today(), time: now(), media: [],
    }, ...p]);
  }, [students]);

  const addOccurrence = useCallback((occ) => {
    setOccurrences((p) => [{ id: Date.now(), ...occ }, ...p]);
  }, []);

  return (
    <AppContext.Provider value={{
      selectedTurma, setSelectedTurma,
      students, setStudents,
      occurrences, addOccurrence,
      gratificar, advertir,
      sidebarOpen, setSidebarOpen,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>");
  return ctx;
};
