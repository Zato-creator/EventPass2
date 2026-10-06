// Datos de ejemplo SOLO para desarrollo visual mientras WF05 no está listo.
// Se activan con NEXT_PUBLIC_USE_MOCKS=true. En Vercel debe estar en false.
// Los cupos aquí son fijos: el cálculo real (capacidad − CONFIRMADAS) lo hace n8n.
import type { EventoPublico } from "@/types/api";

const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=60`;

export const EVENTOS_MOCK: EventoPublico[] = [
  { evento_id: "EVT-MOCK-01", nombre: "Feria de Ciencias Intercolegial 2026", categoria: "Académico",
    descripcion: "Proyectos de investigación de estudiantes de 6° a 11°.", fecha: "2026-10-20", hora: "08:00",
    lugar: "Coliseo Colegio San Pedro", capacidad: 120, inscritos_confirmados: 37, cupos_disponibles: 83,
    en_lista_espera: 0, imagen_url: img("photo-1532094349884-543bc11b234d"), organizador: "Área de Ciencias",
    estado: "PUBLICADO", disponibilidad: "DISPONIBLE" },
  { evento_id: "EVT-MOCK-02", nombre: "Taller de Robótica con Arduino", categoria: "Tecnología",
    descripcion: "Construye y programa tu primer robot seguidor de línea.", fecha: "2026-10-14", hora: "14:00",
    lugar: "Laboratorio de Sistemas, Bloque C", capacidad: 2, inscritos_confirmados: 2, cupos_disponibles: 0,
    en_lista_espera: 1, imagen_url: img("photo-1561557944-6e7860d1a7eb"), organizador: "Club de Robótica",
    estado: "PUBLICADO", disponibilidad: "LLENO" },
  { evento_id: "EVT-MOCK-03", nombre: "Escuela de Padres: Uso Seguro de Redes", categoria: "Comunidad",
    descripcion: "Charla para acudientes sobre acompañamiento digital.", fecha: "2026-10-07", hora: "18:00",
    lugar: "Auditorio Principal", capacidad: 80, inscritos_confirmados: 12, cupos_disponibles: 68,
    en_lista_espera: 0, imagen_url: img("photo-1544531586-fde5298cdd40"), organizador: "Orientación Escolar",
    estado: "PUBLICADO", disponibilidad: "DISPONIBLE" },
  { evento_id: "EVT-MOCK-04", nombre: "Torneo Intercolegial de Microfútbol", categoria: "Deportes",
    descripcion: "Categorías infantil y juvenil.", fecha: "2026-10-25", hora: "09:00",
    lugar: "Cancha Múltiple Municipal", capacidad: 64, inscritos_confirmados: 20, cupos_disponibles: 44,
    en_lista_espera: 0, imagen_url: img("photo-1574629810360-7efbbe195018"), organizador: "Educación Física",
    estado: "PUBLICADO", disponibilidad: "DISPONIBLE" },
  { evento_id: "EVT-MOCK-05", nombre: "Muestra Cultural: Danzas Colombianas", categoria: "Cultura",
    descripcion: "Muestra de danzas folclóricas por grados.", fecha: "2026-10-30", hora: "16:00",
    lugar: "Teatro del Colegio", capacidad: 150, inscritos_confirmados: 0, cupos_disponibles: 150,
    en_lista_espera: 0, imagen_url: img("photo-1508700115892-45ecd05ae2ad"), organizador: "Área de Artes",
    estado: "CANCELADO", disponibilidad: "CANCELADO" },
  { evento_id: "EVT-MOCK-06", nombre: "Olimpiadas de Matemáticas — Fase Local", categoria: "Académico",
    descripcion: "Primera fase de las olimpiadas.", fecha: "2026-09-28", hora: "07:30",
    lugar: "Aulas 101–110", capacidad: 60, inscritos_confirmados: 58, cupos_disponibles: 2,
    en_lista_espera: 0, imagen_url: img("photo-1509228468518-180dd4864904"), organizador: "Área de Matemáticas",
    estado: "CERRADO", disponibilidad: "CERRADO" },
];
