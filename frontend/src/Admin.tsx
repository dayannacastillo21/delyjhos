import { useEffect, useState } from "react";
import { api, setAccessToken } from "./api";
import type { SessionUser } from "./api";
import Dashboard from "./admin/Dashboard";
import Readiness from "./admin/Readiness";
import Kardex from "./admin/Kardex";
import BusinessSettings from "./admin/BusinessSettings";
import SnackCatalog from "./SnackCatalog";
import ResourceView from "./admin/ResourceView";
import { Calendar, CostTools } from "./admin/Tools";
import { modules, management, statuses } from "./admin/modules";
import "./Admin.css";
import "./AdminRefinement.css";
import AdminNavigation from "./admin/AdminNavigation";

export default function Admin() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [section, setSection] = useState("dashboard");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setSection("dashboard");
      setError(
        "La sesión venció o cambió tu contraseña. Inicia sesión nuevamente.",
      );
    };
    window.addEventListener("delyjhos-session-expired", expired);
    return () =>
      window.removeEventListener("delyjhos-session-expired", expired);
  }, []);
  useEffect(() => {
    if (!navOpen) return;
    const sidebar = document.getElementById("admin-sidebar");
    const toggle = document.querySelector<HTMLButtonElement>(".admin-topbar > button");
    sidebar?.querySelector<HTMLButtonElement>("nav button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setNavOpen(false);
        toggle?.focus();
      }
      if (event.key === "Tab") {
        const items = Array.from(sidebar?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") || []);
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navOpen]);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await api<{ access_token: string; user: SessionUser }>(
        "/api/v1/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
          }),
        },
      );
      setAccessToken(result.access_token);
      setUser(result.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <main className="admin-login">
        <a href="#inicio" className="back-store">
          ← Volver a la pastelería
        </a>
        <section>
          <div className="login-logo logo-picture" />
          <p className="eyebrow">DELYJHOS · ADMINISTRACIÓN</p>
          <h1>Bienvenida de nuevo</h1>
          <p>Ingresa con tu cuenta para gestionar la pastelería.</p>
          <form onSubmit={login}>
            <label>
              Correo
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="admin-primary" disabled={busy}>
              {busy ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
          <p className="login-note">
            Acceso exclusivo para el equipo de DelyJhos.
          </p>
        </section>
      </main>
    );
  const module = modules.find((m) => m.key === section);
  return (
    <div className="admin-layout">
      {navOpen && <button className="admin-menu-backdrop" aria-label="Cerrar navegación administrativa" onClick={() => { setNavOpen(false); document.querySelector<HTMLButtonElement>(".admin-topbar > button")?.focus(); }} />}
      <aside id="admin-sidebar" className={"admin-sidebar " + (navOpen ? "open" : "")}>
        <a className="admin-brand" href="#/" aria-label="Volver a DelyJhos">
          <span className="logo-picture" /><span><strong>DelyJhos</strong><small>Gestión de la pastelería</small></span>
        </a>
        <AdminNavigation user={user} section={section} onSelect={key => { setSection(key); setNavOpen(false); }} />
        <div className="admin-session-card"><span>SESIÓN ACTIVA</span><strong>{user.name}</strong><small>{statuses[user.role] || user.role}</small></div>
        <a className="back-store" href="#inicio">
          ← Ver página pública
        </a>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            aria-label={navOpen ? "Cerrar menú administrativo" : "Abrir menú administrativo"}
            aria-expanded={navOpen}
            aria-controls="admin-sidebar"
            onClick={() => setNavOpen(!navOpen)}
          >
            ☰
          </button>
          <span className="admin-breadcrumb">Administración <span aria-hidden="true">/</span> <strong>{module?.title || ({ dashboard: "Resumen del negocio", settings: "Configuración", readiness: "Preparación del negocio", calendar: "Calendario", reports: "Costos y reportes", "snack-preview": "Vista previa de bocaditos" }[section] || "DelyJhos")}</strong></span>
          <div>
            <span className="admin-avatar">{user.name.charAt(0)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{statuses[user.role] || user.role}</small>
            </span>
            <button
              onClick={async () => {
                try {
                  await api("/api/v1/auth/logout", { method: "POST" });
                } finally {
                  setAccessToken("");
                  setUser(null);
                  setSection("dashboard");
                }
              }}
            >
              Salir
            </button>
          </div>
        </header>
        <main className="admin-content">
          {section === "dashboard" ? (
            <Dashboard user={user} />
          ) : section === "readiness" && management.includes(user.role) ? (
            <Readiness onOpenSection={setSection} />
          ) : section === "settings" ? (
            <BusinessSettings />
          ) : section === "snack-preview" ? (
            <SnackCatalog preview />
          ) : section === "reports" ? (
            <CostTools />
          ) : section === "calendar" ? (
            <Calendar />
          ) : section === "movements" ? (
            <Kardex />
          ) : module ? (
            <ResourceView key={section} module={module} user={user} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
