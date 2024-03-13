import { useParams } from 'next/navigation'
import { parse, type ParsedUrlQuery } from 'querystring'
import { prefixedAddressRe } from '@/utils/url'
import { decodeTransactionMagicLink, transactionKey, type TransactionMagicLink } from '@/services/tx/txMagicLink'
import { useEffect, useState } from 'react'
import { addOrUpdateTx, selectAllAddedTxs } from '@/store/addedTxsSlice'
import { useAppDispatch, useAppSelector } from '@/store'
import useChainId from './useChainId'
import useSafeAddress from './useSafeAddress'

// Use the location object directly because Next.js's router.query is available only on mount
const getLocationQuery = (): ParsedUrlQuery => {
  if (typeof location === 'undefined') return {}

  const query = parse(location.search.slice(1))

  if (!query.safe) {
    const pathParam = location.pathname.split('/')[1]
    const safeParam = prefixedAddressRe.test(pathParam) ? pathParam : ''

    // Path param -> query param
    if (prefixedAddressRe.test(pathParam)) {
      query.safe = safeParam
    }
  }

  return query
}

export const useTransactionMagicLink = (): { tx: TransactionMagicLink | undefined; txKey: string | undefined } => {
  const queryParams = useParams()

  // Dynamic query params
  const query = queryParams && queryParams.tx ? queryParams : getLocationQuery()
  const encodedTx = query.tx?.toString() ?? undefined

  const [tx, setTx] = useState<TransactionMagicLink | undefined>()
  const [txKey, setTxKey] = useState<string | undefined>()

  useEffect(() => {
    if (encodedTx) {
      setTx(decodeTransactionMagicLink(encodedTx))
    }
  }, [encodedTx])

  useEffect(() => {
    if (tx) {
      setTxKey(transactionKey(tx))
    }
  }, [tx])

  return { tx, txKey }
}

export const useMagicLink = () => {
  const dispatch = useAppDispatch()
  const chainId = useChainId()
  const safeAddress = useSafeAddress()

  const { tx } = useTransactionMagicLink()

  useEffect(() => {
    if (chainId && safeAddress && tx) {
      dispatch(addOrUpdateTx({ chainId, safeAddress, tx }))
    }
  }, [chainId, safeAddress, tx, dispatch])

  const addedTxs = useAppSelector(selectAllAddedTxs)

  useEffect(() => {
    console.log({ addedTxs })
  }, [addedTxs])
}
