export interface DoceboEnrollmentCreateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface DoceboCourseUpdateResult {
  recordId: string | undefined;
  url: string | undefined;
}

export interface DoceboActionResults {
  enrollment_create: DoceboEnrollmentCreateResult;
  course_update: DoceboCourseUpdateResult;
}
