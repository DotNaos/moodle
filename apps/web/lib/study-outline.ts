export type StudyTaskOutline = {
  id: string;
  sheetTitle: string;
  status: string;
  title: string;
};

export type ScriptSectionOutline = {
  blockIndex: number;
  id: string;
  level: number;
  title: string;
};

export type StudyOutline = {
  scriptSections: ScriptSectionOutline[];
  tasks: StudyTaskOutline[];
};

export const EMPTY_STUDY_OUTLINE: StudyOutline = {
  scriptSections: [],
  tasks: [],
};
