export const AppRoutes = {
  '404': '/404',
  _offline: '/_offline',
  index: '/',
  imprint: '/imprint',
  customChain: '/custom-chain',
  addressBook: '/address-book',
  addOwner: '/add-owner',
  apps: {
    open: '/apps/open',
    index: '/apps',
    custom: '/apps/custom',
    bookmarked: '/apps/bookmarked',
  },
  balances: {
    nfts: '/balances/nfts',
    index: '/balances',
  },
  newSafe: {
    load: '/new-safe/load',
    create: '/new-safe/create',
  },
  settings: {
    setup: '/settings/setup',
    securityLogin: '/settings/security-login',
    modules: '/settings/modules',
    index: '/settings',
    environmentVariables: '/settings/environment-variables',
    data: '/settings/data',
    appearance: '/settings/appearance',
  },
  transactions: {
    tx: '/transactions/tx',
    queue: '/transactions/queue',
    messages: '/transactions/messages',
    index: '/transactions',
    history: '/transactions/history',
  },
  welcome: {
    index: '/welcome',
  },
  walletConnect: {
    transaction: '/wallet-connect/transaction',
  },
}
