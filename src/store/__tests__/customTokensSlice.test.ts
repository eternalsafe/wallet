import type { TokenInfo } from '@uniswap/token-lists'
import { add, customTokensSlice, removeByChain } from '../customTokensSlice'

describe('customTokensSlice', () => {
  const token1: TokenInfo = {
    chainId: 1,
    address: '0x0000000000000000000000000000000000000001',
    name: 'Token 1',
    symbol: 'TK1',
    decimals: 18,
    logoURI: '',
  }

  const token2: TokenInfo = {
    chainId: 5,
    address: '0x0000000000000000000000000000000000000002',
    name: 'Token 2',
    symbol: 'TK2',
    decimals: 18,
    logoURI: '',
  }

  it('should remove all custom tokens for the target chain only', () => {
    const stateWithTokens = customTokensSlice.reducer(
      customTokensSlice.reducer(undefined, add(['1', token1])),
      add(['5', token2]),
    )

    const state = customTokensSlice.reducer(stateWithTokens, removeByChain('1'))

    expect(state).toEqual({
      '5': [
        {
          ...token2,
          extensions: { custom: true },
        },
      ],
    })
  })
})
