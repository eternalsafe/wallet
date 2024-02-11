import { useQueuedTxsLength } from '../useTxQueue'
import * as store from '@/store'
import { TransactionListItemType } from '@safe-global/safe-gateway-typescript-sdk'

describe('useQueuedTxsLength', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return an empty string if there are no queued transactions', () => {
    jest.spyOn(store, 'useAppSelector').mockReturnValue({
      data: {
        results: [],
        next: undefined,
      },
    })

    const result = useQueuedTxsLength()
    expect(result).toEqual('')
  })

  it('should return the length of the queue as a string', () => {
    jest.spyOn(store, 'useAppSelector').mockReturnValue({
      data: {
        results: [
          { type: TransactionListItemType.TRANSACTION },
          { type: TransactionListItemType.TRANSACTION },
          { type: TransactionListItemType.TRANSACTION },
        ],
        next: undefined,
      },
    })

    const result = useQueuedTxsLength()
    expect(result).toEqual('3')
  })

  it('should return the length of the queue as a string with a "+" if there are more pages', () => {
    jest.spyOn(store, 'useAppSelector').mockReturnValue({
      data: {
        results: [
          { type: TransactionListItemType.TRANSACTION },
          { type: TransactionListItemType.TRANSACTION },
          { type: TransactionListItemType.TRANSACTION },
        ],
        next: 'next',
      },
    })

    const result = useQueuedTxsLength()
    expect(result).toEqual('3+')
  })
})
