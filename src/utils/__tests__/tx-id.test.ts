import { buildMultisigTxId, normalizeTxId } from '../tx-id'

describe('tx-id utils', () => {
  it('normalizes multisig tx ids to lowercase', () => {
    expect(normalizeTxId('multisig_0xA710c854edE0eEaF84eA272363083cfA547dd552_0xAbCdEf1234567890')).toBe(
      'multisig_0xa710c854ede0eeaf84ea272363083cfa547dd552_0xabcdef1234567890',
    )
  })

  it('keeps non-multisig ids unchanged', () => {
    expect(normalizeTxId('module_0xabc_0xdef')).toBe('module_0xabc_0xdef')
  })

  it('builds normalized multisig tx ids', () => {
    expect(buildMultisigTxId('0xA710c854edE0eEaF84eA272363083cfA547dd552', '0xAbCdEf')).toBe(
      'multisig_0xa710c854ede0eeaf84ea272363083cfa547dd552_0xabcdef',
    )
  })
})
