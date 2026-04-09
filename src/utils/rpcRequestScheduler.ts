type QueueTask = {
  request: () => Promise<unknown>
  resolve: (value: unknown) => void
  reject: (error: unknown) => void
}

let maxConcurrentRequests = 10
let activeRequests = 0
const queue: QueueTask[] = []

const processQueue = (): void => {
  while (activeRequests < maxConcurrentRequests && queue.length > 0) {
    const task = queue.shift()
    if (!task) {
      break
    }

    activeRequests += 1
    task
      .request()
      .then(task.resolve)
      .catch(task.reject)
      .finally(() => {
        activeRequests -= 1
        processQueue()
      })
  }
}

export const setRpcSchedulerMaxConcurrency = (value: number): void => {
  const parsedValue = Number(value)
  maxConcurrentRequests =
    Number.isFinite(parsedValue) && parsedValue > 0 ? Math.max(1, Math.floor(parsedValue)) : maxConcurrentRequests
  processQueue()
}

export const scheduleRpcRequest = async <T>(request: () => Promise<T>): Promise<T> => {
  return await new Promise<T>((resolve, reject) => {
    queue.push({
      request: async () => request(),
      resolve: (value: unknown) => resolve(value as T),
      reject,
    })
    processQueue()
  })
}

export const getRpcSchedulerMetrics = (): {
  queuedRequests: number
  activeRequests: number
  maxConcurrentRequests: number
} => {
  return {
    queuedRequests: queue.length,
    activeRequests,
    maxConcurrentRequests,
  }
}
