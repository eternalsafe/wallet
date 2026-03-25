import { act, renderHook } from '@/tests/test-utils'
import useSafeInfo from '@/hooks/useSafeInfo'
import useOnboard from '@/hooks/wallets/useOnboard'
import useSyncSafeMessageSigner from '../useSyncSafeMessageSigner'
import { dispatchPreparedSignature } from '@/services/safe-messages/safeMsgNotifications'
import { dispatchSafeMsgProposal, dispatchSafeMsgConfirmation } from '@/services/safe-messages/safeMsgSender'

jest.mock('@/hooks/useSafeInfo')
jest.mock('@/hooks/wallets/useOnboard')
jest.mock('@/services/safe-messages/safeMsgNotifications', () => ({
  dispatchPreparedSignature: jest.fn(),
}))
jest.mock('@/services/safe-messages/safeMsgSender', () => ({
  dispatchSafeMsgProposal: jest.fn(),
  dispatchSafeMsgConfirmation: jest.fn(),
}))

const mockedUseSafeInfo = useSafeInfo as jest.MockedFunction<typeof useSafeInfo>
const mockedUseOnboard = useOnboard as jest.MockedFunction<typeof useOnboard>
const mockedDispatchPreparedSignature = dispatchPreparedSignature as jest.MockedFunction<typeof dispatchPreparedSignature>
const mockedDispatchSafeMsgProposal = dispatchSafeMsgProposal as jest.MockedFunction<typeof dispatchSafeMsgProposal>
const mockedDispatchSafeMsgConfirmation = dispatchSafeMsgConfirmation as jest.MockedFunction<typeof dispatchSafeMsgConfirmation>

describe('useSyncSafeMessageSigner', () => {
  const safe = {
    chainId: '1',
    threshold: 1,
    address: { value: '0x0000000000000000000000000000000000000123' },
  } as any
  const onboard = {} as any
  const decodedMessage = '0xdeadbeef'
  const safeMessageHash = '0xhash'
  const safeAppId = 42

  beforeEach(() => {
    jest.clearAllMocks()
    mockedUseSafeInfo.mockReturnValue({ safe } as any)
    mockedUseOnboard.mockReturnValue(onboard)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('proposes a new message without immediately dispatching a prepared signature', async () => {
    jest.useFakeTimers()
    mockedDispatchSafeMsgProposal.mockResolvedValue(undefined)
    const onClose = jest.fn()

    const { result } = renderHook(() =>
      useSyncSafeMessageSigner(undefined, decodedMessage, safeMessageHash, 'request-id', safeAppId, onClose),
    )

    await act(async () => {
      await result.current.onSign()
    })

    expect(mockedDispatchSafeMsgProposal).toHaveBeenCalledWith({
      onboard,
      safe,
      message: decodedMessage,
      safeAppId,
    })

    jest.runOnlyPendingTimers()

    expect(mockedDispatchPreparedSignature).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('confirms an existing message and closes immediately when no request id is provided', async () => {
    const onClose = jest.fn()
    const message = {} as any
    mockedDispatchSafeMsgConfirmation.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useSyncSafeMessageSigner(message, decodedMessage, safeMessageHash, undefined, safeAppId, onClose),
    )

    await act(async () => {
      await result.current.onSign()
    })

    expect(mockedDispatchSafeMsgConfirmation).toHaveBeenCalledWith({
      onboard,
      safe,
      message: decodedMessage,
    })
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mockedDispatchPreparedSignature).not.toHaveBeenCalled()
  })

  it('confirms an existing message without closing immediately when request id is present', async () => {
    const onClose = jest.fn()
    const message = {} as any
    mockedDispatchSafeMsgConfirmation.mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useSyncSafeMessageSigner(message, decodedMessage, safeMessageHash, 'request-id', safeAppId, onClose),
    )

    await act(async () => {
      await result.current.onSign()
    })

    expect(mockedDispatchSafeMsgConfirmation).toHaveBeenCalledWith({
      onboard,
      safe,
      message: decodedMessage,
    })
    expect(onClose).not.toHaveBeenCalled()
    expect(mockedDispatchPreparedSignature).not.toHaveBeenCalled()
  })

  it('dispatches the prepared signature when the message gets a prepared signature', () => {
    jest.useFakeTimers()
    const onClose = jest.fn()
    const message = { preparedSignature: '0xsig' } as any

    renderHook(() => useSyncSafeMessageSigner(message, decodedMessage, safeMessageHash, 'request-id', safeAppId, onClose))

    jest.advanceTimersByTime(3000)

    expect(mockedDispatchPreparedSignature).toHaveBeenCalledWith(message, safeMessageHash, onClose, 'request-id')
  })

  it('sets submitError when signing fails', async () => {
    const onClose = jest.fn()
    const error = new Error('Failed to sign')
    mockedDispatchSafeMsgProposal.mockRejectedValue(error)

    const { result } = renderHook(() =>
      useSyncSafeMessageSigner(undefined, decodedMessage, safeMessageHash, 'request-id', safeAppId, onClose),
    )

    await act(async () => {
      await result.current.onSign()
    })

    expect(result.current.submitError).toEqual(error)
  })

  it('returns early when no wallet is connected', async () => {
    mockedUseOnboard.mockReturnValue(undefined)
    const onClose = jest.fn()

    const { result } = renderHook(() =>
      useSyncSafeMessageSigner(undefined, decodedMessage, safeMessageHash, 'request-id', safeAppId, onClose),
    )

    await act(async () => {
      await result.current.onSign()
    })

    expect(mockedDispatchSafeMsgProposal).not.toHaveBeenCalled()
    expect(mockedDispatchSafeMsgConfirmation).not.toHaveBeenCalled()
  })
})
