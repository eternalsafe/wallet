import GasParams from '@/components/tx/GasParams'
import { useHasFeature } from '@/hooks/useChains'
import { FEATURES } from '@/utils/chains'
import { useState } from 'react'
import AdvancedParamsForm from './AdvancedParamsForm'
import { type AdvancedParameters } from './types'

type Props = {
  params: AdvancedParameters
  recommendedGasLimit?: AdvancedParameters['gasLimit']
  willExecute: boolean
  onFormSubmit: (data: AdvancedParameters) => void
  gasLimitError?: Error
}

const AdvancedParams = ({ params, recommendedGasLimit, willExecute, onFormSubmit, gasLimitError }: Props) => {
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const isEIP1559 = useHasFeature(FEATURES.EIP1559)

  const onEditOpen = () => {
    setIsEditing(true)
  }

  const onAdvancedSubmit = (data: AdvancedParameters) => {
    onFormSubmit(data)
    setIsEditing(false)
  }

  return isEditing ? (
    <AdvancedParamsForm
      params={params}
      isExecution={willExecute}
      recommendedGasLimit={recommendedGasLimit}
      onSubmit={onAdvancedSubmit}
      isEIP1559={isEIP1559}
    />
  ) : (
    <GasParams
      params={params}
      isExecution={willExecute}
      isEIP1559={isEIP1559}
      gasLimitError={gasLimitError}
      onEdit={onEditOpen}
    />
  )
}

export default AdvancedParams

export * from './useAdvancedParams'

export * from './types.d'
