import {
  HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE,
  HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS,
  settingsSlice,
  initialState,
  selectHistoricalRpcLogBatchSize,
  selectHistoricalRpcLogMaxConcurrentRequests,
  selectSafeAppsUseLightBackground,
  selectWalletConnectApiKey,
  selectWalletConnectPairingCode,
} from '../settingsSlice'
import type { SettingsState } from '../settingsSlice'

describe('settingsSlice', () => {
  describe('setRpc', () => {
    it('should set the RPC for the specified chain', () => {
      const state = settingsSlice.reducer(
        initialState,
        settingsSlice.actions.setRpc({ chainId: '1', rpc: 'https://example.com' }),
      )

      expect(state.env.rpc).toEqual({
        ['1']: 'https://example.com',
      })
    })

    it('should delete the RPC for the specified chain', () => {
      const initialState = {
        env: {
          rpc: {
            ['1']: 'https://example.com',
            ['5']: 'https://other-example.com',
          },
        },
      } as unknown as SettingsState

      const state = settingsSlice.reducer(initialState, settingsSlice.actions.setRpc({ chainId: '1', rpc: '' }))

      expect(state.env.rpc).toEqual({
        ['5']: 'https://other-example.com',
      })
    })
  })

  describe('setTenderly', () => {
    it('should set the Tenderly orgname, project name and access token', () => {
      const state = settingsSlice.reducer(
        undefined,
        settingsSlice.actions.setTenderly({ orgName: 'myorg', projectName: 'myproj', accessToken: 'test123' }),
      )

      expect(state.env.tenderly).toEqual({
        orgName: 'myorg',
        projectName: 'myproj',
        accessToken: 'test123',
      })
    })

    it('should delete the Tenderly URL and access token', () => {
      const initialState = {
        env: {
          tenderly: {
            orgName: '',
            projectName: '',
            accessToken: '',
          },
        },
      } as unknown as SettingsState

      const state = settingsSlice.reducer(
        initialState,
        settingsSlice.actions.setTenderly({ orgName: '', projectName: '', accessToken: '' }),
      )

      expect(state.env.tenderly).toEqual({
        orgName: '',
        projectName: '',
        accessToken: '',
      })
    })
  })

  describe('wallet connect settings', () => {
    it('should set wallet connect API key', () => {
      const state = settingsSlice.reducer(initialState, settingsSlice.actions.setWalletConnectApiKey('project-id'))
      expect(state.env.walletConnectApiKey).toBe('project-id')
    })

    it('should set wallet connect pairing code', () => {
      const state = settingsSlice.reducer(initialState, settingsSlice.actions.setWalletConnectPairingCode('wc:abc'))
      expect(state.env.walletConnectPairingCode).toBe('wc:abc')
    })

    it('should select wallet connect API key and pairing code', () => {
      const state = {
        [settingsSlice.name]: {
          ...initialState,
          env: {
            ...initialState.env,
            walletConnectApiKey: 'my-key',
            walletConnectPairingCode: 'wc:pairing',
          },
        },
      } as any

      expect(selectWalletConnectApiKey(state)).toBe('my-key')
      expect(selectWalletConnectPairingCode(state)).toBe('wc:pairing')
    })
  })

  describe('historical rpc log settings', () => {
    it('should set the historical rpc log batch size', () => {
      const state = settingsSlice.reducer(initialState, settingsSlice.actions.setHistoricalRpcLogBatchSize(2500))

      expect(state.env.historicalRpcLogBatchSize).toBe(2500)
    })

    it('should set the historical rpc log max concurrent requests', () => {
      const state = settingsSlice.reducer(
        initialState,
        settingsSlice.actions.setHistoricalRpcLogMaxConcurrentRequests(12),
      )

      expect(state.env.historicalRpcLogMaxConcurrentRequests).toBe(12)
    })

    it('falls back to defaults when persisted values are unusable', () => {
      const state = {
        [settingsSlice.name]: {
          ...initialState,
          env: {
            ...initialState.env,
            historicalRpcLogBatchSize: 0,
            historicalRpcLogMaxConcurrentRequests: -1,
          },
        },
      } as any

      expect(selectHistoricalRpcLogBatchSize(state)).toBe(HISTORICAL_RPC_LOG_BLOCK_BATCH_SIZE)
      expect(selectHistoricalRpcLogMaxConcurrentRequests(state)).toBe(HISTORICAL_RPC_LOG_MAX_CONCURRENT_REQUESTS)
    })

    it('returns large persisted positive integers without clamping', () => {
      const state = {
        [settingsSlice.name]: {
          ...initialState,
          env: {
            ...initialState.env,
            historicalRpcLogBatchSize: 50000,
            historicalRpcLogMaxConcurrentRequests: 99,
          },
        },
      } as any

      expect(selectHistoricalRpcLogBatchSize(state)).toBe(50000)
      expect(selectHistoricalRpcLogMaxConcurrentRequests(state)).toBe(99)
    })
  })

  describe('safe apps appearance settings', () => {
    it('defaults safe apps background to light', () => {
      const state = {
        [settingsSlice.name]: initialState,
      } as any

      expect(selectSafeAppsUseLightBackground(state)).toBe(true)
    })

    it('should set safe apps light background preference', () => {
      const state = settingsSlice.reducer(initialState, settingsSlice.actions.setSafeAppsUseLightBackground(false))

      expect(state.theme.safeAppsUseLightBackground).toBe(false)
    })
  })
})
