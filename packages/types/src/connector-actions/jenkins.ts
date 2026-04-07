export interface JenkinsBuildTriggerResult {
  id: string | undefined;
  url: string | undefined;
}

export interface JenkinsJobDisableResult {
  disabled: true;
}

export interface JenkinsJobEnableResult {
  enabled: true;
}

export interface JenkinsActionResults {
  build_trigger: JenkinsBuildTriggerResult;
  job_disable: JenkinsJobDisableResult;
  job_enable: JenkinsJobEnableResult;
}
