import chains from './chains'

export const IS_PRODUCTION = process.env.NEXT_PUBLIC_IS_PRODUCTION === 'true'
export const IS_DEV = process.env.NODE_ENV === 'development'

export const GATEWAY_URL_PRODUCTION =
  process.env.NEXT_PUBLIC_GATEWAY_URL_PRODUCTION || 'https://safe-client.safe.global'
export const GATEWAY_URL_STAGING = process.env.NEXT_PUBLIC_GATEWAY_URL_STAGING || 'https://safe-client.staging.5afe.dev'

// Magic numbers
export const POLLING_INTERVAL = 15_000
export const BASE_TX_GAS = 21_000
export const LS_NAMESPACE = 'SAFE_v2__'
export const LATEST_SAFE_VERSION = process.env.NEXT_PUBLIC_SAFE_VERSION || '1.3.0'

// Access keys
export const INFURA_TOKEN = process.env.NEXT_PUBLIC_INFURA_TOKEN || ''
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''
export const BEAMER_ID = process.env.NEXT_PUBLIC_BEAMER_ID || ''

// Wallets
export const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID || ''
export const TREZOR_APP_URL = 'app.safe.global'
export const TREZOR_EMAIL = 'support@safe.global'

// Safe Token
export const SAFE_TOKEN_ADDRESSES: { [chainId: string]: string } = {
  [chains.eth]: '0x5aFE3855358E112B5647B952709E6165e1c1eEEe',
}

// Safe Apps
export const SAFE_APPS_INFURA_TOKEN = process.env.NEXT_PUBLIC_SAFE_APPS_INFURA_TOKEN || INFURA_TOKEN
export const SAFE_APPS_THIRD_PARTY_COOKIES_CHECK_URL = 'https://third-party-cookies-check.gnosis-safe.com'
export const SAFE_APPS_DEMO_SAFE_MAINNET = 'eth:0xfF501B324DC6d78dC9F983f140B9211c3EdB4dc7'
export const SAFE_APPS_SDK_DOCS_URL = 'https://docs.safe.global/safe-core-aa-sdk/safe-apps'

// Tenderly - API docs: https://www.notion.so/Simulate-API-Documentation-6f7009fe6d1a48c999ffeb7941efc104
export const TENDERLY_SIMULATE_ENDPOINT_URL = process.env.NEXT_PUBLIC_TENDERLY_SIMULATE_ENDPOINT_URL || ''
export const TENDERLY_PROJECT_NAME = process.env.NEXT_PUBLIC_TENDERLY_PROJECT_NAME || ''
export const TENDERLY_ORG_NAME = process.env.NEXT_PUBLIC_TENDERLY_ORG_NAME || ''

// Safe Apps tags
export enum SafeAppsTag {
  NFT = 'nft',
  TX_BUILDER = 'transaction-builder',
  DASHBOARD_FEATURED = 'dashboard-widgets',
  SAFE_GOVERNANCE_APP = 'safe-governance-app',
  WALLET_CONNECT = 'wallet-connect',
  ONRAMP = 'onramp',
}

// Safe Gelato relay service
export const SAFE_RELAY_SERVICE_URL_PRODUCTION =
  process.env.NEXT_PUBLIC_SAFE_RELAY_SERVICE_URL_PRODUCTION || 'https://safe-client.safe.global/v1/relay'
export const SAFE_RELAY_SERVICE_URL_STAGING =
  process.env.NEXT_PUBLIC_SAFE_RELAY_SERVICE_URL_STAGING || 'https://safe-client.staging.5afe.dev/v1/relay'

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

// Legal
export const IS_OFFICIAL_HOST = process.env.NEXT_PUBLIC_IS_OFFICIAL_HOST === 'true'

// Risk mitigation (Redefine)
export const REDEFINE_SIMULATION_URL = 'https://dashboard.redefine.net/reports/'
export const REDEFINE_API = process.env.NEXT_PUBLIC_REDEFINE_API
export const REDEFINE_ARTICLE = 'https://safe.mirror.xyz/rInLWZwD_sf7enjoFerj6FIzCYmVMGrrV8Nhg4THdwI'

// Eternal Safe
export const REPO_URL = 'https://github.com/devanoneth/eternal-safe'
export const DEFAULT_IPFS_GATEWAY = 'https://cloudflare-ipfs.com'
export const DEFAULT_TOKENLIST_IPNS = 'ipns/tokens.uniswap.org'
export const DEFAULT_TOKENLIST_INFO =
  'https://tokenlists.org/token-list?url=https://gateway.ipfs.io/ipns/tokens.uniswap.org'
