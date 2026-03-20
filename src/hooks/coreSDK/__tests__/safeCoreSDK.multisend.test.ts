import { getContractNetworksForOverrides } from '../safeCoreSDK'

describe('safeCoreSDK multisend overrides', () => {
  it('returns undefined when no overrides are provided', () => {
    expect(
      getContractNetworksForOverrides('1', '1.3.0', true, {
        multisendAddress: undefined,
        multisendCallOnlyAddress: undefined,
      }),
    ).toBeUndefined()
  })

  it('merges a single override with default deployment config', () => {
    const config = getContractNetworksForOverrides('1', '1.3.0', true, {
      multisendAddress: '0x1111111111111111111111111111111111111111',
    })

    expect(config).toBeDefined()
    expect(config?.['1'].multiSendAddress).toBe('0x1111111111111111111111111111111111111111')
    expect(config?.['1'].multiSendCallOnlyAddress).toMatch(/^0x/)
  })

  it('builds config without empty placeholder addresses', () => {
    const config = getContractNetworksForOverrides('1', '1.3.0', true, {
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
