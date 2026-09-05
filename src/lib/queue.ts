export type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "paused";

export interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
  backoff?: {
    type: "fixed" | "exponential";
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
  timeout?: number;
  stackTraceLimit?: number;
}

export interface Job<T = unknown> {
  id: string;
  queue: string;
  data: T;
  status: JobStatus;
  progress: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  result?: unknown;
}

export interface QueueEvents {
  completed: (jobId: string, result: unknown) => void;
  failed: (jobId: string, error: Error) => void;
  stalled: (jobId: string) => void;
  progress: (jobId: string, progress: number) => void;
}

type JobProcessor<T = unknown> = (job: Job<T>) => Promise<unknown>;

export class Queue<T = unknown> {
  name: string;
  private jobs = new Map<string, Job<T>>();
  private processors = new Map<string, JobProcessor<T>>();
  private processing = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  private options: Required<JobOptions>;

  constructor(name: string, options: Partial<JobOptions> = {}) {
    this.name = name;
    this.options = {
      priority: options.priority ?? 0,
      delay: options.delay ?? 0,
      attempts: options.attempts ?? 3,
      backoff: options.backoff ?? { type: "exponential", delay: 1000 },
      removeOnComplete: options.removeOnComplete ?? 100,
      removeOnFail: options.removeOnFail ?? 200,
      timeout: options.timeout ?? 30000,
      stackTraceLimit: options.stackTraceLimit ?? 10,
    };
  }

  async add(data: T, options?: Partial<JobOptions>): Promise<Job<T>> {
    const mergedOptions = { ...this.options, ...options };
    const jobId = `${this.name}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

    const job: Job<T> = {
      id: jobId,
      queue: this.name,
      data,
      status: mergedOptions.delay ? "delayed" : "waiting",
      progress: 0,
      attempts: 0,
      maxAttempts: mergedOptions.attempts,
      createdAt: Date.now(),
    };

    this.jobs.set(jobId, job);

    if (!mergedOptions.delay) {
      this.processNext();
    } else {
      setTimeout(() => {
        const j = this.jobs.get(jobId);
        if (j && j.status === "delayed") {
          j.status = "waiting";
          this.processNext();
        }
      }, mergedOptions.delay);
    }

    return job;
  }

  process(processor: JobProcessor<T>): void {
    this.processors.set(this.name, processor);
    this.processing = true;
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (!this.processing) return;

    const processor = this.processors.get(this.name);
    if (!processor) return;

    const waitingJobs = Array.from(this.jobs.values())
      .filter((j) => j.status === "waiting")
      .sort((a, b) => a.createdAt - b.createdAt);

    if (waitingJobs.length === 0) return;

    const job = waitingJobs[0];
    job.status = "active";
    job.processedAt = Date.now();
    job.attempts++;

    try {
      const result = await Promise.race([
        processor(job),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Job timeout")), this.options.timeout)
        ),
      ]);

      job.status = "completed";
      job.completedAt = Date.now();
      job.result = result;

      if (
        this.options.removeOnComplete === true ||
        (typeof this.options.removeOnComplete === "number" &&
          this.jobs.size > this.options.removeOnComplete)
      ) {
        this.jobs.delete(job.id);
      }
    } catch (error) {
      job.status = "failed";
      job.failedAt = Date.now();
      job.error = error instanceof Error ? error.message : String(error);

      if (job.attempts < job.maxAttempts) {
        const backoff = this.options.backoff;
        const delay =
          backoff.type === "exponential"
            ? backoff.delay * Math.pow(2, job.attempts - 1)
            : backoff.delay;

        setTimeout(() => {
          job.status = "waiting";
          job.progress = 0;
          this.processNext();
        }, delay);
      } else {
        if (
          this.options.removeOnFail === true ||
          (typeof this.options.removeOnFail === "number" &&
            this.jobs.size > this.options.removeOnFail)
        ) {
          this.jobs.delete(job.id);
        }
      }
    }
  }

  async getJob(jobId: string): Promise<Job<T> | undefined> {
    return this.jobs.get(jobId);
  }

  async getJobs(status?: JobStatus): Promise<Job<T>[]> {
    return Array.from(this.jobs.values()).filter(
      (j) => !status || j.status === status
    );
  }

  async removeJob(jobId: string): Promise<boolean> {
    return this.jobs.delete(jobId);
  }

  async pause(): Promise<void> {
    this.processing = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async resume(): Promise<void> {
    this.processing = true;
    this.processNext();
  }

  async retryJob(jobId: string): Promise<Job<T> | undefined> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "failed") return undefined;

    job.status = "waiting";
    job.progress = 0;
    job.attempts = 0;
    job.error = undefined;
    this.processNext();
    return job;
  }

  async clean(maxAge: number = 3600000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of this.jobs) {
      const jobAge = now - (job.completedAt ?? job.failedAt ?? job.createdAt);
      if (jobAge > maxAge && (job.status === "completed" || job.status === "failed")) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  stats(): {
    total: number;
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      waiting: jobs.filter((j) => j.status === "waiting").length,
      active: jobs.filter((j) => j.status === "active").length,
      completed: jobs.filter((j) => j.status === "completed").length,
      failed: jobs.filter((j) => j.status === "failed").length,
      delayed: jobs.filter((j) => j.status === "delayed").length,
    };
  }
}

export class QueueManager {
  private queues = new Map<string, Queue>();

  createQueue<T = unknown>(
    name: string,
    options?: Partial<JobOptions>
  ): Queue<T> {
    if (this.queues.has(name)) {
      return this.queues.get(name) as Queue<T>;
    }

    const queue = new Queue<T>(name, options);
    this.queues.set(name, queue);
    return queue;
  }

  getQueue<T = unknown>(name: string): Queue<T> | undefined {
    return this.queues.get(name) as Queue<T> | undefined;
  }

  async removeQueue(name: string): Promise<boolean> {
    const queue = this.queues.get(name);
    if (!queue) return false;

    await queue.pause();
    return this.queues.delete(name);
  }

  listQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  async pauseAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.pause();
    }
  }

  async resumeAll(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.resume();
    }
  }

  stats(): Record<string, ReturnType<Queue["stats"]>> {
    const result: Record<string, ReturnType<Queue["stats"]>> = {};
    for (const [name, queue] of this.queues) {
      result[name] = queue.stats();
    }
    return result;
  }
}

export const queueManager = new QueueManager();

export function createDeviceDataQueue(): Queue {
  return queueManager.createQueue("device-data", {
    attempts: 5,
    backoff: { type: "exponential", delay: 1000 },
    timeout: 10000,
  });
}

export function createAlertQueue(): Queue {
  return queueManager.createQueue("alerts", {
    priority: 1,
    attempts: 3,
    timeout: 15000,
  });
}

export function createReportQueue(): Queue {
  return queueManager.createQueue("reports", {
    attempts: 2,
    timeout: 60000,
  });
}

export function createEmailQueue(): Queue {
  return queueManager.createQueue("emails", {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    timeout: 30000,
  });
}
