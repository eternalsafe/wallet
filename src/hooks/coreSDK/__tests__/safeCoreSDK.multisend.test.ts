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

  it('preserves legacy behavior: one missing override returns undefined', () => {
    expect(
      getContractNetworksForOverrides('1', '1.3.0', true, {
        multisendAddress: '0x1111111111111111111111111111111111111111',
      }),
    ).toBeUndefined()

    expect(
      getContractNetworksForOverrides('1', '1.3.0', true, {
        multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
      }),
    ).toBeUndefined()
  })

  it('returns undefined when no deployment config exists for the chain', () => {
    const config = getContractNetworksForOverrides('9999999', '1.3.0', true, {
      multisendAddress: '0x1111111111111111111111111111111111111111',
      multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
    })

    expect(config).toBeUndefined()
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

  it('does not make HTTP requests while building contract network overrides', () => {
    const fetchMock = jest.fn()
    const previousFetch = global.fetch
    Object.defineProperty(global, 'fetch', {
      configurable: true,
      writable: true,
      value: fetchMock,
    })

    try {
      getContractNetworksForOverrides('1', '1.3.0', true, {
        multisendAddress: '0x1111111111111111111111111111111111111111',
        multisendCallOnlyAddress: '0x2222222222222222222222222222222222222222',
      })

      expect(fetchMock).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(global, 'fetch', {
        configurable: true,
        writable: true,
        value: previousFetch,
      })
    }
  })
})
