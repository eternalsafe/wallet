import { useEffect, useState, useCallback, useRef } from 'react'
import { Core } from '@walletconnect/core'
import { WalletKit } from '@reown/walletkit'
import type { SessionTypes } from '@walletconnect/types'
import { getSdkError } from '@walletconnect/utils'
import { useAppSelector } from '@/store'
import { selectWalletConnectApiKey, selectWalletConnectPairingCode } from '@/store/settingsSlice'
import useWallet from './useWallet'
import useSafeInfo from '@/hooks/useSafeInfo'
import useChainId from '../useChainId'

export type SessionProposal = {
  id: number
  params: {
    id: number
    pairingTopic: string
    proposer: {
      publicKey: string
      metadata: {
        name: string
        description: string
        url: string
        icons: string[]
      }
    }
    requiredNamespaces: Record<
      string,
      {
        chains?: string[]
        methods: string[]
        events: string[]
      }
    >
    optionalNamespaces?: Record<
      string,
      {
        chains?: string[]
        methods: string[]
        events: string[]
      }
    >
  }
}

export type WalletConnectNamespace = {
  methods: string[]
  events: string[]
  accounts: string[]
}

export type WalletConnectNamespaces = Record<string, WalletConnectNamespace>
type WalletKitInstance = Awaited<ReturnType<typeof WalletKit.init>>

export type SessionRequest = {
  id: number
  topic: string
  params: {
    request: {
      method: string
      params: unknown[]
    }
    chainId: string
  }
}
export type SessionEvent = {
  topic: string
  event: {
    name: string
    data: unknown
  }
  chainId: string
}

export type WalletConnectHook = {
  isInitialized: boolean
  isInitializing: boolean
  sessions: SessionTypes.Struct[]
  pendingProposal: SessionProposal | null
  pendingRequest: SessionRequest | null
  error: Error | null
  pair: (uri: string) => Promise<void>
  approveSession: (namespaces: WalletConnectNamespaces) => Promise<SessionTypes.Struct>
  rejectSession: () => Promise<void>
  approveRequest: (result: unknown) => Promise<void>
  rejectRequest: (reason?: string) => Promise<void>
  disconnectSession: (topic: string) => Promise<void>
  updateSession: (topic: string, namespaces: WalletConnectNamespaces) => Promise<void>
}

const useWalletConnect = (): WalletConnectHook => {
  const wallet = useWallet()
  const projectId = useAppSelector(selectWalletConnectApiKey)
  const pairingCode = useAppSelector(selectWalletConnectPairingCode)
  const { safeAddress } = useSafeInfo()
  const chainId = useChainId()

  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [sessions, setSessions] = useState<SessionTypes.Struct[]>([])
  const [pendingProposal, setPendingProposal] = useState<SessionProposal | null>(null)
  const [pendingRequests, setPendingRequests] = useState<SessionRequest[]>([])
  const [error, setError] = useState<Error | null>(null)
  const pendingRequest = pendingRequests[0] ?? null

  const pendingProposalRef = useRef<SessionProposal | null>(null)
  const pendingRequestRef = useRef<SessionRequest | null>(null)
  const walletKitRef = useRef<WalletKitInstance | null>(null)

  useEffect(() => {
    pendingProposalRef.current = pendingProposal
    pendingRequestRef.current = pendingRequest
  }, [pendingProposal, pendingRequest])

  // Set up event listeners for WalletKit
  const setupEventListeners = useCallback((walletKit: WalletKitInstance) => {
    const on = walletKit.on as (event: string, listener: (...args: any[]) => void) => void

    // Session proposal event
    on('session_proposal', (proposal: unknown) => {
      if (!proposal) return
      setPendingProposal(proposal as SessionProposal)
    })

    // Session request event
    on('session_request', (request: unknown) => {
      if (!request) return
      const nextRequest = request as SessionRequest
      setPendingRequests((prev) => {
        const isDuplicate = prev.some((item) => item.id === nextRequest.id && item.topic === nextRequest.topic)
        return isDuplicate ? prev : [...prev, nextRequest]
      })
    })

    // Session delete event
    on('session_delete', ({ topic }: { topic: string }) => {
      setSessions((prev) => prev.filter((session) => session.topic !== topic))
      setPendingRequests((prev) => prev.filter((request) => request.topic !== topic))
    })

    // Session update event
    on('session_update', ({ topic, params }: { topic: string; params: { namespaces: WalletConnectNamespaces } }) => {
      setSessions((prev) => {
        const updatedSessions = [...prev]
        const sessionIndex = updatedSessions.findIndex((session) => session.topic === topic)
        if (sessionIndex !== -1) {
          updatedSessions[sessionIndex] = {
            ...updatedSessions[sessionIndex],
            namespaces: params.namespaces,
          }
        }
        return updatedSessions
      })
    })

    // Session event
    on('session_event', () => undefined)
  }, [])

  useEffect(() => {
    const initWalletKit = async () => {
      if (!projectId || isInitialized || isInitializing || !wallet) {
        return
      }
      if (walletKitRef.current) {
        setIsInitialized(true)
        return
      }

      try {
        setIsInitializing(true)
        setError(null)

        const core = new Core({
          projectId,
        })

        try {
          walletKitRef.current = await WalletKit.init({
            core,
            metadata: {
              name: 'Eternal Safe Wallet',
              description: 'Eternal Safe Wallet for Web3',
              url: window.location.origin,
              icons: [`${window.location.origin}/favicon.ico`],
            },
          })
        } catch (initError) {
          console.error('Error creating WalletKit instance:', initError)
          throw initError
        }

        // Set up event listeners
        try {
          setupEventListeners(walletKitRef.current)
        } catch (listenerError) {
          console.error('Error setting up event listeners:', listenerError)
          // Continue even if event listeners fail
        }

        // Get active sessions
        try {
          const activeSessions = walletKitRef.current.getActiveSessions()
          setSessions(Object.values(activeSessions))
        } catch (sessionsError) {
          console.error('Error getting active sessions:', sessionsError)
          // Continue even if getting sessions fails
        }

        // Try to pair with existing code if available
        if (pairingCode) {
          try {
            await walletKitRef.current.pair({ uri: pairingCode })
          } catch (pairError) {
            console.warn('Failed to pair with saved code:', pairError)
            // Continue even if pairing fails
          }
        }

        setIsInitialized(true)
      } catch (e) {
        console.error('Failed to initialize WalletKit:', e)
        setError(e instanceof Error ? e : new Error('Failed to initialize WalletKit'))
      } finally {
        setIsInitializing(false)
      }
    }

    initWalletKit()
  }, [projectId, isInitialized, isInitializing, wallet, pairingCode, setupEventListeners])

  // Pair with a dApp
  const pair = useCallback(
    async (uri: string) => {
      const walletKit = walletKitRef.current
      if (!walletKit || !isInitialized) {
        throw new Error('WalletKit not initialized')
      }

      try {
        await walletKit.pair({ uri })
      } catch (e) {
        console.error('Failed to pair:', e)
        setError(e instanceof Error ? e : new Error('Failed to pair'))
        throw e
      }
    },
    [isInitialized],
  )

  // Approve a session proposal
  const approveSession = useCallback(
    async (namespaces: WalletConnectNamespaces) => {
      const walletKit = walletKitRef.current
      if (!walletKit || !isInitialized) {
        throw new Error('WalletKit not initialized')
      }

      if (!pendingProposalRef.current) {
        throw new Error('No pending session proposal')
      }

      try {
        // If no namespaces are provided, build them using the utility
        let approvedNamespaces = namespaces

        if (Object.keys(namespaces).length === 0) {
          // Create a custom namespaces object directly
          approvedNamespaces = {
            eip155: {
              methods: ['eth_sendTransaction', 'personal_sign'],
              events: ['accountsChanged', 'chainChanged'],
              accounts: [`eip155:${chainId}:${safeAddress}`],
            },
          }
        }

        // Approve the session with the built namespaces
        const session = await walletKit.approveSession({
          id: pendingProposalRef.current.id,
          namespaces: approvedNamespaces,
        })

        setSessions((prev) => [...prev, session])
        setPendingProposal(null)

        return session
      } catch (error) {
        console.error('Failed to approve session:', error)
        setError(error instanceof Error ? error : new Error('Failed to approve session'))

        // Reject the session on error
        await walletKit.rejectSession({
          id: pendingProposalRef.current.id,
          reason: getSdkError('USER_REJECTED'),
        })

        throw error
      }
    },
    [isInitialized, safeAddress, chainId],
  )

  // Reject a session proposal
  const rejectSession = useCallback(async () => {
    const walletKit = walletKitRef.current
    if (!walletKit || !isInitialized) {
      throw new Error('WalletKit not initialized')
    }

    if (!pendingProposalRef.current) {
      throw new Error('No pending session proposal')
    }

    try {
      await walletKit.rejectSession({
        id: pendingProposalRef.current.id,
        reason: getSdkError('USER_REJECTED'),
      })

      setPendingProposal(null)
    } catch (e) {
      console.error('Failed to reject session:', e)
      setError(e instanceof Error ? e : new Error('Failed to reject session'))
      throw e
    }
  }, [isInitialized])

  // Approve a session request
  const approveRequest = useCallback(
    async (result: unknown) => {
      const walletKit = walletKitRef.current
      if (!walletKit || !isInitialized) {
        throw new Error('WalletKit not initialized')
      }

      if (!pendingRequestRef.current) {
        throw new Error('No pending session request')
      }

      try {
        const { topic, id } = pendingRequestRef.current

        await walletKit.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: '2.0',
            result,
          },
        })

        setPendingRequests((prev) => prev.filter((request) => !(request.topic === topic && request.id === id)))
      } catch (e) {
        console.error('Failed to approve request:', e)
        setError(e instanceof Error ? e : new Error('Failed to approve request'))
        throw e
      }
    },
    [isInitialized],
  )

  // Reject a session request
  const rejectRequest = useCallback(
    async (reason = 'User rejected request') => {
      const walletKit = walletKitRef.current
      if (!walletKit || !isInitialized) {
        throw new Error('WalletKit not initialized')
      }

      if (!pendingRequestRef.current) {
        throw new Error('No pending session request')
      }

      try {
        const { topic, id } = pendingRequestRef.current

        await walletKit.respondSessionRequest({
          topic,
          response: {
            id,
            jsonrpc: '2.0',
            error: {
              code: 4001,
              message: reason,
            },
          },
        })

        setPendingRequests((prev) => prev.filter((request) => !(request.topic === topic && request.id === id)))
      } catch (e) {
        console.error('Failed to reject request:', e)
        setError(e instanceof Error ? e : new Error('Failed to reject request'))
        throw e
      }
    },
    [isInitialized],
  )

  // Disconnect a session
  const disconnectSession = useCallback(
    async (topic: string) => {
      const walletKit = walletKitRef.current
      if (!walletKit || !isInitialized) {
        throw new Error('WalletKit not initialized')
      }

      try {
        await walletKit.disconnectSession({
          topic,
          reason: getSdkError('USER_DISCONNECTED'),
        })

        setSessions((prev) => prev.filter((session) => session.topic !== topic))
      } catch (e) {
        console.error('Failed to disconnect session:', e)
        setError(e instanceof Error ? e : new Error('Failed to disconnect session'))
        throw e
      }
    },
    [isInitialized],
  )

  // Update a session
  const updateSession = useCallback(
    async (topic: string, namespaces: WalletConnectNamespaces) => {
      const walletKit = walletKitRef.current
      if (!walletKit || !isInitialized) {
        throw new Error('WalletKit not initialized')
      }

      try {
        await walletKit.updateSession({
          topic,
          namespaces,
        })

        setSessions((prev) => {
          const updatedSessions = [...prev]
          const sessionIndex = updatedSessions.findIndex((session) => session.topic === topic)
          if (sessionIndex !== -1) {
            updatedSessions[sessionIndex] = {
              ...updatedSessions[sessionIndex],
              namespaces,
            }
          }
          return updatedSessions
        })
      } catch (e) {
        console.error('Failed to update session:', e)
        setError(e instanceof Error ? e : new Error('Failed to update session'))
        throw e
      }
    },
    [isInitialized],
  )

  return {
    isInitialized,
    isInitializing,
    sessions,
    pendingProposal,
    pendingRequest,
    error,
    pair,
    approveSession,
    rejectSession,
    approveRequest,
    rejectRequest,
    disconnectSession,
    updateSession,
  }
}

export default useWalletConnect
