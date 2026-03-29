import { initialState, settingsSlice, TOKEN_LISTS } from '../settingsSlice'

describe('settingsSlice token lists', () => {
  test('adds custom token lists only once', () => {
    let state = settingsSlice.reducer(initialState, settingsSlice.actions.addCustomTokenList('ipns://tokens.example'))
    state = settingsSlice.reducer(state, settingsSlice.actions.addCustomTokenList('ipns://tokens.example'))

    expect(state.customTokenLists).toEqual(['ipns://tokens.example'])
  })

  test('resets selected list when deleting it', () => {
    const stateWithSelection = {
      ...initialState,
      tokenList: 'ipns://tokens.example',
      customTokenLists: ['ipns://tokens.example'],
    }

    const state = settingsSlice.reducer(
      stateWithSelection,
      settingsSlice.actions.removeCustomTokenList('ipns://tokens.example'),
    )

    expect(state.customTokenLists).toEqual([])
    expect(state.tokenList).toBe(TOKEN_LISTS.TRUSTED)
  })
})
