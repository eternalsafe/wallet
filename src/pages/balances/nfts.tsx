import type { NextPage } from 'next'
import Head from 'next/head'
import { Grid } from '@mui/material'
import AssetsHeader from '@/components/balances/AssetsHeader'
import NftCollections from '@/components/nfts/NftCollections'

const NFTs: NextPage = () => {
  return (
    <>
      <Head>
        <title>{'Eternal Safe – NFTs'}</title>
      </Head>

      <AssetsHeader />

      <main>
        <Grid container spacing={3}>
          <Grid item xs>
            <NftCollections />
          </Grid>
        </Grid>
      </main>
    </>
  )
}

export default NFTs
