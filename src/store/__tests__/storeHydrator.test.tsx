import { useRef } from 'react'
import { screen, render } from '@/tests/test-utils'
import { useAppSelector } from '@/store'
import { selectTxHistory } from '@/store/txHistorySlice'
import { buildMultisigTxId } from '@/utils/tx-id'
import local from '@/services/local-storage/local'

describe('StoreHydrator', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('hydrates persisted tx history before the first child render', () => {
    const safeAddress = '0x577A0D87f4e6fbdd55d51Ac4a4344EC042C04bb2'
    const txId = buildMultisigTxId(safeAddress, `0x${'b'.repeat(64)}`)
    local.setItem('txHistory', {
      data: {
        [txId]: {
          txId,
          txHash: `0x${'a'.repeat(64)}`,
          safeTxHash: `0x${'b'.repeat(64)}`,
          timestamp: 1_000_000,
          executor: '0x1111111111111111111111111111111111111111',
        },
      },
      loading: false,
    })

    const Probe = () => {
      const txHistory = useAppSelector(selectTxHistory)
      const initialCount = useRef(Object.keys(txHistory.data ?? {}).length)
      return <div data-testid="initial-count">{initialCount.current}</div>
    }

    render(<Probe />)

    expect(screen.getByTestId('initial-count')).toHaveTextContent('1')
  })
})
