import useLoadChains from '@/hooks/loadables/useLoadChains'
import { act, renderHook } from '@/tests/test-utils'

// Jest tests for the useLoadChains hook
describe('useLoadChains hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  it('should fetch the chains when the hook is called', async () => {
    // Render the hook and check that the loading state is true
    const { result } = renderHook(() => useLoadChains())

    await act(async () => {
      jest.advanceTimersByTime(10)
    })

    var [data, error, loading] = result.current

    // The loading state will be false because useLoadChains resolves the promise immediately
    expect(loading).toBe(false)
    expect(error).toBe(undefined)
    expect(data).toBeDefined()
  })
})
