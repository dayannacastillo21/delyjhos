import { lazy, Suspense, useEffect, useState } from "react";
import App from "./App";
import { setAccessToken } from "./api";
const Admin = lazy(() => import("./Admin"));
export default function Root() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const listener = () => {
      setHash(window.location.hash);
      if (!window.location.hash.startsWith("#/admin")) setAccessToken("");
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  return (
    <Suspense fallback={<p className="loading-page">Cargando DelyJhos…</p>}>
      {hash.startsWith("#/admin") ? <Admin /> : <App />}
    </Suspense>
  );
}
