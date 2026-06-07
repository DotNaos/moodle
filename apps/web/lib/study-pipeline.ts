export type StudyPipelineResponse = {
  workspace: string;
  term?: string;
  summary: StudyPipelineSummary;
  courses: StudyPipelineCourse[];
};

export type StudyPipelineSummary = {
  courses: number;
  complete: number;
  partial: number;
  missing: number;
  rawMaterials: number;
  extractedFiles: number;
  curatedFiles: number;
};

export type StudyPipelineCourse = {
  term: string;
  slug: string;
  title: string;
  path: string;
  status: "complete" | "partial" | "missing" | string;
  updatedAt?: string;
  raw: StudyPipelineRawStage;
  extracted: StudyPipelineExtractedStage;
  curated: StudyPipelineCuratedStage;
  reader: StudyPipelineReaderStatus;
  qualityGates: StudyPipelineQualityGate[];
  issues?: string[];
};

export type StudyPipelineRawStage = {
  status: string;
  moodleMd: StudyPipelineFileStatus;
  materialsYaml: StudyPipelineFileStatus;
  materials: StudyPipelineFileCount;
};

export type StudyPipelineExtractedStage = {
  status: string;
  script: StudyPipelineFileStatus;
  slides: StudyPipelineFileCount;
  tasks: StudyPipelineFileCount;
  solutions: StudyPipelineFileCount;
  assets: number;
};

export type StudyPipelineCuratedStage = {
  status: string;
  script: StudyPipelineFileStatus;
  tasks: StudyPipelineFileCount;
  solutions: StudyPipelineFileCount;
  solutionStates?: Record<string, number>;
  staleFiles?: string[];
};

export type StudyPipelineReaderStatus = {
  supported: boolean;
  url?: string;
};

export type StudyPipelineQualityGate = {
  id: string;
  label: string;
  passed: boolean;
};

export type StudyPipelineFileStatus = {
  path: string;
  exists: boolean;
  sizeBytes?: number;
  modTime?: string;
};

export type StudyPipelineFileCount = {
  files: number;
  bytes?: number;
};

export function pipelineStatusLabel(status: string): string {
  switch (status) {
    case "complete":
      return "Complete";
    case "partial":
      return "Partial";
    case "missing":
      return "Missing";
    case "stale":
      return "Stale";
    default:
      return status || "Unknown";
  }
}
