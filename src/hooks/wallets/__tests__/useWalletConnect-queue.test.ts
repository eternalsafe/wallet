import { enqueuePendingRequest, removePendingRequest, type SessionRequest } from '@/hooks/wallets/useWalletConnect'

const buildRequest = (id: number, topic: string): SessionRequest => ({
  id,
  topic,
  params: {
    request: {
      method: 'eth_sendTransaction',
      params: [],
    },
    chainId: 'eip155:1',
  },
})

describe('WalletConnect pending request queue', () => {
  it('enqueues unique requests in FIFO order', () => {
    const first = buildRequest(1, 'topic-1')
    const second = buildRequest(2, 'topic-2')

    const queue = enqueuePendingRequest(enqueuePendingRequest([], first), second)

    expect(queue).toEqual([first, second])
  })

  it('does not enqueue duplicate requests', () => {
    const first = buildRequest(1, 'topic-1')

    const queue = enqueuePendingRequest(enqueuePendingRequest([], first), first)

    expect(queue).toEqual([first])
  })

  it('removes only the handled request', () => {
    const first = buildRequest(1, 'topic-1')
    const second = buildRequest(2, 'topic-2')

    const queue = removePendingRequest([first, second], first)

    expect(queue).toEqual([second])
  })
})
