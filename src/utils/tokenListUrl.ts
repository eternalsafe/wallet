const HTTPS_URL_REGEX = /^https:\/\//i
const IPFS_PROTOCOL_REGEX = /^ipfs:\/\//i
const IPNS_PROTOCOL_REGEX = /^ipns:\/\//i
const IPFS_PATH_REGEX = /^\/?ipfs\//i
const IPNS_PATH_REGEX = /^\/?ipns\//i

const trimTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')
const trimLeadingSlashes = (value: string): string => value.replace(/^\/+/, '')

const normalizePath = (path: string): string => trimLeadingSlashes(path).replace(/^\/+/, '')

const trimProtocolPathPrefix = (path: string, prefix: 'ipfs' | 'ipns'): string => {
  const normalizedPath = normalizePath(path)
  const prefixedRegex = new RegExp(`^${prefix}\\/`, 'i')
  return normalizedPath.replace(prefixedRegex, '')
}

export const isSupportedCustomTokenListUrl = (tokenListUrl: string): boolean => {
  const value = tokenListUrl.trim()
  if (!value) return false

  return HTTPS_URL_REGEX.test(value) || IPFS_PROTOCOL_REGEX.test(value)
}

export const resolveTokenListUrl = (tokenListUrl: string, ipfsGateway: string): string | undefined => {
  const value = tokenListUrl.trim()
  if (!value) return

  if (HTTPS_URL_REGEX.test(value)) {
    return value
  }

  const gateway = trimTrailingSlashes(ipfsGateway.trim())
  if (!gateway) return

  if (IPFS_PROTOCOL_REGEX.test(value)) {
    const path = trimProtocolPathPrefix(value.replace(IPFS_PROTOCOL_REGEX, ''), 'ipfs')
    return path ? `${gateway}/ipfs/${path}` : undefined
  }

  if (IPNS_PROTOCOL_REGEX.test(value)) {
    const path = trimProtocolPathPrefix(value.replace(IPNS_PROTOCOL_REGEX, ''), 'ipns')
    return path ? `${gateway}/ipns/${path}` : undefined
  }

  if (IPFS_PATH_REGEX.test(value)) {
    return `${gateway}/${normalizePath(value)}`
  }

  if (IPNS_PATH_REGEX.test(value)) {
    return `${gateway}/${normalizePath(value)}`
  }
}
