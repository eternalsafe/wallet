type NamespaceRequirement = {
  chains?: string[]
  methods: string[]
  events: string[]
}

export type ApprovedNamespaces = Record<
  string,
  {
    accounts: string[]
    methods: string[]
    events: string[]
  }
>

export const buildApprovedNamespaces = (
  requiredNamespaces: Record<string, NamespaceRequirement>,
  safeAddress: string,
): ApprovedNamespaces => {
  if (!safeAddress) {
    throw new Error('No Safe address available for WalletConnect session approval')
  }

  return Object.entries(requiredNamespaces).reduce<ApprovedNamespaces>((acc, [key, value]) => {
    const chains = value.chains || []
    acc[key] = {
      accounts: chains.map((chain) => `${chain}:${safeAddress}`),
      methods: value.methods,
      events: value.events,
    }
    return acc
  }, {})
}
