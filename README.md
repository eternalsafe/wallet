# WIP: Eternal Safe

[![License](https://img.shields.io/github/license/devanoneth/eternal-safe)](https://github.com/devanoneth/eternal-safe/blob/main/LICENSE)

Eternal Safe is a decentralized fork of [Safe{Wallet}](https://github.com/safe-global/safe-wallet-web), forked at v1.27.0. Funded by the [Safe Grants Program](https://app.charmverse.io/safe-grants-program/page-005239065690887612).

## Differences from Safe{Wallet}

- No analytics/tracking
- No backend services needed
- Easily runs on IPFS or locally

## Contributing

Contributions, be it a bug report or a pull request, are very welcome. Please check our [contribution guidelines](CONTRIBUTING.md) beforehand.

## Getting started with local development

### Environment variables

Create a `.env` file with environment variables. You can use the `.env.example` file as a reference.

Here's the list of all the environment variables:

| Env variable                                           | Description                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_INFURA_TOKEN`                             | [Infura](https://docs.infura.io/infura/networks/ethereum/how-to/secure-a-project/project-id) RPC API token                                                              |
| `NEXT_PUBLIC_SAFE_APPS_INFURA_TOKEN`                   | Infura token for Safe Apps, falls back to `NEXT_PUBLIC_INFURA_TOKEN`                                                                                                    |
| `NEXT_PUBLIC_IS_PRODUCTION`                            | Set to `true` to build a minified production app                                                                                                                        |
| `NEXT_PUBLIC_GATEWAY_URL_PRODUCTION`                   | The base URL for the [Safe Client Gateway](https://github.com/safe-global/safe-client-gateway)                                                                          |
| `NEXT_PUBLIC_GATEWAY_URL_STAGING`                      | The base CGW URL on staging                                                                                                                                             |
| `NEXT_PUBLIC_SAFE_VERSION`                             | The latest version of the Safe contract, defaults to 1.3.0                                                                                                              |
| `NEXT_PUBLIC_WC_PROJECT_ID`                            | [WalletConnect v2](https://docs.walletconnect.com/2.0/cloud/relay) project ID                                                                                           |
| `NEXT_PUBLIC_TENDERLY_ORG_NAME`                        | [Tenderly](https://tenderly.co) org name for Transaction Simulation                                                                                                     |
| `NEXT_PUBLIC_TENDERLY_PROJECT_NAME`                    | Tenderly project name                                                                                                                                                   |
| `NEXT_PUBLIC_TENDERLY_SIMULATE_ENDPOINT_URL`           | Tenderly simulation URL                                                                                                                                                 |
| `NEXT_PUBLIC_SENTRY_DSN`                               | [Sentry](https://sentry.io) id for tracking runtime errors                                                                                                              |
| `NEXT_PUBLIC_SAFE_GELATO_RELAY_SERVICE_URL_PRODUCTION` | [Safe Gelato Relay Service](https://github.com/safe-global/safe-gelato-relay-service) URL to allow relaying transactions via Gelato                                     |
| `NEXT_PUBLIC_SAFE_GELATO_RELAY_SERVICE_URL_STAGING`    | Relay URL on staging                                                                                                                                                    |
| `NEXT_PUBLIC_IS_OFFICIAL_HOST`                         | Whether it's the official distribution of the app, or a fork; has legal implications. Set to true only if you also update the legal pages like Imprint and Terms of use |
| `NEXT_PUBLIC_REDEFINE_API`                             | Redefine API base URL                                                                                                                                                   |
| `NEXT_PUBLIC_FIREBASE_OPTIONS_PRODUCTION`              | Firebase Cloud Messaging (FCM) `initializeApp` options on production                                                                                                    |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY_PRODUCTION`            | FCM vapid key on production                                                                                                                                             |
| `NEXT_PUBLIC_FIREBASE_OPTIONS_STAGING`                 | FCM `initializeApp` options on staging                                                                                                                                  |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY_STAGING`               | FCM vapid key on staging                                                                                                                                                |

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

- [Safe Core SDK](https://github.com/safe-global/safe-core-sdk)
- Next.js
- React
- Redux
- MUI
- ethers.js
- web3-onboard
