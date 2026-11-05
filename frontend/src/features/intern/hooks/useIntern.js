import { useContext } from "react";
import { InternContext } from "../context/internContext";

export function useIntern() {
  const context = useContext(InternContext);

  if (!context) {
    throw new Error("useIntern must be used within an InternProvider");
  }

  return context;
}
