/**
 * makeTheme — Fonte única de todos os tokens de cor.
 * Aceita boolean `dark` e retorna o objeto de tema.
 * Usado via useTheme() em qualquer componente.
 */
export const makeTheme = (dark) => ({
  // Superfícies
  bg:          dark ? "#0F172A" : "#F1F5F9",
  bgDeep:      dark ? "#080E1A" : "#E8EDF4",
  card:        dark ? "#1E293B" : "#FFFFFF",
  cardAlt:     dark ? "#162032" : "#F8FAFC",
  border:      dark ? "#2E3E55" : "#E2E8F0",
  borderLight: dark ? "#1C2E44" : "#F1F5F9",
  // Texto
  primary:     dark ? "#F1F5F9" : "#1E293B",
  secondary:   dark ? "#94A3B8" : "#64748B",
  muted:       dark ? "#475569" : "#94A3B8",
  // Inputs
  input:       dark ? "#0D1526" : "#F8FAFC",
  inputBorder: dark ? "#2E3E55" : "#E2E8F0",
  // Indigo — ação principal
  indigo:      "#4F46E5",
  indigoBg:    dark ? "#1E1B4B" : "#EEF2FF",
  indigoText:  dark ? "#A5B4FC" : "#4F46E5",
  indigoMid:   "#818CF8",
  // Emerald — gratificação / presença
  emerald:     "#059669",
  emeraldBg:   dark ? "#064E3B" : "#ECFDF5",
  emeraldText: dark ? "#6EE7B7" : "#059669",
  // Rose — advertência / risco
  rose:        "#E11D48",
  roseBg:      dark ? "#4C0519" : "#FFF1F2",
  roseText:    dark ? "#FDA4AF" : "#E11D48",
  // Amber — gamificação / destaque
  amber:       "#D97706",
  amberBg:     dark ? "#451A03" : "#FFFBEB",
  amberText:   dark ? "#FCD34D" : "#D97706",
  // Sky — observação
  sky:         "#0284C7",
  skyBg:       dark ? "#0C2A3E" : "#F0F9FF",
  skyText:     dark ? "#7DD3FC" : "#0284C7",
  // Violet — IA / notificação
  violet:      "#7C3AED",
  violetBg:    dark ? "#2E1065" : "#F5F3FF",
  violetText:  dark ? "#C4B5FD" : "#7C3AED",
  // Layout
  sidebarBg:   dark ? "#0D1526" : "#1E293B",
  blackboard:  dark ? "#0A1F14" : "#1E3A2F",
  shadow:      dark ? "rgba(0,0,0,0.5)"  : "rgba(30,41,59,0.09)",
  shadowMd:    dark ? "rgba(0,0,0,0.65)" : "rgba(30,41,59,0.14)",
});
