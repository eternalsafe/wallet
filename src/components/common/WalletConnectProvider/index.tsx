import { createContext, useContext, type ReactElement, type ReactNode } from 'react'
import useWalletConnect, { type WalletConnectHook } from '@/hooks/wallets/useWalletConnect'

export const WalletConnectContext = createContext<WalletConnectHook | null>(null)

export const useWalletConnectContext = (): WalletConnectHook => {
  const context = useContext(WalletConnectContext)
  if (!context) {
    throw new Error('useWalletConnectContext must be used within a WalletConnectProvider')
  }
  return context
}

const WalletConnectProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const walletConnect = useWalletConnect()

  return <WalletConnectContext.Provider value={walletConnect}>{children}</WalletConnectContext.Provider>
}

export default WalletConnectProvider
