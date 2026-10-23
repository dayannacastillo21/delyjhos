export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  photo: number;
  image_url?: string | null;
};

export const categories = [
  { name: "Tortas temáticas", icon: "🎂" },
  { name: "Bocaditos", icon: "🧁" },
  { name: "Dulces", icon: "🍪" },
  { name: "Productos salados", icon: "🥟" },
  { name: "Pedidos especiales", icon: "🎁" },
];

// Datos ilustrativos: no representan precios ni disponibilidad confirmados.
export const products: Product[] = [
  {
    id: 1,
    name: "Torta Unicornio",
    category: "Tortas temáticas",
    price: 120,
    photo: 0,
    description:
      "Una torta llena de color y magia. Podemos adaptar la temática, el sabor y la decoración a tu celebración.",
  },
  {
    id: 2,
    name: "Torta de Chocolate",
    category: "Tortas temáticas",
    price: 95,
    photo: 1,
    description:
      "Chocolate, una decoración especial y un momento para compartir. Consulta los tamaños y rellenos disponibles.",
  },
  {
    id: 3,
    name: "Bocaditos Variados (50 unid)",
    category: "Bocaditos",
    price: 80,
    photo: 2,
    description:
      "Una selección de pequeños bocados para acompañar tu mesa. La variedad se define al cotizar.",
  },
  {
    id: 4,
    name: "Cupcakes Decorados",
    category: "Bocaditos",
    price: 60,
    photo: 3,
    description:
      "Cupcakes con decoración personalizada para combinar con la temática de tu evento. Cantidad y sabores por confirmar.",
  },
  {
    id: 5,
    name: "Galletas Decoradas",
    category: "Dulces",
    price: 35,
    photo: 4,
    description:
      "Detalles dulces con formas y colores personalizados. Consulta cantidades, diseños e ingredientes antes de pedir.",
  },
  {
    id: 6,
    name: "Empanadas de Pollo (12 unid)",
    category: "Productos salados",
    price: 25,
    photo: 5,
    description:
      "Una opción salada para compartir en reuniones y celebraciones. Elaboración y disponibilidad previa coordinación.",
  },
];

export const money = (value: number) => `S/ ${value.toFixed(2)}`;
