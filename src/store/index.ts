import {
  configureStore,
  combineReducers,
  createListenerMiddleware,
  type ThunkAction,
  type PreloadedState,
  type AnyAction,
} from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import merge from 'lodash/merge'
import { IS_PRODUCTION } from '@/config/constants'
import { createStoreHydrator, HYDRATE_ACTION } from './storeHydrator'
import { chainsSlice } from './chainsSlice'
import { safeInfoSlice } from './safeInfoSlice'
import { balancesSlice } from './balancesSlice'
import { sessionSlice } from './sessionSlice'
import { txHistoryListener, txHistorySlice } from './txHistorySlice'
import { txQueueListener, txQueueSlice } from './txQueueSlice'
import { addressBookSlice } from './addressBookSlice'
import { notificationsSlice } from './notificationsSlice'
import { getPreloadedState, persistState } from './persistStore'
import { pendingTxsSlice } from './pendingTxsSlice'
import { addedSafesListener, addedSafesSlice } from './addedSafesSlice'
import { settingsSlice } from './settingsSlice'
import { spendingLimitSlice } from './spendingLimitsSlice'
import { safeAppsSlice } from './safeAppsSlice'
import { safeMessagesListener, safeMessagesSlice } from './safeMessagesSlice'
import { pendingSafeMessagesSlice } from './pendingSafeMessagesSlice'
import { batchSlice } from './batchSlice'
import { customTokensSlice } from './customTokensSlice'
import { addedTxsSlice } from './addedTxsSlice'

const rootReducer = combineReducers({
  [chainsSlice.name]: chainsSlice.reducer,
  [safeInfoSlice.name]: safeInfoSlice.reducer,
  [balancesSlice.name]: balancesSlice.reducer,
  [sessionSlice.name]: sessionSlice.reducer,
  [txHistorySlice.name]: txHistorySlice.reducer,
  [txQueueSlice.name]: txQueueSlice.reducer,
  [addressBookSlice.name]: addressBookSlice.reducer,
  [notificationsSlice.name]: notificationsSlice.reducer,
  [pendingTxsSlice.name]: pendingTxsSlice.reducer,
  [addedSafesSlice.name]: addedSafesSlice.reducer,
  [settingsSlice.name]: settingsSlice.reducer,
  [spendingLimitSlice.name]: spendingLimitSlice.reducer,
  [safeAppsSlice.name]: safeAppsSlice.reducer,
  [safeMessagesSlice.name]: safeMessagesSlice.reducer,
  [pendingSafeMessagesSlice.name]: pendingSafeMessagesSlice.reducer,
  [batchSlice.name]: batchSlice.reducer,
  [customTokensSlice.name]: customTokensSlice.reducer,
  [addedTxsSlice.name]: addedTxsSlice.reducer,
})

const persistedSlices: (keyof PreloadedState<RootState>)[] = [
  sessionSlice.name,
  addressBookSlice.name,
  pendingTxsSlice.name,
  addedSafesSlice.name,
  settingsSlice.name,
  safeAppsSlice.name,
  pendingSafeMessagesSlice.name,
  batchSlice.name,
  customTokensSlice.name,
  addedTxsSlice.name,
]

export const getPersistedState = () => {
  return getPreloadedState(persistedSlices)
}

export const listenerMiddlewareInstance = createListenerMiddleware<RootState>()

const middleware = [persistState(persistedSlices), listenerMiddlewareInstance.middleware]
const listeners = [addedSafesListener, safeMessagesListener, txHistoryListener, txQueueListener]

export const _hydrationReducer: typeof rootReducer = (state, action) => {
  if (action.type === HYDRATE_ACTION) {
    /**
     * When changing the schema of a Redux slice, previously stored data in LS might become incompatible.
     * To avoid this, we should always migrate the data on a case-by-case basis in the corresponding slice.
     * However, as a catch-all measure, we attempt to merge the stored data with the initial Redux state,
     * so that any newly added properties in the initial state are preserved, and existing properties are taken from the LS.
     *
     * @see https://lodash.com/docs/4.17.15#merge
     */

    return merge({}, state, action.payload)
  }
  return rootReducer(state, action)
}

export const makeStore = (initialState?: Record<string, any>) => {
  return configureStore({
    reducer: _hydrationReducer,
    middleware: (getDefaultMiddleware) => {
      listeners.forEach((listener) => listener(listenerMiddlewareInstance))
      return getDefaultMiddleware({ serializableCheck: false }).concat(middleware)
    },
    devTools: !IS_PRODUCTION,
    preloadedState: initialState,
  })
}

export const StoreHydrator = createStoreHydrator(makeStore)

export type AppDispatch = ReturnType<typeof makeStore>['dispatch']
export type RootState = ReturnType<typeof _hydrationReducer>

export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, AnyAction>

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
