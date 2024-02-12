### Todo

- [ ] Query balances from chain
- [ ] Query transactions from chain
- [ ] Implement magic link with signatures
- [ ] Ask for RPC URL in Safe Loading flow
- [ ] Rip out Safe creation
- [ ] Replace Safe branded assets in public/
- [ ] Update terms and other imprint
- [ ] Remove Safe Gateway SDK
- [ ] Update env variables

### Done ✓

- [x] Change favicon
- [x] Remove cypress
- [x] Add Eternal Safe specific tests
- [x] Remove unused tests
- [x] Query Safe Info from chain
- [x] Rip out notifications
- [x] Rip out social login
- [x] Rip out Safe Apps
- [x] Rip out Wallet Connect
- [x] Rip out Safe token claiming
- [x] Rip out recovery module flow
- [x] Rip out dashboard home page and default to assets
- [x] Update welcome page for Eternal Safe and only allow loading an already existing Safe
- [x] Rename app
- [x] Rip out analytics

### Future

- Custom contract interactions via built-in version of [tx-builder](https://github.com/safe-global/safe-react-apps/tree/development/apps/tx-builder)
- Allow onchain message signing
- Dappnode package

### Notes

- Need to use the [`legacy-safe-core-sdk`](https://github.com/safe-global/safe-core-sdk/tree/legacy-safe-core-sdk) branch, as that's what the web app depended on at time of fork.
