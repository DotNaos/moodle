import type { Material } from "@/lib/dashboard-data";

export type TaskSheetPairRole = "sheet" | "solution";

export type TaskSheetSolutionPair = {
  counterpart: Material;
  number: string;
  role: TaskSheetPairRole;
  sheet: Material;
  solution: Material;
};

export function findTaskSheetSolutionPair(
  material: Material | null,
  materials: Material[],
): TaskSheetSolutionPair | null {
  const selected = classifyTaskSheetMaterial(material);
  if (!material || !selected) {
    return null;
  }

  const candidates = materials
    .map((candidate) => ({ candidate, classification: classifyTaskSheetMaterial(candidate) }))
    .filter(({ candidate, classification }) =>
      Boolean(
        classification &&
          candidate.id !== material.id &&
          classification.number === selected.number &&
          classification.role !== selected.role,
      ),
    );

  const match =
    candidates.find(({ candidate }) => candidate.sectionName && candidate.sectionName === material.sectionName) ??
    candidates[0] ??
    null;
  if (!match?.classification) {
    return null;
  }

  const sheet = selected.role === "sheet" ? material : match.candidate;
  const solution = selected.role === "solution" ? material : match.candidate;

  return {
    counterpart: match.candidate,
    number: selected.number,
    role: selected.role,
    sheet,
    solution,
  };
}

function classifyTaskSheetMaterial(material: Material | null): { number: string; role: TaskSheetPairRole } | null {
  if (!material || !isLikelyPDFMaterial(material)) {
    return null;
  }
  const normalizedName = normalizeMaterialName(material.name);
  const number = normalizedName.match(/\baufgabenblatt\s*0*([0-9]+)\b/)?.[1];
  if (!number) {
    return null;
  }
  return {
    number: String(Number(number)),
    role: isSolutionMaterial(material) ? "solution" : "sheet",
  };
}

function isLikelyPDFMaterial(material: Material): boolean {
  const candidates = [material.fileType, material.type, material.name, material.url].filter(Boolean).join(" ");
  return /pdf/i.test(candidates) || !material.fileType;
}

function isSolutionMaterial(material: Material): boolean {
  const candidates = [material.type, material.name].filter(Boolean).join(" ");
  return /\b(lösung|loesung|solution|solutions)\b/i.test(candidates);
}

function normalizeMaterialName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}
