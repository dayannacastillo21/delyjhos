export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  resource?: string;
};
export type Module = {
  key: string;
  title: string;
  icon: string;
  fields: Field[];
  columns: string[];
  readonly?: boolean;
  roles: string[];
  lines?: "recipes" | "orders" | "purchases";
};
export const management = ["admin", "manager"];
export const all = ["admin", "manager", "sales", "production"];
export const sales = ["admin", "manager", "sales"];
export const modules: Module[] = [
  {
    key: "snacks",
    title: "Catálogo de bocaditos",
    icon: "◈",
    roles: management,
    columns: ["name", "kind", "is_published", "is_available", "source_page"],
    fields: [
      { key: "name", label: "Nombre", required: true },
      {
        key: "slug",
        label: "Identificador (minúsculas y guiones)",
        required: true,
      },
      { key: "kind", label: "Tipo", options: ["savory", "sweet"] },
      { key: "description", label: "Descripción verificada", type: "textarea" },
      { key: "image_url", label: "Fotografía verificada", type: "image" },
      { key: "source_document", label: "Documento de origen" },
      { key: "source_page", label: "Página de origen", type: "integer" },
      { key: "is_published", label: "Visible en catálogo", type: "checkbox" },
      {
        key: "is_available",
        label: "Disponibilidad confirmada",
        type: "checkbox",
      },
    ],
  },
  {
    key: "snack-presentations",
    title: "Presentaciones y precios",
    icon: "◇",
    roles: management,
    columns: [
      "snack_id",
      "units",
      "historical_price",
      "current_price",
      "price_confirmed",
    ],
    fields: [
      {
        key: "snack_id",
        label: "Bocadito",
        resource: "snacks",
        required: true,
      },
      {
        key: "units",
        label: "Unidades por presentación",
        type: "integer",
        required: true,
      },
      {
        key: "historical_price",
        label: "Precio histórico (no se publica)",
        type: "number",
        required: true,
      },
      {
        key: "source_year",
        label: "Año del precio histórico",
        type: "integer",
        required: true,
      },
      {
        key: "current_price",
        label: "Precio actual revisado (S/)",
        type: "number",
      },
      {
        key: "price_confirmed",
        label: "Confirmar precio actual para publicación",
        type: "checkbox",
      },
    ],
  },
  {
    key: "snack-quotes",
    title: "Mesas de bocaditos",
    icon: "▧",
    roles: management,
    columns: [
      "id",
      "name",
      "celebration",
      "due_date",
      "guests",
      "status",
      "quoted_price",
    ],
    fields: [
      {
        key: "status",
        label: "Estado",
        options: ["pending", "contacted", "quoted", "accepted", "rejected"],
      },
      {
        key: "staff_notes",
        label: "Revisión de disponibilidad y respuesta",
        type: "textarea",
      },
      {
        key: "quoted_price",
        label: "Precio total revisado (S/)",
        type: "number",
      },
    ],
  },
  {
    key: "product-images",
    title: "Galería de productos",
    icon: "▣",
    roles: management,
    columns: ["product_id", "url", "alt"],
    fields: [
      {
        key: "product_id",
        label: "Producto",
        resource: "products",
        required: true,
      },
      { key: "url", label: "Imagen", type: "image", required: true },
      { key: "alt", label: "Descripción accesible" },
    ],
  },
  {
    key: "orders",
    title: "Pedidos",
    icon: "▤",
    roles: all,
    columns: ["id", "customer_name", "due_date", "status", "total", "balance"],
    lines: "orders",
    fields: [
      {
        key: "customer_id",
        label: "Cliente",
        resource: "customers",
        required: true,
      },
      {
        key: "due_date",
        label: "Fecha de entrega",
        type: "date",
        required: true,
      },
      { key: "notes", label: "Personalización y notas", type: "textarea" },
    ],
  },
  {
    key: "products",
    title: "Productos",
    icon: "♧",
    roles: all,
    columns: ["name", "category_id", "price", "is_active"],
    fields: [
      { key: "name", label: "Nombre", required: true },
      {
        key: "slug",
        label: "Identificador URL (sin espacios)",
        required: true,
      },
      {
        key: "category_id",
        label: "Categoría",
        resource: "categories",
        required: true,
      },
      { key: "price", label: "Precio S/", type: "number", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "image_url", label: "Fotografía", type: "image" },
      { key: "is_active", label: "Disponible", type: "checkbox" },
      { key: "is_featured", label: "Destacado", type: "checkbox" },
    ],
  },
  {
    key: "categories",
    title: "Categorías",
    icon: "▦",
    roles: all,
    columns: ["name", "slug", "is_active"],
    fields: [
      { key: "name", label: "Nombre", required: true },
      { key: "slug", label: "Identificador URL", required: true },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "is_active", label: "Activa", type: "checkbox" },
    ],
  },
  {
    key: "customers",
    title: "Clientes",
    icon: "♙",
    roles: sales,
    columns: ["name", "phone", "email"],
    fields: [
      { key: "name", label: "Nombre", required: true },
      { key: "phone", label: "Teléfono", required: true },
      { key: "email", label: "Correo", type: "email" },
      { key: "notes", label: "Notas", type: "textarea" },
    ],
  },
  {
    key: "quotes",
    title: "Cotizaciones",
    icon: "✎",
    roles: sales,
    columns: [
      "name",
      "theme",
      "portions",
      "due_date",
      "status",
      "quoted_price",
    ],
    fields: [
      {
        key: "status",
        label: "Estado",
        options: ["pending", "contacted", "quoted", "accepted", "rejected"],
        required: true,
      },
      { key: "quoted_price", label: "Precio cotizado S/", type: "number" },
      {
        key: "staff_notes",
        label: "Respuesta y notas internas",
        type: "textarea",
      },
    ],
  },
  {
    key: "ingredients",
    title: "Inventario",
    icon: "◇",
    roles: all,
    columns: ["name", "unit", "stock", "minimum_stock", "unit_cost"],
    fields: [
      { key: "name", label: "Ingrediente", required: true },
      {
        key: "unit",
        label: "Unidad base",
        options: ["kg", "g", "l", "ml", "unidad"],
        required: true,
      },
      {
        key: "minimum_stock",
        label: "Stock mínimo",
        type: "number",
        required: true,
      },
      {
        key: "unit_cost",
        label: "Costo por unidad S/",
        type: "number",
        required: true,
      },
    ],
  },
  {
    key: "recipes",
    title: "Recetas",
    icon: "▧",
    roles: all,
    columns: [
      "name",
      "product_id",
      "yield_quantity",
      "labor_cost",
      "overhead_cost",
    ],
    lines: "recipes",
    fields: [
      { key: "name", label: "Nombre", required: true },
      {
        key: "product_id",
        label: "Producto",
        resource: "products",
        required: true,
      },
      {
        key: "yield_quantity",
        label: "Unidades de producto que rinde",
        type: "number",
        required: true,
      },
      {
        key: "labor_cost",
        label: "Mano de obra por receta S/",
        type: "number",
        required: true,
      },
      {
        key: "overhead_cost",
        label: "Otros costos por receta S/",
        type: "number",
        required: true,
      },
      { key: "instructions", label: "Preparación", type: "textarea" },
    ],
  },
  {
    key: "suppliers",
    title: "Proveedores",
    icon: "⌂",
    roles: management,
    columns: ["name", "phone", "email"],
    fields: [
      { key: "name", label: "Nombre", required: true },
      { key: "phone", label: "Teléfono" },
      { key: "email", label: "Correo", type: "email" },
      { key: "notes", label: "Notas", type: "textarea" },
    ],
  },
  {
    key: "purchases",
    title: "Compras",
    icon: "⊞",
    roles: management,
    columns: ["id", "supplier_id", "reference", "total", "status"],
    lines: "purchases",
    fields: [
      {
        key: "supplier_id",
        label: "Proveedor",
        resource: "suppliers",
        required: true,
      },
      { key: "reference", label: "Comprobante o referencia" },
    ],
  },
  {
    key: "production",
    title: "Producción",
    icon: "♧",
    roles: all,
    columns: ["title", "order_id", "due_date", "status", "assigned_to"],
    fields: [
      { key: "order_id", label: "Pedido", resource: "orders", required: true },
      { key: "title", label: "Tarea", required: true },
      { key: "due_date", label: "Fecha", type: "date", required: true },
      {
        key: "assigned_to",
        label: "ID del responsable (opcional)",
        type: "integer",
      },
      {
        key: "status",
        label: "Estado",
        options: ["pending", "in_progress", "done"],
        required: true,
      },
      { key: "notes", label: "Notas", type: "textarea" },
    ],
  },
  {
    key: "payments",
    title: "Pagos",
    icon: "＄",
    roles: sales,
    readonly: true,
    columns: ["order_id", "amount", "method", "reference", "created_at"],
    fields: [],
  },
  {
    key: "movements",
    title: "Movimientos",
    icon: "⇄",
    roles: all,
    readonly: true,
    columns: [
      "ingredient_id",
      "quantity",
      "balance_after",
      "kind",
      "reason",
      "created_at",
    ],
    fields: [],
  },
  {
    key: "users",
    title: "Usuarios",
    icon: "♙",
    roles: ["admin"],
    columns: ["name", "email", "role", "is_active"],
    fields: [
      { key: "name", label: "Nombre", required: true },
      { key: "email", label: "Correo", type: "email", required: true },
      {
        key: "role",
        label: "Rol",
        options: ["admin", "manager", "sales", "production"],
        required: true,
      },
      {
        key: "password",
        label: "Contraseña (mínimo 12 caracteres)",
        type: "password",
        required: true,
      },
      { key: "is_active", label: "Activo", type: "checkbox" },
    ],
  },
  {
    key: "audit",
    title: "Auditoría",
    icon: "☷",
    roles: management,
    readonly: true,
    columns: [
      "user_id",
      "action",
      "entity",
      "entity_id",
      "details",
      "created_at",
    ],
    fields: [],
  },
];
export const labels: Record<string, string> = {
  is_published: "Publicado",
  is_available: "Disponible",
  source_page: "Página de origen",
  source_document: "Documento de origen",
  snack_id: "Bocadito",
  units: "Unidades",
  historical_price: "Precio histórico",
  current_price: "Precio actual",
  price_confirmed: "Precio confirmado",
  source_year: "Año de origen",
  guests: "Invitados",
  celebration: "Celebración",
  comments: "Comentarios",
  id: "#",
  name: "Nombre",
  customer_name: "Cliente",
  due_date: "Entrega",
  status: "Estado",
  total: "Total S/",
  balance: "Saldo S/",
  category_id: "Categoría",
  price: "Precio S/",
  is_active: "Activo",
  slug: "URL",
  phone: "Teléfono",
  email: "Correo",
  theme: "Temática",
  portions: "Porciones",
  quoted_price: "Cotización S/",
  unit: "Unidad",
  stock: "Stock",
  minimum_stock: "Mínimo",
  unit_cost: "Costo/u S/",
  product_id: "Producto",
  yield_quantity: "Rendimiento",
  labor_cost: "Mano de obra",
  overhead_cost: "Otros costos",
  supplier_id: "Proveedor",
  reference: "Referencia",
  title: "Tarea",
  order_id: "Pedido",
  assigned_to: "Responsable",
  amount: "Importe",
  method: "Medio",
  created_at: "Registro",
  ingredient_id: "Ingrediente",
  quantity: "Cantidad",
  balance_after: "Saldo",
  kind: "Tipo",
  role: "Rol",
  user_id: "Usuario",
  action: "Acción",
  entity: "Entidad",
  entity_id: "Registro",
  details: "Detalle",
};
export const statuses: Record<string, string> = {
  sweet: "Dulces",
  savory: "Salados",
  pending: "Pendiente",
  confirmed: "Confirmado",
  production: "En producción",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
  received: "Recibida",
  contacted: "Contactado",
  quoted: "Cotizado",
  accepted: "Aceptado",
  rejected: "Rechazado",
  in_progress: "En proceso",
  done: "Completado",
  cash: "Efectivo",
  transfer: "Transferencia",
  purchase: "Compra",
  adjustment: "Ajuste",
  admin: "Administrador",
  manager: "Encargado",
  sales: "Ventas",
};
export const currency = (value: unknown) =>
  `S/ ${Number(value || 0).toFixed(2)}`;
export const show = (value: unknown) =>
  value === true
    ? "Sí"
    : value === false
      ? "No"
      : value == null
        ? "—"
        : statuses[String(value)] || String(value);
