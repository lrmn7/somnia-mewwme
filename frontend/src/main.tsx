import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CLARITY_ID = import.meta.env.VITE_CLARITY_ID;
if (import.meta.env.PROD && CLARITY_ID) {
  const script = document.createElement("script");
  script.async = true;
  script.textContent = `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/${CLARITY_ID}";
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window,document,"clarity","script","${CLARITY_ID}");`;
  document.head.appendChild(script);
}

createRoot(document.getElementById("root")!).render(<App />);
