import { useState } from "react";
export function useTheme() {
  const [dark, setDark] = useState(
    () => localStorage.getItem("rayzk-python.theme") !== "light",
  );
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  function toggle() {
    setDark((value) => {
      try {
        localStorage.setItem("rayzk-python.theme", value ? "light" : "dark");
      } catch {
        /* Theme remains usable without storage. */
      }
      return !value;
    });
  }
  return { dark, toggle };
}
