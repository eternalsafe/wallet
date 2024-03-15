import { useParams } from 'next/navigation'
import { parse, type ParsedUrlQuery } from 'querystring'
import { prefixedAddressRe } from '@/utils/url'
import { decodeTransactionMagicLink, transactionKey } from '@/services/tx/txMagicLink'
import { useEffect, useState, useCallback } from 'react'
import { addOrUpdateTx, selectAllAddedTxs } from '@/store/addedTxsSlice'
import { useAppDispatch, useAppSelector } from '@/store'
import useChainId from './useChainId'
import useSafeAddress from './useSafeAddress'
import { type SafeTransaction } from '@safe-global/safe-core-sdk-types'

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

export const useTransactionMagicLink = (): { tx: SafeTransaction | undefined; txKey: string | undefined } => {
  const queryParams = useParams()

  // Dynamic query params
  const query = queryParams && queryParams.tx ? queryParams : getLocationQuery()
  const encodedTx = query.tx?.toString() ?? undefined

  const [tx, setTx] = useState<SafeTransaction | undefined>()
  const [txKey, setTxKey] = useState<string | undefined>()

  useEffect(() => {
    if (encodedTx) {
      setTx(decodeTransactionMagicLink(encodedTx))
    }
  }, [encodedTx])

  useEffect(() => {
    if (tx) {
      transactionKey(tx).then(setTxKey).catch(console.error)
    }
  }, [tx])

  return { tx, txKey }
}

export const useMagicLink = () => {
  const dispatch = useAppDispatch()
  const chainId = useChainId()
  const safeAddress = useSafeAddress()

  const { tx, txKey } = useTransactionMagicLink()

  useEffect(() => {
    if (chainId && safeAddress && tx && txKey) {
      dispatch(addOrUpdateTx({ chainId, safeAddress, tx, txKey }))
    }
  }, [chainId, safeAddress, tx, txKey, dispatch])

  const addedTxs = useAppSelector(selectAllAddedTxs)

  useEffect(() => {
    console.log({ addedTxs })
  }, [addedTxs])
}

export const useAddOrUpdateTx = () => {
  const dispatch = useAppDispatch()
  const chainId = useChainId()
  const safeAddress = useSafeAddress()

  const addOrUpdate = useCallback(
    async (tx: SafeTransaction) => {
      const txKey = await transactionKey(tx)
      dispatch(addOrUpdateTx({ chainId, safeAddress, tx, txKey }))

      return txKey
    },
    [dispatch, chainId, safeAddress],
  )

  return addOrUpdate
}
