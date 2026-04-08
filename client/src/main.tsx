import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ฟังก์ชันล้างข้อความ Loading เมื่อ React พร้อมทำงาน
const rootElement = document.getElementById("root");
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
  console.log("React App Mounted Successfully");
} else {
  console.error("Root element not found");
}
