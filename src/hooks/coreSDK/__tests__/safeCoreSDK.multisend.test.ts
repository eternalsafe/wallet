import { getContractNetworksForOverrides } from '../safeCoreSDK'

describe('safeCoreSDK multisend overrides', () => {
  it('returns undefined when one override is missing', () => {
    expect(
      getContractNetworksForOverrides('1', {
        multisendAddress: '0x1111111111111111111111111111111111111111',
      }),
    ).toBeUndefined()

    expect(
      getContractNetworksForOverrides('1', {
        multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
      }),
    ).toBeUndefined()
  })

  it('builds config without empty placeholder addresses', () => {
    const config = getContractNetworksForOverrides('1', {
      multisendAddress: '0x1111111111111111111111111111111111111111',
      multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
    })

    expect(config).toBeDefined()

    const contracts = config?.['1']
    const values = Object.values(contracts ?? {})

    expect(values).not.toContain('')
    expect(contracts?.multiSendAddress).toBe('0x1111111111111111111111111111111111111111')
    expect(contracts?.multiSendCallOnlyAddress).toBe('0x2222222222222222222222222222222222222222')
  })
})
