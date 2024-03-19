import { type SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { encodeURI, decode } from 'js-base64'
import { getAndValidateSafeSDK } from './tx-sender/sdk'

export const encodeTransactionMagicLink = (tx: SafeTransaction): string => {
  return encodeURI(JSON.stringify(tx, replacer))
}

export const decodeTransactionMagicLink = (link: string): SafeTransaction | undefined => {
  try {
    return JSON.parse(decode(link), reviver)
  } catch (e) {
    console.error(e)
  }
}

export const transactionKey = async (tx: SafeTransaction): Promise<string> => {
  const safeSDK = getAndValidateSafeSDK()
  return await safeSDK.getTransactionHash(tx)
}

function replacer(_key: string, value: any) {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries()),
    }
  } else {
    return value
  }
}

function reviver(_key: string, value: any) {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value)
    }
  }
  return value
}
