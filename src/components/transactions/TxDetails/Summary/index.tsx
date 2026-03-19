import type { ReactElement } from 'react'
import React, { useState } from 'react'
import { Link } from '@mui/material'
import { generateDataRowValue, TxDataRow } from '@/components/transactions/TxDetails/Summary/TxDataRow'
import { isMultisigDetailedExecutionInfo } from '@/utils/transaction-guards'
import type { TransactionDetails } from '@safe-global/safe-gateway-typescript-sdk'
import { Operation } from '@safe-global/safe-gateway-typescript-sdk'
import { dateString, safeFormatUnits } from '@/utils/formatters'
import css from './styles.module.css'
import type { SafeTransaction } from '@safe-global/safe-core-sdk-types'
import SafeTxGasForm from '../SafeTxGasForm'

interface Props {
  txDetails: TransactionDetails
  defaultExpanded?: boolean
}

const Summary = ({ txDetails, defaultExpanded = false }: Props): ReactElement => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded)

  const toggleExpanded = () => {
    setExpanded((val) => !val)
  }

  const { txHash, detailedExecutionInfo, executedAt, txData } = txDetails

  let confirmations, safeTxHash, baseGas, gasPrice, gasToken, refundReceiver, safeTxGas, submittedAt
  if (isMultisigDetailedExecutionInfo(detailedExecutionInfo)) {
    ;({ confirmations, safeTxHash, baseGas, gasPrice, gasToken, safeTxGas, submittedAt } = detailedExecutionInfo)
    refundReceiver = detailedExecutionInfo.refundReceiver?.value
  }

  return (
    <>
      <TxDataRow datatestid="tx-hash" title="Transaction hash:">
        {generateDataRowValue(txHash, 'hash', true)}
      </TxDataRow>
      <TxDataRow datatestid="tx-safe-hash" title="safeTxHash:">
        {generateDataRowValue(safeTxHash, 'hash')}
      </TxDataRow>
      {!!submittedAt && (
        <TxDataRow datatestid="tx-created-at" title="Created/Imported:">
          {dateString(submittedAt)}
        </TxDataRow>
      )}
      {!!executedAt && (
        <TxDataRow datatestid="tx-executed-at" title="Executed:">
          {dateString(executedAt)}
        </TxDataRow>
      )}

      {/* Advanced TxData */}
      {txData && (
        <>
          {!defaultExpanded && (
            <Link
              data-testid="tx-advanced-details"
              className={css.buttonExpand}
              onClick={toggleExpanded}
              component="button"
              variant="body1"
            >
              Advanced details
            </Link>
          )}

          {expanded && (
            <div>
              <TxDataRow datatestid="tx-operation" title="Operation:">
                {`${txData.operation} (${Operation[txData.operation].toLowerCase()})`}
              </TxDataRow>
              <TxDataRow datatestid="tx-value" title="Value:">
                {txData?.value ? `${safeFormatUnits(txData.value, 18)} ETH` : '0 ETH'}
              </TxDataRow>
              <TxDataRow datatestid="tx-safe-gas" title="safeTxGas:">
                {safeTxGas}
              </TxDataRow>
              <TxDataRow datatestid="tx-bas-gas" title="baseGas:">
                {baseGas}
              </TxDataRow>
              <TxDataRow datatestid="tx-gas-price" title="gasPrice:">
                {gasPrice}
              </TxDataRow>
              <TxDataRow datatestid="tx-gas-token" title="gasToken:">
                {generateDataRowValue(gasToken, 'hash', true)}
              </TxDataRow>
              <TxDataRow datatestid="tx-refund-receiver" title="refundReceiver:">
                {generateDataRowValue(refundReceiver, 'hash', true)}
              </TxDataRow>
              {confirmations?.map(({ signature }, index) => (
                <TxDataRow datatestid="tx-signature" title={`Signature ${index + 1}:`} key={`signature-${index}:`}>
                  {generateDataRowValue(signature, 'rawData')}
                </TxDataRow>
              ))}
              <TxDataRow datatestid="tx-raw-data" title="Raw data:">
                {generateDataRowValue(txData.hexData, 'rawData')}
              </TxDataRow>
            </div>
          )}
        </>
      )}
    </>
  )
}

export default Summary

export const PartialSummary = ({ safeTx }: { safeTx: SafeTransaction }) => {
  const txData = safeTx.data
  return (
    <>
      <TxDataRow datatestid="tx-executed-at" title="safeTxGas:">
        <SafeTxGasForm />
      </TxDataRow>
      <TxDataRow datatestid="tx-executed-at" title="baseGas:">
        {txData.baseGas}
      </TxDataRow>
      <TxDataRow datatestid="tx-executed-at" title="refundReceiver:">
        {generateDataRowValue(txData.refundReceiver, 'hash', true)}
      </TxDataRow>
      <TxDataRow datatestid="tx-executed-at" title="Raw data:">
        {generateDataRowValue(txData.data, 'rawData')}
      </TxDataRow>
    </>
  )
}
