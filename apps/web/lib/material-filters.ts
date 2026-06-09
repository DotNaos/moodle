import type { Material } from "@/lib/dashboard-data";

export type MaterialTypeFilter = "all" | "pdf" | "pages";

export function isPdfMaterial(material: Material): boolean {
  return [material.fileType, material.url, material.name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes("pdf");
}

export function matchesMaterialTypeFilter(material: Material, filter: MaterialTypeFilter): boolean {
  if (filter === "all") {
    return true;
  }
  if (filter === "pdf") {
    return isPdfMaterial(material);
  }
  return !isPdfMaterial(material);
}

export function filterMaterialsBySection(
  materialsBySection: [string, Material[]][],
  filter: MaterialTypeFilter,
): [string, Material[]][] {
  if (filter === "all") {
    return materialsBySection;
  }

  return materialsBySection
    .map(([section, items]) => [section, items.filter((item) => matchesMaterialTypeFilter(item, filter))] as [string, Material[]])
    .filter(([, items]) => items.length > 0);
}

export function countMaterialsForFilter(materials: Material[], filter: MaterialTypeFilter): number {
  return materials.filter((item) => matchesMaterialTypeFilter(item, filter)).length;
}

export function materialTypeFilterLabel(filter: MaterialTypeFilter): string {
  if (filter === "pdf") {
    return "PDFs";
  }
  if (filter === "pages") {
    return "Seiten & Ressourcen";
  }
  return "Alle Typen";
}
