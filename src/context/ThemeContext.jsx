import { createContext, useContext, useState } from "react";
import { makeTheme } from "../utils/theme";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const T = makeTheme(dark);
  const toggleDark = () => setDark((p) => !p);

  return (
    <ThemeContext.Provider value={{ dark, toggleDark, T }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
};
