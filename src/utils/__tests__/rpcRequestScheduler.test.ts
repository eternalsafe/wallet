import { getRpcSchedulerMetrics, scheduleRpcRequest, setRpcSchedulerMaxConcurrency } from '@/utils/rpcRequestScheduler'

describe('rpcRequestScheduler', () => {
  beforeEach(() => {
    setRpcSchedulerMaxConcurrency(10)
  })

  it('defaults to max concurrency 10', () => {
    expect(getRpcSchedulerMetrics().maxConcurrentRequests).toBe(10)
  })

  it('updates max concurrency when configured', async () => {
    setRpcSchedulerMaxConcurrency(4)
    expect(getRpcSchedulerMetrics().maxConcurrentRequests).toBe(4)

    const result = await scheduleRpcRequest(async () => 'ok')
    expect(result).toBe('ok')
  })
})
