import { DEFAULT_IPFS_GATEWAY, DEFAULT_TOKENLIST_IPNS } from '@/config/constants'

const DEFAULT_TOKEN_LIST_URL = `${DEFAULT_IPFS_GATEWAY}/${DEFAULT_TOKENLIST_IPNS}`
const ALLOWED_PROTOCOLS = new Set(['https:', 'ipfs:'])

export const isValidTokenListSourceUrl = (url: string): boolean => {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol)
  } catch {
    return false
  }
}

export const resolveTokenListUrl = (customUrl: string): string => {
  const value = customUrl.trim()

  if (!value) return DEFAULT_TOKEN_LIST_URL
  if (!isValidTokenListSourceUrl(value)) return DEFAULT_TOKEN_LIST_URL

  const parsedUrl = new URL(value)

  if (parsedUrl.protocol === 'ipfs:') {
    const ipfsPath = value.replace(/^ipfs:\/\//, '').replace(/^\/+/, '')
    return `${DEFAULT_IPFS_GATEWAY}/ipfs/${ipfsPath}`
  }

  const normalizedUrl = value.endsWith('/') ? value.slice(0, -1) : value
  const hasTokenListPath = /\/(ipfs|ipns)\//.test(parsedUrl.pathname) || parsedUrl.pathname.endsWith('.json')

  return hasTokenListPath ? normalizedUrl : `${normalizedUrl}/${DEFAULT_TOKENLIST_IPNS}`
}
