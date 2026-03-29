import TxLayout from '@/components/tx-flow/common/TxLayout'
import useTxStepper from '@/components/tx-flow/useTxStepper'
import CreateCustomTx from './CreateCustomTx'
import ReviewCustomTx from './ReviewCustomTx'
import SettingsIcon from '@/public/images/sidebar/settings.svg'

export type CustomTransactionParams = {
  contractAddress: string
  value: string
  calldata: string
}

const defaultParams: CustomTransactionParams = {
  contractAddress: '',
  value: '0',
  calldata: '0x',
}

type CustomTransactionFlowProps = {
  txNonce?: number
}

const CustomTransactionFlow = ({ txNonce }: CustomTransactionFlowProps) => {
  const { data, step, nextStep, prevStep } = useTxStepper<CustomTransactionParams>(defaultParams)

  const steps = [
    <CreateCustomTx
      key={0}
      params={data}
      txNonce={txNonce}
      onSubmit={(formData) => nextStep({ ...data, ...formData })}
    />,

    <ReviewCustomTx key={1} params={data} txNonce={txNonce} onSubmit={() => null} />,
  ]

  return (
    <TxLayout
      title={step === 0 ? 'New transaction' : 'Confirm transaction'}
      subtitle="Custom transaction"
      icon={SettingsIcon}
      step={step}
      onBack={prevStep}
    >
      {steps}
    </TxLayout>
  )
}

export default CustomTransactionFlow
