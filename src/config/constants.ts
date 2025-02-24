import chains from './chains'

export const IS_PRODUCTION = process.env.NEXT_PUBLIC_IS_PRODUCTION === 'true'
export const IS_DEV = process.env.NODE_ENV === 'development'

// Magic numbers
export const POLLING_INTERVAL = 15_000
export const BASE_TX_GAS = 21_000
export const LS_NAMESPACE = 'ETERNALSAFE__'
export const LATEST_SAFE_VERSION = process.env.NEXT_PUBLIC_SAFE_VERSION || '1.4.1'

// Wallets
export const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || ''
export const TREZOR_APP_URL = 'eternalsafe.eth'
export const TREZOR_EMAIL = 'devanon@eternalsafe.eth'

// Safe Token
export const SAFE_TOKEN_ADDRESSES: { [chainId: string]: string } = {
  [chains.eth]: '0x5aFE3855358E112B5647B952709E6165e1c1eEEe',
}

// Safe Apps tags
export enum SafeAppsTag {
  NFT = 'nft',
  TX_BUILDER = 'transaction-builder',
  DASHBOARD_FEATURED = 'dashboard-widgets',
  SAFE_GOVERNANCE_APP = 'safe-governance-app',
  WALLET_CONNECT = 'wallet-connect',
  ONRAMP = 'onramp',
}

// Help Center
export const HELP_CENTER_URL = 'https://help.safe.global'
export const HelpCenterArticle = {
  ADDRESS_BOOK_DATA: `${HELP_CENTER_URL}/en/articles/40811-address-book-export-and-import`,
  ADVANCED_PARAMS: `${HELP_CENTER_URL}/en/articles/40837-advanced-transaction-parameters`,
  CANCELLING_TRANSACTIONS: `${HELP_CENTER_URL}/en/articles/40836-why-do-i-need-to-pay-for-cancelling-a-transaction`,
  COOKIES: `${HELP_CENTER_URL}/en/articles/40797-why-do-i-need-to-enable-third-party-cookies-for-safe-apps`,
  CONFLICTING_TRANSACTIONS: `${HELP_CENTER_URL}/en/articles/40839-why-are-transactions-with-the-same-nonce-conflicting-with-each-other`,
  FALLBACK_HANDLER: `${HELP_CENTER_URL}/en/articles/40838-what-is-a-fallback-handler-and-how-does-it-relate-to-safe`,
  MOBILE_SAFE: `${HELP_CENTER_URL}/en/articles/40801-connect-to-web-with-mobile-safe`,
  RECOVERY: `${HELP_CENTER_URL}/en/articles/110656-account-recovery-in-safe-wallet`,
  RELAYING: `${HELP_CENTER_URL}/en/articles/59203-what-is-gas-fee-sponsoring`,
  SAFE_SETUP: `${HELP_CENTER_URL}/en/articles/40835-what-safe-setup-should-i-use`,
  SIGNED_MESSAGES: `${HELP_CENTER_URL}/en/articles/40783-what-are-signed-messages`,
  SPAM_TOKENS: `${HELP_CENTER_URL}/en/articles/40784-default-token-list-local-hiding-of-spam-tokens`,
  SPENDING_LIMITS: `${HELP_CENTER_URL}/en/articles/40842-set-up-and-use-spending-limits`,
  TRANSACTION_GUARD: `${HELP_CENTER_URL}/en/articles/40809-what-is-a-transaction-guard`,
  UNEXPECTED_DELEGATE_CALL: `${HELP_CENTER_URL}/en/articles/40794-why-do-i-see-an-unexpected-delegate-call-warning-in-my-transaction`,
  DELEGATES: `${HELP_CENTER_URL}/en/articles/40799-what-is-a-delegate-key`,
  PUSH_NOTIFICATIONS: `${HELP_CENTER_URL}/en/articles/99197-how-to-start-receiving-web-push-notifications-in-the-web-wallet`,
} as const
export const HelperCenterArticleTitles = {
  RECOVERY: 'Learn more about the Account recovery process',
}

export const RECOVERY_FEEDBACK_FORM =
  'https://noteforms.com/forms/safe-feedback-form-hk16ds?notionforms=1&utm_source=notionforms'

// Social
export const DISCORD_URL = 'https://chat.safe.global'
export const TWITTER_URL = 'https://twitter.com/safe'

// Eternal Safe
export const REPO_URL = 'https://github.com/eternalsafe/wallet'
export const REPO_DISCUSSIONS_URL = `${REPO_URL}/discussions/10`
export const REPO_LATEST_RELEASE_URL = `${REPO_URL}/releases/latest`
export const DEFAULT_IPFS_GATEWAY = 'https://cloudflare-ipfs.com'
export const DEFAULT_TOKENLIST_IPNS = 'ipns/tokens.uniswap.org'
export const CHAINLIST_URL = 'https://chainlist.org/'
export const OFFICIAL_APP_URL = 'https://app.safe.global'
