import { type SafeTransaction } from '@safe-global/safe-core-sdk-types'
import { type DecodedDataResponse, getDecodedData } from '@safe-global/safe-gateway-typescript-sdk'
import { getNativeTransferData } from '@/services/tx/tokenTransferParams'
import { isEmptyHexData } from '@/utils/hex'
import type { AsyncResult } from './useAsync'
import useAsync from './useAsync'
import useChainId from './useChainId'
import { getFunctionSignature } from '@/utils/hash-lookup'
import { ethers } from 'ethers'
import { useCallback, useEffect, useState } from 'react'

// Helper function to decode transaction data using ethers
const decodeWithEthers = async (
  encodedData: string,
  functionSignature: string,
): Promise<[string, ethers.utils.Result | null, string[]]> => {
  try {
    // Create an interface with the function signature
    const iface = new ethers.utils.Interface([`function ${functionSignature}`])

    // Extract parameter types from the function signature
    const paramTypes = functionSignature
      .split('(')[1]
      .split(')')[0]
      .split(',')
      .map((type) => type.trim())
      .filter((type) => type !== '')

    // Decode the transaction data
    const decoded = iface.decodeFunctionData(functionSignature.split('(')[0], encodedData)
    return [functionSignature, decoded, paramTypes]
  } catch (error) {
    console.error('Error decoding function data:', error)
    return [functionSignature, null, []]
  }
}

// Helper function to convert decoded parameters to DecodedDataResponse format
const formatDecodedParams = (
  methodName: string,
  params: ethers.utils.Result | null,
  paramTypes: string[] = [],
): DecodedDataResponse => {
  return {
    method: methodName,
    parameters: params
      ? Array.isArray(params)
        ? params.map((param, i) => ({
            name: `param${i}`,
            type: i < paramTypes.length ? paramTypes[i] : 'unknown',
            value: param?.toString() || '',
          }))
        : Object.entries(params).map(([key, value], i) => ({
            name: key,
            // Use the parameter type if available, otherwise use the JavaScript type
            type: i < paramTypes.length ? paramTypes[i] : 'unknown',
            value: value?.toString() || '',
          }))
      : [],
  }
}

const useDecodeTx = (tx?: SafeTransaction, useRemoteApi: boolean = false): AsyncResult<DecodedDataResponse> => {
  const chainId = useChainId()
  const encodedData = tx?.data.data
  const isEmptyData = !!encodedData && isEmptyHexData(encodedData)
  const isRejection = isEmptyData && tx?.data.value === '0'
  const nativeTransfer = isEmptyData && !isRejection ? getNativeTransferData(tx?.data) : undefined

  // State for local decoding
  const [localDecodedData, setLocalDecodedData] = useState<DecodedDataResponse | undefined>(undefined)
  const [localError, setLocalError] = useState<Error | undefined>(undefined)
  const [localLoading, setLocalLoading] = useState<boolean>(false)

  // Remote API decoding
  const asyncCallback = useCallback(() => {
    if (!useRemoteApi || !encodedData || isEmptyData) {
      return undefined
    }

    return getDecodedData(chainId, encodedData, tx!.data.to)
  }, [useRemoteApi, encodedData, isEmptyData, chainId, tx])

  const [remoteData, remoteError, remoteLoading] = useAsync<DecodedDataResponse>(asyncCallback, [asyncCallback])

  // Local decoding using hash-lookup and ethers
  useEffect(() => {
    let cancelled = false

    if (!useRemoteApi && encodedData && !isEmptyData) {
      const decodeLocally = async () => {
        setLocalLoading(true)
        setLocalError(undefined)
        try {
          // Extract the function selector (first 4 bytes)
          const functionSelector = encodedData.slice(0, 10) // 0x + 8 chars (4 bytes)

          // Use hash-lookup to get the function signature
          const functionSignature = await getFunctionSignature(functionSelector)

          if (cancelled) return

          if (functionSignature) {
            // Decode with ethers
            const [signature, decoded, paramTypes] = await decodeWithEthers(encodedData, functionSignature)
            const methodName = signature.split('(')[0]
            setLocalDecodedData(formatDecodedParams(methodName, decoded, paramTypes))
          } else {
            // No local signature match: leave decoded data undefined so raw calldata is displayed
            setLocalDecodedData(undefined)
          }

          if (cancelled) return
          setLocalLoading(false)
        } catch (error) {
          if (cancelled) return
          console.error('Error in transaction decoding:', error)
          setLocalError(error instanceof Error ? error : new Error(String(error)))
          setLocalLoading(false)
        }
      }

      decodeLocally()
    } else if (!useRemoteApi) {
      setLocalDecodedData(nativeTransfer)
      setLocalLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [useRemoteApi, encodedData, isEmptyData, nativeTransfer])

  // Return appropriate data based on useRemoteApi flag
  if (useRemoteApi) {
    return [remoteData || nativeTransfer, remoteError, remoteLoading]
  } else {
    return [localDecodedData || nativeTransfer, localError, localLoading]
  }
}

export default useDecodeTx
