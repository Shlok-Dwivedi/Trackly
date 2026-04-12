// Apply theme before first render to avoid flash
const savedTheme = localStorage.getItem("trackly-theme") || "light";
document.documentElement.classList.toggle("dark", savedTheme === "dark");

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
