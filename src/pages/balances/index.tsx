import type { NextPage } from 'next'
import Head from 'next/head'

import AssetsTable from '@/components/balances/AssetsTable'
import AssetsHeader from '@/components/balances/AssetsHeader'
import useBalances from '@/hooks/useBalances'

import PagePlaceholder from '@/components/common/PagePlaceholder'
import NoAssetsIcon from '@/public/images/balances/no-assets.svg'
import TokenListSelect from '@/components/balances/TokenListSelect'

const Balances: NextPage = () => {
  const { error } = useBalances()

  return (
    <>
      <Head>
        <title>{'Eternal Safe – Assets'}</title>
      </Head>

      <AssetsHeader>
        <TokenListSelect />
      </AssetsHeader>

      <main>
        {error ? (
          <PagePlaceholder img={<NoAssetsIcon />} text="There was an error loading your assets" />
        ) : (
          <AssetsTable />
        )}
      </main>
    </>
  )
}

export default Balances
