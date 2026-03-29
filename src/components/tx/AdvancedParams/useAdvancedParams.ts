import { useMemo, useState } from 'react'
import useGasPrice from '@/hooks/useGasPrice'
import { type AdvancedParameters } from './types'
import useUserNonce from './useUserNonce'

export const useAdvancedParams = (
  gasLimit?: AdvancedParameters['gasLimit'],
): [AdvancedParameters, (params: AdvancedParameters) => void] => {
  const [manualParams, setManualParams] = useState<AdvancedParameters>()
  const [gasPrice] = useGasPrice()
  const userNonce = useUserNonce()

  const advancedParams: AdvancedParameters = useMemo(
    () => ({
      userNonce: manualParams?.userNonce ?? userNonce,
      gasLimit: manualParams?.gasLimit ?? gasLimit,
      maxFeePerGas: manualParams?.maxFeePerGas ?? gasPrice?.maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: manualParams?.maxPriorityFeePerGas ?? gasPrice?.maxPriorityFeePerGas ?? undefined,
    }),
    [manualParams, userNonce, gasLimit, gasPrice?.maxFeePerGas, gasPrice?.maxPriorityFeePerGas],
  )

  return [advancedParams, setManualParams]
}
