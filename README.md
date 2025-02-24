# Eternal Safe

[![License](https://img.shields.io/github/license/eternalsafe/wallet)](https://github.com/eternalsafe/wallet/blob/eternal-safe/LICENSE)
![Tests](https://img.shields.io/github/actions/workflow/status/eternalsafe/wallet/unit-tests.yml?branch=eternal-safe&label=tests)

Eternal Safe is a decentralized fork of [Safe{Wallet}](https://github.com/safe-global/safe-wallet-monorepo), forked at v1.26.2. Funded by the [Safe Grants Program](https://app.charmverse.io/safe-grants-program/page-005239065690887612).

The latest version is always accesible at [https://eternalsafe.eth.limo](https://eternalsafe.eth.limo). For the IPFS CID or pinned ENS subdomain, please check the [latest release](https://github.com/eternalsafe/wallet/releases/latest).

## Differences from Safe{Wallet}

- No analytics/tracking
- No backend services needed, only an RPC URL
- Easily runs on IPFS or locally
- And more: [full list of changes](./todo.md)

You can view the diff from the original Safe{Wallet} here: [https://github.com/eternalsafe/wallet/compare/eternalsafe..safe-global:safe-wallet-monorepo:v1.26.2](https://github.com/eternalsafe/wallet/compare/eternalsafe..safe-global:safe-wallet-monorepo:v1.26.2).  
**Note**: This diff is viewed backwards, i.e. additions in this diff are actually lines which are removed in Eternal Safe, and vice versa. [Seems to be a bug in GitHub](https://github.com/eternalsafe/wallet/issues/18#issuecomment-2558403419).

### RPC

Eternal Safe relies completely on the provided RPC URL. It is very important to provide a stable and performant RPC node. Typically, public RPC URLs are not sufficient, and it is recommended to run against a private RPC URL or your own node directly.

### Adding Custom Networks

You can add custom networks to Eternal Safe by including network parameters in the URL. Here's an example:

```
https://eternalsafe.eth.limo?chainId=100&rpc=https%3A%2F%2Frpc.gnosis.gateway.fm&currency=xDAI&symbol=xDAI&expAddr=https%3A%2F%2Fgnosisscan.io%2Faddress%2F%7B%7Baddress%7D%7D&expTx=https%3A%2F%2Fgnosisscan.io%2Ftx%2F%7B%7Bhash%7D%7D
```

Required URL parameters:
- `chainId`: The chain ID of the network
- `chain`: The short name of the network (e.g. 'eth')
- `rpc`: The RPC URL (must be URL-encoded)
- `currency`: The name of the native currency
- `symbol`: The symbol of the native currency

Optional URL parameters:
- `logo`: URL to the currency logo image (URL-encoded)
- `expAddr`: Block explorer URL template for addresses (URL-encoded)
- `expTx`: Block explorer URL template for transactions (URL-encoded)
- `l2`: Whether the network is a Layer 2 network (boolean, defaults to false)
- `testnet`: Whether the network is a testnet (boolean, defaults to false)

Note: For explorer URLs, use `{{address}}` and `{{txHash}}` as placeholders that will be replaced with actual values.

## Contributing

Contributions, be it a bug report or a pull request, are very welcome. Please check our [contribution guidelines](CONTRIBUTING.md) beforehand.

## Getting started with local development

### Environment variables

Create a `.env` file with environment variables. You can use the `.env.example` file as a reference.

Here's the list of all the environment variables:

| Env variable                | Description                                                                   |
| --------------------------- | ----------------------------------------------------------------------------- |
| `NEXT_PUBLIC_IS_PRODUCTION` | Set to `true` to build a minified production app                              |
| `NEXT_PUBLIC_SAFE_VERSION`  | The latest version of the Safe contract, defaults to 1.3.0                    |
| `NEXT_PUBLIC_WC_PROJECT_ID` | [WalletConnect v2](https://docs.walletconnect.com/2.0/cloud/relay) project ID |

If you don't provide some of the variables, the corresponding features will be disabled in the UI.

### Running the app locally

Install the dependencies:

```bash
yarn
```

Run the development server:

```bash
yarn start
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

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
