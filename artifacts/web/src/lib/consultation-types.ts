import type { LucideIcon } from "lucide-react";
import { Monitor, Stethoscope, FileText, Home } from "lucide-react";

export interface ConsultationType {
  id: string;
  labelPt: string;
  labelEn: string;
  labelEs: string;
  labelFr: string;
  labelDe: string;
  durationMinutes: number;
  icon: LucideIcon;
  /** HSL values for --primary override */
  accentHsl: string;
  /** Tailwind-friendly color classes for card styling */
  accentClass: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}

export const CONSULTATION_TYPES: ConsultationType[] = [
  {
    id: "teleconsulta",
    labelPt: "Teleconsulta",
    labelEn: "Teleconsultation",
    labelEs: "Teleconsulta",
    labelFr: "Téléconsultation",
    labelDe: "Telekonsultation",
    durationMinutes: 30,
    icon: Monitor,
    accentHsl: "212 100% 48%",
    accentClass: "bg-blue-500",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentText: "text-blue-600",
  },
  {
    id: "medicina-geral",
    labelPt: "Consulta de Medicina Geral e Familiar",
    labelEn: "General & Family Medicine",
    labelEs: "Medicina General y Familiar",
    labelFr: "Médecine Générale et Familiale",
    labelDe: "Allgemein- und Familienmedizin",
    durationMinutes: 30,
    icon: Stethoscope,
    accentHsl: "152 69% 40%",
    accentClass: "bg-emerald-500",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200",
    accentText: "text-emerald-600",
  },
  {
    id: "atestado",
    labelPt: "Emissão de Atestado",
    labelEn: "Medical Certificate",
    labelEs: "Emisión de Certificado",
    labelFr: "Certificat Médical",
    labelDe: "Ärztliches Attest",
    durationMinutes: 15,
    icon: FileText,
    accentHsl: "0 84% 60%",
    accentClass: "bg-red-500",
    accentBg: "bg-red-50",
    accentBorder: "border-red-200",
    accentText: "text-red-600",
  },
  {
    id: "domicilio",
    labelPt: "Consulta de Medicina Geral e Familiar ao Domicílio",
    labelEn: "Home Visit – General & Family Medicine",
    labelEs: "Consulta a Domicilio – Medicina General",
    labelFr: "Visite à Domicile – Médecine Générale",
    labelDe: "Hausbesuch – Allgemeinmedizin",
    durationMinutes: 60,
    icon: Home,
    accentHsl: "25 95% 53%",
    accentClass: "bg-orange-500",
    accentBg: "bg-orange-50",
    accentBorder: "border-orange-200",
    accentText: "text-orange-600",
  },
];

export function getConsultationType(id: string): ConsultationType | undefined {
  return CONSULTATION_TYPES.find((ct) => ct.id === id);
}

export function getLabel(ct: ConsultationType, lang: string): string {
  switch (lang) {
    case "en": return ct.labelEn;
    case "es": return ct.labelEs;
    case "fr": return ct.labelFr;
    case "de": return ct.labelDe;
    default: return ct.labelPt;
  }
}
