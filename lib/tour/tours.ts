export interface TourStep {
  target: string;
  title: string;
  body: string;
}

export interface TourDef {
  id: string;
  steps: TourStep[];
}

export const TOURS: Record<string, TourDef> = {
  "dashboard-home": {
    id: "dashboard-home",
    steps: [
      {
        target: "checklist",
        title: "Bienvenido a World Binary Sorteos",
        body: "Esta lista te guía por los 3 pasos para dejar tu primer sorteo listo para compartir: crearlo, cargar premios y activarlo.",
      },
      {
        target: "new-sorteo-btn",
        title: "Creá tu sorteo",
        body: "Empezá por acá: definís nombre, link público y cuántos ganadores va a tener.",
      },
      {
        target: "nav-codes",
        title: "Tu pool de cuentas bono",
        body: "Acá cargás los códigos que después vas a poder asignar a cualquiera de tus sorteos como premio.",
      },
      {
        target: "nav-team",
        title: "Sumá colaboradores",
        body: "Si trabajás con un equipo, invitalos acá para que puedan ayudarte a gestionar tus sorteos.",
      },
    ],
  },
  "sorteo-detail": {
    id: "sorteo-detail",
    steps: [
      {
        target: "share-card",
        title: "Tu sorteo ya tiene link",
        body: "Usá el QR o copiá el mensaje para compartirlo por WhatsApp o Instagram con tu comunidad.",
      },
      {
        target: "premios-btn",
        title: "Cargá los premios primero",
        body: "Necesitás al menos tantas cuentas bono disponibles como ganadores vayas a sortear, antes de poder activar el sorteo.",
      },
      {
        target: "estado-card",
        title: "Activalo cuando esté listo",
        body: 'Solo un sorteo en estado "Activo" es visible en su link público. Pausalo o volvelo a activar cuando quieras.',
      },
      {
        target: "sortear-btn",
        title: "El sorteo es un solo disparo",
        body: "Cuando estés listo, girás la ruleta acá. Es una acción irreversible: no se puede deshacer ni repetir, así que asegurate de tener todo cargado antes.",
      },
    ],
  },
};

const VERSION = "v1";

function tourStorageKey(tourId: string) {
  return `wb_tour_${tourId}_${VERSION}`;
}

export function isTourDismissed(tourId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(tourStorageKey(tourId)) !== null;
  } catch {
    return true;
  }
}

export function markTourDismissed(tourId: string, reason: "completed" | "skipped") {
  try {
    window.localStorage.setItem(tourStorageKey(tourId), reason);
  } catch {
    // localStorage unavailable (private mode, etc.) — non-critical, ignore.
  }
}

export function resetTour(tourId: string) {
  try {
    window.localStorage.removeItem(tourStorageKey(tourId));
  } catch {
    // ignore
  }
}
