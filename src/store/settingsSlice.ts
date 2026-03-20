import type { PayloadAction } from '@reduxjs/toolkit'
import { createSelector, createSlice } from '@reduxjs/toolkit'
import merge from 'lodash/merge'

import type { RootState } from '@/store'
import { WC_PROJECT_ID } from '@/config/constants'

export type EnvState = {
  tenderly: {
    orgName: string
    projectName: string
    accessToken: string
  }
  rpc: {
    [chainId: string]: string
  }
  ipfs: string
  walletConnectApiKey: string
  walletConnectPairingCode: string
}

export enum TOKEN_LISTS {
  TRUSTED = 'TRUSTED',
  ALL = 'ALL',
}

export type SettingsState = {
  currency: string

  tokenList: TOKEN_LISTS

  shortName: {
    show: boolean
    copy: boolean
    qr: boolean
  }
  theme: {
    darkMode?: boolean
  }
  env: EnvState
  signing: {
    onChainSigning: boolean
  }
  transactionExecution: boolean
}

export const initialState: SettingsState = {
  currency: 'usd',

  tokenList: TOKEN_LISTS.TRUSTED,

  shortName: {
    show: true,
    copy: true,
    qr: true,
  },
  theme: {},
  env: {
    rpc: {},
    tenderly: {
      orgName: '',
      projectName: '',
      accessToken: '',
    },
    ipfs: '',
    walletConnectApiKey: '',
    walletConnectPairingCode: '',
  },
  signing: {
    onChainSigning: false,
  },
  transactionExecution: true,
}

export const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setCurrency: (state, { payload }: PayloadAction<SettingsState['currency']>) => {
      state.currency = payload
    },
    setShowShortName: (state, { payload }: PayloadAction<SettingsState['shortName']['show']>) => {
      state.shortName.show = payload
    },
    setCopyShortName: (state, { payload }: PayloadAction<SettingsState['shortName']['copy']>) => {
      state.shortName.copy = payload
    },
    setQrShortName: (state, { payload }: PayloadAction<SettingsState['shortName']['qr']>) => {
      state.shortName.qr = payload
    },
    setTransactionExecution: (state, { payload }: PayloadAction<SettingsState['transactionExecution']>) => {
      state.transactionExecution = payload
    },
    setDarkMode: (state, { payload }: PayloadAction<SettingsState['theme']['darkMode']>) => {
      state.theme.darkMode = payload
    },
    setTokenList: (state, { payload }: PayloadAction<SettingsState['tokenList']>) => {
      state.tokenList = payload
    },
    setRpc: (state, { payload }: PayloadAction<{ chainId: string; rpc?: string }>) => {
      const { chainId, rpc } = payload
      if (rpc) {
        state.env.rpc[chainId] = rpc
      } else {
        delete state.env.rpc[chainId]
      }
    },
    setIPFS: (state, { payload }: PayloadAction<EnvState['ipfs']>) => {
      state.env.ipfs = payload
    },
    setTenderly: (state, { payload }: PayloadAction<EnvState['tenderly']>) => {
      state.env.tenderly = merge({}, state.env.tenderly, payload)
    },
    setWalletConnectApiKey: (state, { payload }: PayloadAction<EnvState['walletConnectApiKey']>) => {
      state.env.walletConnectApiKey = payload
    },
    setWalletConnectPairingCode: (state, { payload }: PayloadAction<EnvState['walletConnectPairingCode']>) => {
      state.env.walletConnectPairingCode = payload
    },
    setOnChainSigning: (state, { payload }: PayloadAction<boolean>) => {
      state.signing.onChainSigning = payload
    },
    setSettings: (_, { payload }: PayloadAction<SettingsState>) => {
      // We must return as we are overwriting the entire state
      // Preserve default nested settings if importing without
      return merge({}, initialState, payload)
    },
  },
})

export const {
  setCurrency,
  setShowShortName,
  setCopyShortName,
  setQrShortName,
  setDarkMode,
  setTokenList,
  setRpc,
  setIPFS,
  setTenderly,
  setWalletConnectApiKey,
  setWalletConnectPairingCode,
  setOnChainSigning,
  setTransactionExecution,
} = settingsSlice.actions

export const selectSettings = (state: RootState): SettingsState => state[settingsSlice.name]

export const selectCurrency = (state: RootState): SettingsState['currency'] => {
  return state[settingsSlice.name].currency || initialState.currency
}

export const selectTokenList = (state: RootState): SettingsState['tokenList'] => {
  return state[settingsSlice.name].tokenList || initialState.tokenList
}

export const selectRpc = createSelector(selectSettings, (settings) => settings.env.rpc)

export const selectIPFS = createSelector(selectSettings, (settings) => settings.env.ipfs)

export const selectTenderly = createSelector(selectSettings, (settings) => settings.env.tenderly)

export const selectWalletConnectApiKey = createSelector(selectSettings, (settings) => {
  const storedKey = settings.env.walletConnectApiKey
  const envKey = WC_PROJECT_ID || ''
  return storedKey || (envKey.length > 0 ? envKey : '')
})

export const selectWalletConnectPairingCode = createSelector(
  selectSettings,
  (settings) => settings.env.walletConnectPairingCode,
)

export const selectOnChainSigning = createSelector(selectSettings, (settings) => settings.signing.onChainSigning)
