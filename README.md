# Eternal Safe

[![License](https://img.shields.io/github/license/eternalsafe/wallet)](https://github.com/eternalsafe/wallet/blob/eternal-safe/LICENSE)
[![Tests](https://img.shields.io/github/actions/workflow/status/eternalsafe/wallet/unit-tests.yml?branch=eternalsafe&label=tests)](https://github.com/eternalsafe/wallet/actions/workflows/unit-tests.yml)

Eternal Safe is a decentralized fork of [Safe{Wallet}](https://github.com/safe-global/safe-wallet-monorepo), forked at v1.26.2. Funded by the [Safe Grants Program](https://app.charmverse.io/safe-grants-program/page-005239065690887612).

- The latest released version is always accessible at [https://eternalsafe.eth](https://eternalsafe.eth). If your browser doesn't support ENS, you can use alternatives below with different privacy trade-offs:
  - [https://eternalsafe.eth.limo](https://eternalsafe.eth.limo) - centralized ENS resolution.
  - [https://eternalsafe-eth.ipns.inbrowser.link](https://eternalsafe-eth.ipns.inbrowser.link) - this [fetches and verifies client-side](https://inbrowser.link/) the IPFS content.
- For the IPFS CID or pinned ENS subdomain, please check the [latest release](https://github.com/eternalsafe/wallet/releases/latest).
- The latest commit on the `eternalsafe` branch is always accessible at [https://eternalsafe.vercel.app](https://eternalsafe.vercel.app).

## Differences from Safe{Wallet}

- No analytics/tracking
- No backend services needed, only an RPC URL
- Easily runs on IPFS or locally
- And more: [full list of changes](./todo.md)

You can view the diff from the original Safe{Wallet} here: [https://github.com/eternalsafe/wallet/compare/eternalsafe..safe-global:safe-wallet-monorepo:v1.26.2](https://github.com/eternalsafe/wallet/compare/eternalsafe..safe-global:safe-wallet-monorepo:v1.26.2).  
**Note**: This diff is viewed backwards, i.e. additions in this diff are actually lines which are removed in Eternal Safe, and vice versa. [Seems to be a bug in GitHub](https://github.com/eternalsafe/wallet/issues/18#issuecomment-2558403419).

### Smart Links

Eternal Safe uses Smart Links to collect signatures in the name of decentralization, without relying on backend proposal services or external APIs.

- A Smart Link is a URL with the Safe (`safe=...`) and an encoded transaction payload (`tx=...`).
- It is expected that signers share these links with other owners through Telegram, Discord, email, or similar channels.
- Each signer opens the link, reviews/signs, and re-shares the updated Smart Link so confirmations build up step by step.

How signatures build up:

1. The transaction (including known signatures) is serialized and URL-safe encoded into `tx`.
2. The receiver decodes it, computes the transaction hash (`txKey`), and stores it locally by `chainId -> safeAddress -> txKey`.
3. Opening the same transaction again merges signatures by signer address, so each re-shared link can carry more confirmations.
4. The UI then rewrites `?tx=...` to `?id=multisig_<safeAddress>_<txKey>` for a stable local reference.

Note: Smart Links are encoded, not encrypted. Share only with trusted signers.

### RPC

Eternal Safe relies completely on the provided RPC URL. It is very important to provide a stable and performant RPC node. Typically, public RPC URLs are not sufficient, and it is recommended to run against a private RPC URL or your own node directly.

### Adding Custom Networks

You can add custom networks to Eternal Safe by including network parameters in the URL. Here's an example for adding Base Sepolia as a testnet:

```
https://eternalsafe.eth.limo?chainId=84532&chain=Base%20Sepolia&shortName=base-sepolia&rpc=https%3A%2F%2Fsepolia.base.org&currency=ETH&symbol=ETH&expAddr=https%3A%2F%2Fsepolia.basescan.org%2Faddress%2F%7B%7Baddress%7D%7D&expTx=https%3A%2F%2Fsepolia.basescan.org%2Ftx%2F%7B%7BtxHash%7D%7D&l2=true&testnet=true&multisendAddress=0x38869bf66a61cF6bDB996A6aE40D5853Fd43B526&multisendCallOnlyAddress=0x9641d764fc13c8B624c04430C7356C1C7C8102e2
```

Required URL parameters:

- `chainId`: The chain ID of the network
- `chain`: The name of the network (e.g. 'Base Sepolia')
- `shortName`: The short name of the network (e.g. 'base-sepolia')
- `rpc`: The RPC URL (must be URL-encoded)
- `currency`: The name of the native currency
- `symbol`: The symbol of the native currency

Optional URL parameters:

- `logo`: URL to the currency logo image (URL-encoded)
- `expAddr`: Block explorer URL template for addresses (URL-encoded)
- `expTx`: Block explorer URL template for transactions (URL-encoded)
- `multisendAddress`: Override the chain MultiSend contract address (must be a valid Ethereum address)
- `multisendCallOnlyAddress`: Override the chain MultiSendCallOnly contract address (must be a valid Ethereum address)
- `l2`: Whether the network is a Layer 2 network (boolean, defaults to false)
- `testnet`: Whether the network is a testnet (boolean, defaults to false)

Validation and safety notes:

- URL protocol allowlist is enforced: RPC must use `http`, `https`, `ws`, or `wss`; explorer/logo URLs must use `http` or `https`.
- If you provide one multisend override, you must provide both.
- Built-in networks can not be overridden via URL parameters.
- A confirmation prompt is required before any URL-based network/RPC change is applied.
- For explorer URLs, use `{{address}}` and `{{txHash}}` as placeholders that will be replaced with actual values.

## Contributing

Contributions, be it a bug report or a pull request, are very welcome. Please check our [contribution guidelines](CONTRIBUTING.md) beforehand.

## Getting started with local development

### Environment variables

Create a `.env` file with environment variables. You can use the `.env.example` file as a reference.

Here's the list of all the environment variables:

| Env variable                | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_IS_PRODUCTION` | Set to `true` to build a minified production app                              |
| `NEXT_PUBLIC_SAFE_VERSION`  | The latest version of the Safe contract, defaults to 1.4.1                    |
| `NEXT_PUBLIC_WC_PROJECT_ID` | [WalletConnect v2](https://docs.walletconnect.com/2.0/cloud/relay) project ID |

If you don't provide some of the variables, the corresponding features will be disabled in the UI.

WalletConnect API key resolution order:

1. User-provided key saved in app settings
2. `NEXT_PUBLIC_WC_PROJECT_ID` from `.env`
3. Empty (WalletConnect disabled until a key is provided)

### Running the app locally

This project must be built and developed with **Yarn classic (1.x)**.  
Using Yarn 2+/Berry, npm, or pnpm is not supported.

Install the dependencies:

```bash
yarn
```

Run the development server:

```bash
yarn start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## Local hash lookup for transaction decoding

The transaction decoder uses a local selector database in the browser. It does not depend on a remote decoding API in the normal flow.

### Files involved

- `public/signatures/export_chunk_*`: Pre-generated, compressed selector chunks served as static assets.
- `src/utils/hash-lookup.ts`: Generated lookup helper that maps a 4-byte selector (`0x12345678`) to the correct chunk file.
- `grab_split_db.sh`: Maintenance script used to rebuild selector chunks and regenerate `src/utils/hash-lookup.ts`.

### Runtime concept

1. The app extracts the first 4 bytes from calldata.
2. `src/utils/hash-lookup.ts` chooses the matching chunk by hash range.
3. The client fetches only that chunk from `/signatures/...`.
4. The chunk is decompressed client-side and searched for matching function signatures.
5. If no local match exists, raw calldata is shown.

This keeps decoding local and avoids downloading the full signature dataset up front.

### Rebuilding signature chunks

Use the script when you want to refresh the local selector dataset:

```bash
./grab_split_db.sh
```

The script:

1. Downloads signatures from the 4byte API.
2. Normalizes/sorts/deduplicates entries.
3. Splits the dataset into chunk files.
4. Compresses chunks.
5. Regenerates `src/utils/hash-lookup.ts` with updated hash ranges.

Required CLI tools include: `curl`, `sort`, `split`, `awk`, `zstd`, and `node`.

## Lint

ESLint:

```
yarn lint --fix
```

Prettier:

```
yarn prettier
```

## Tests

Unit tests:

```
yarn test --watch
```

## Component template

To create a new component from a template:

```
yarn cmp MyNewComponent
```

## Frameworks

This app is built using the following frameworks:

- [Safe Core SDK (Protocol Kit)](https://github.com/safe-global/safe-core-sdk)
- Next.js
- React
- Redux
- MUI
- ethers.js
- web3-onboard
