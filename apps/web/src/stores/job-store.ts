import { create } from "zustand";
import type { JobProgress } from "@/lib/job-types";

const COMPLETED_JOB_TTL_MS = 30_000;
const MAX_JOBS = 50;

type JobStoreState = {
  jobsById: Record<string, JobProgress>;
  dismissedIds: Record<string, boolean>;
  activeJobs: JobProgress[];
  runningCount: number;
};

type JobStoreActions = {
  upsertJob: (job: JobProgress) => void;
  dismissJob: (id: string) => void;
  clearCompleted: () => void;
};

type JobStore = JobStoreState & JobStoreActions;

function computeDerivedState(
  jobsById: Record<string, JobProgress>,
  dismissedIds: Record<string, boolean>
): { activeJobs: JobProgress[]; runningCount: number } {
  const jobs = Object.values(jobsById);
  const activeJobs = jobs
    .filter((j) => !dismissedIds[j.id])
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  const runningCount = jobs.filter((j) => j.status === "running").length;
  return { activeJobs, runningCount };
}

export const useJobStore = create<JobStore>((set, get) => ({
  jobsById: {},
  dismissedIds: {},
  activeJobs: [],
  runningCount: 0,

  upsertJob: (job) => {
    set((state) => {
      const jobsById = { ...state.jobsById, [job.id]: job };

      const jobIds = Object.keys(jobsById);
      if (jobIds.length > MAX_JOBS) {
        const sortedIds = jobIds.sort(
          (a, b) =>
            new Date(jobsById[a]?.startedAt ?? 0).getTime() -
            new Date(jobsById[b]?.startedAt ?? 0).getTime()
        );
        const toRemove = sortedIds.slice(0, jobIds.length - MAX_JOBS);
        for (const id of toRemove) {
          delete jobsById[id];
        }
      }

      if (job.status === "completed" || job.status === "failed") {
        setTimeout(() => {
          get().dismissJob(job.id);
        }, COMPLETED_JOB_TTL_MS);
      }

      return { jobsById, ...computeDerivedState(jobsById, state.dismissedIds) };
    });
  },

  dismissJob: (id) => {
    set((state) => {
      const jobsById = { ...state.jobsById };
      delete jobsById[id];
      const dismissedIds = { ...state.dismissedIds, [id]: true };
      return {
        jobsById,
        dismissedIds,
        ...computeDerivedState(jobsById, dismissedIds),
      };
    });
  },

  clearCompleted: () => {
    set((state) => {
      const jobsById = { ...state.jobsById };
      for (const [id, job] of Object.entries(jobsById)) {
        if (job.status === "completed" || job.status === "failed") {
          delete jobsById[id];
        }
      }
      return { jobsById, ...computeDerivedState(jobsById, state.dismissedIds) };
    });
  },
}));

export const useActiveJobs = () => useJobStore((state) => state.activeJobs);

export const useRunningJobsCount = () =>
  useJobStore((state) => state.runningCount);
