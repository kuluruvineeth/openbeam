export interface LessonlyAssignmentCreateResult {
  id: string | undefined;
}

export interface LessonlyLessonUpdateResult {
  id: string | undefined;
  url: string | undefined;
}

export interface LessonlyActionResults {
  assignment_create: LessonlyAssignmentCreateResult;
  lesson_update: LessonlyLessonUpdateResult;
}
