import type { SessionUser } from "../api";
import { modules, management } from "./modules";
import AdminIcon from "./AdminIcon";

const groups = [
  { name: "Resumen", entries: ["dashboard", "readiness"] },
  { name: "Operación diaria", entries: ["orders", "quotes", "snack-quotes", "customers", "production", "calendar", "payments"] },
  { name: "Catálogo y creaciones", entries: ["products", "works", "product-images", "categories", "snacks", "snack-presentations", "snack-packages", "snack-preview"] },
  { name: "Inventario y costos", entries: ["ingredients", "recipes", "suppliers", "purchases", "movements", "reports"] },
  { name: "Administración", entries: ["users", "audit", "settings"] },
];
const extra: Record<string, { title: string; icon: string }> = {
  dashboard: { title: "Inicio", icon: "dashboard" },
  calendar: { title: "Calendario", icon: "calendar" },
  readiness: { title: "Preparación del negocio", icon: "check" },
  reports: { title: "Costos y reportes", icon: "report" },
  settings: { title: "Configuración", icon: "settings" },
  "snack-preview": { title: "Vista previa de bocaditos", icon: "image" },
};
function icon(key: string) {
  if (["orders", "quotes", "snack-quotes", "production", "purchases", "audit"].includes(key)) return "orders";
  if (["customers", "suppliers", "users"].includes(key)) return "people";
  if (["works", "product-images"].includes(key)) return "image";
  if (key === "recipes") return "recipe";
  if (key === "payments") return "money";
  return "catalog";
}
export default function AdminNavigation({ user, section, onSelect }: { user: SessionUser; section: string; onSelect: (key: string) => void }) {
  const available = [...modules.filter(module => module.roles.includes(user.role)).map(module => ({ key: module.key, title: module.title, icon: icon(module.key) })), ...Object.entries(extra).filter(([key]) => ["dashboard", "calendar"].includes(key) || management.includes(user.role)).map(([key, value]) => ({ key, ...value }))];
  return <nav aria-label="Administración">{groups.map(group => {
    const entries = group.entries.map(key => available.find(item => item.key === key)).filter(item => item !== undefined);
    return entries.length > 0 && <div className="admin-nav-group" key={group.name}><p>{group.name}</p>{entries.map(entry => <button key={entry.key} aria-label={entry.title} aria-current={section === entry.key ? "page" : undefined} className={section === entry.key ? "selected" : ""} onClick={() => onSelect(entry.key)}><span className="admin-nav-icon"><AdminIcon name={entry.icon} /></span><span>{entry.title}</span></button>)}</div>;
  })}</nav>;
}
