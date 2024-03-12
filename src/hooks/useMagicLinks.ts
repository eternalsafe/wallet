import { useParams } from 'next/navigation'
import { parse, type ParsedUrlQuery } from 'querystring'
import { prefixedAddressRe } from '@/utils/url'
import { decodeTransactionMagicLink, transactionKey } from '@/services/tx/txMagicLink'
import { useEffect, useState } from 'react'

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

export const useMagicLinks = () => {
  const queryParams = useParams()

  // Dynamic query params
  const query = queryParams && queryParams.tx ? queryParams : getLocationQuery()
  const encodedTx = query.tx?.toString() || ''

  const [tx, setTx] = useState(decodeTransactionMagicLink(encodedTx))
  const [txKey, setTxKey] = useState<string | undefined>()

  useEffect(() => {
    setTx(decodeTransactionMagicLink(encodedTx))
  }, [encodedTx])

  useEffect(() => {
    if (tx) {
      setTxKey(transactionKey(tx))
    }
  }, [tx])

  console.log(tx, txKey)
}
