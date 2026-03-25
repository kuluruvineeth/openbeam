import type { JenkinsClient } from "../client";

export interface JenkinsHealthReport {
  description: string;
  score: number;
}

export interface JenkinsBuildRef {
  number: number;
  url: string;
  result?: string;
  timestamp?: number;
}

export interface JenkinsJob {
  name: string;
  url: string;
  color: string;
  description?: string;
  displayName?: string;
  fullName?: string;
  buildable?: boolean;
  healthReport?: JenkinsHealthReport[];
  lastBuild?: JenkinsBuildRef;
  lastSuccessfulBuild?: JenkinsBuildRef;
  lastFailedBuild?: JenkinsBuildRef;
  lastStableBuild?: JenkinsBuildRef;
  jobs?: JenkinsJob[];
}

interface JobListResponse {
  jobs?: JenkinsJob[];
}

const JOB_TREE =
  "jobs[name,url,color,description,displayName,fullName,buildable,healthReport[description,score],lastBuild[number,url,result,timestamp],lastSuccessfulBuild[number,url],lastFailedBuild[number,url],lastStableBuild[number,url],jobs[name,url,color,description,displayName,fullName,buildable,healthReport[description,score],lastBuild[number,url,result,timestamp],lastSuccessfulBuild[number,url],lastFailedBuild[number,url],lastStableBuild[number,url]]]";

export async function listJobs(client: JenkinsClient): Promise<JenkinsJob[]> {
  const response = await client.get<JobListResponse>("/api/json", {
    tree: JOB_TREE,
  });
  return flattenJobs(response.jobs ?? []);
}

function flattenJobs(jobs: JenkinsJob[], prefix = ""): JenkinsJob[] {
  const result: JenkinsJob[] = [];
  for (const job of jobs) {
    const fullName = prefix ? `${prefix}/${job.name}` : job.name;
    if (job.jobs && job.jobs.length > 0) {
      result.push(...flattenJobs(job.jobs, fullName));
    } else {
      result.push({ ...job, fullName });
    }
  }
  return result;
}
