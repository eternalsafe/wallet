import React from 'react'
import { Provider } from 'react-redux'
import type { Store } from 'redux'

import type { RootState } from '@/store'
import { getPersistedState } from '@/store'
import { LS_NAMESPACE } from '@/config/constants'

export const HYDRATE_ACTION = '@@HYDRATE'

type Props = { children: React.ReactElement | React.ReactElement[]; initialState?: RootState }

export const createStoreHydrator = (makeStore: (initialState?: Partial<RootState>) => Store<RootState>) => {
  return class HydrationWrapper extends React.Component<Props> {
    private store: ReturnType<typeof makeStore>

    constructor(props: Props) {
      super(props)

      this.store = makeStore(props.initialState)

      // Hydrate synchronously on the client so hooks see persisted state on first render.
      if (typeof window !== 'undefined') {
        this.store.dispatch({
          type: HYDRATE_ACTION,
          payload: getPersistedState(),
        })
      }
    }

    componentDidMount() {
      window.addEventListener('storage', this.handleStorageChange)
    }

    componentWillUnmount() {
      window.removeEventListener('storage', this.handleStorageChange)
    }

    handleStorageChange = (event: StorageEvent) => {
      if (event.key?.startsWith(LS_NAMESPACE) && event.newValue !== null) {
        this.store.dispatch({
          type: HYDRATE_ACTION,
          payload: getPersistedState(),
        })
      }
    }

    render() {
      return <Provider store={this.store}>{this.props.children}</Provider>
    }
  }
}
