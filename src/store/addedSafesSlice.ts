import type { listenerMiddlewareInstance } from '.'
import { createSelector, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AddressEx, SafeInfo } from '@safe-global/safe-gateway-typescript-sdk'
import { TokenType } from '@safe-global/safe-gateway-typescript-sdk'
import type { RootState } from '.'
import { selectSafeInfo, safeInfoSlice } from '@/store/safeInfoSlice'
import { balancesSlice } from './balancesSlice'
import { safeFormatUnits } from '@/utils/formatters'
import type { TokenItem } from '@/hooks/loadables/useLoadBalances'

export type AddedSafesOnChain = {
  [safeAddress: string]: {
    owners: AddressEx[]
    threshold: number
    ethBalance?: string
    multisendAddress?: string
    multisendCallOnlyAddress?: string
  }
}

export type AddedSafesState = {
  [chainId: string]: AddedSafesOnChain
}

const initialState: AddedSafesState = {}

const isAddedSafe = (state: AddedSafesState, chainId: string, safeAddress: string) => {
  return !!state[chainId]?.[safeAddress]
}

export const addedSafesSlice = createSlice({
  name: 'addedSafes',
  initialState,
  reducers: {
    migrate: (state, action: PayloadAction<AddedSafesState>) => {
      // Don't migrate if there's data already
      if (Object.keys(state).length > 0) return state
      // Otherwise, migrate
      return action.payload
    },
    setAddedSafes: (_, action: PayloadAction<AddedSafesState>) => {
      return action.payload
    },
    addOrUpdateSafe: (
      state,
      {
        payload,
      }: PayloadAction<{ safe: SafeInfo; metadata?: { multisendAddress?: string; multisendCallOnlyAddress?: string } }>,
    ) => {
      const { chainId, address, owners, threshold } = payload.safe

      state[chainId] ??= {}
      const existingData = state[chainId][address.value] ?? {}
      state[chainId][address.value] = {
        // Keep balance
        ...existingData,
        owners,
        threshold,
      }

      if (payload.metadata) {
        if (payload.metadata.multisendAddress !== undefined) {
          state[chainId][address.value].multisendAddress = payload.metadata.multisendAddress
        }
        if (payload.metadata.multisendCallOnlyAddress !== undefined) {
          state[chainId][address.value].multisendCallOnlyAddress = payload.metadata.multisendCallOnlyAddress
        }
      }
    },
    updateAddedSafeBalance: (
      state,
      { payload }: PayloadAction<{ chainId: string; address: string; balances?: Array<TokenItem> }>,
    ) => {
      const { chainId, address, balances } = payload

      if (!balances || !isAddedSafe(state, chainId, address)) {
        return
      }

      for (const item of balances) {
        if (item.tokenInfo.type !== TokenType.NATIVE_TOKEN) {
          continue
        }

        state[chainId][address].ethBalance = safeFormatUnits(item.balance, item.tokenInfo.decimals)

        return
      }
    },
    removeSafe: (state, { payload }: PayloadAction<{ chainId: string; address: string }>) => {
      const { chainId, address } = payload

      delete state[chainId]?.[address]

      if (Object.keys(state[chainId]).length === 0) {
        delete state[chainId]
      }
    },
    removeAddedSafesByChain: (state, { payload }: PayloadAction<string>) => {
      delete state[payload]
    },
  },
  extraReducers(builder) {
    builder.addCase(safeInfoSlice.actions.set, (state, { payload }) => {
      if (!payload.data) {
        return
      }

      const { chainId, address } = payload.data

      if (isAddedSafe(state, chainId, address.value)) {
        addedSafesSlice.caseReducers.addOrUpdateSafe(state, {
          type: addOrUpdateSafe.type,
          payload: { safe: payload.data },
        })
      }
    })
  },
})

export const { addOrUpdateSafe, updateAddedSafeBalance, removeSafe, removeAddedSafesByChain } = addedSafesSlice.actions

export const selectAllAddedSafes = (state: RootState): AddedSafesState => {
  return state[addedSafesSlice.name]
}

export const selectTotalAdded = (state: RootState): number => {
  return Object.values(state[addedSafesSlice.name])
    .map((item) => Object.keys(item))
    .flat().length
}

export const selectAddedSafes = createSelector(
  [selectAllAddedSafes, (_: RootState, chainId: string) => chainId],
  (allAddedSafes, chainId): AddedSafesOnChain | undefined => {
    return allAddedSafes?.[chainId]
  },
)

export const addedSafesListener = (listenerMiddleware: typeof listenerMiddlewareInstance) => {
  listenerMiddleware.startListening({
    actionCreator: balancesSlice.actions.set,
    effect: (action, listenerApi) => {
      if (!action.payload.data) {
        return
      }

      const safeInfo = selectSafeInfo(listenerApi.getState())

      const chainId = safeInfo.data?.chainId
      const address = safeInfo.data?.address.value

      if (chainId && address) {
        listenerApi.dispatch(updateAddedSafeBalance({ chainId, address, balances: action.payload.data }))
      }
    },
  })
}
