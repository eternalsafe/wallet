import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from '.'
import { makeLoadableSlice } from './common'
import { type ChainInfo, selectCustomChainsAsLoadable } from '@/store/customChainsSlice'

const initialState: ChainInfo[] = []

const { slice, selector } = makeLoadableSlice('chains', initialState)

export const chainsSlice = slice

export const selectChains = createSelector([selector, selectCustomChainsAsLoadable], (chains, customChains) => {
  return {
    loading: false,
    data: [...chains.data, ...customChains.data],
    error: chains.error || customChains.error,
  }
})

export const selectChainById = createSelector(
  [selectChains, (_: RootState, chainId: string) => chainId],
  (chains, chainId) => {
    return chains.data.find((item: ChainInfo) => item.chainId === chainId)
  },
)
