const MULTISIG_TX_PREFIX = 'multisig'

const splitTxId = (txId: string): [string, string, string] | undefined => {
  if (!txId) {
    return
  }

  const parts = txId.split('_')
  if (parts.length !== 3) {
    return
  }

  const [prefix, safeAddress, safeTxHash] = parts
  if (!prefix || !safeAddress || !safeTxHash) {
    return
  }

  return [prefix, safeAddress, safeTxHash]
}

export const normalizeTxId = (txId: string): string => {
  const split = splitTxId(txId)
  if (!split) {
    return txId
  }

  const [prefix, safeAddress, safeTxHash] = split
  if (prefix.toLowerCase() !== MULTISIG_TX_PREFIX) {
    return txId
  }

  return `${MULTISIG_TX_PREFIX}_${safeAddress.toLowerCase()}_${safeTxHash.toLowerCase()}`
}

export const buildMultisigTxId = (safeAddress: string, safeTxHash: string): string => {
  return normalizeTxId(`${MULTISIG_TX_PREFIX}_${safeAddress}_${safeTxHash}`)
}
