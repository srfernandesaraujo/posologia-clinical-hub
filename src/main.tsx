import "./i18n";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/charts.css";
import { applyChartTheme } from "./lib/chartTheme";

applyChartTheme();

createRoot(document.getElementById("root")!).render(<App />);
