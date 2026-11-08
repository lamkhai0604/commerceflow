import { Action, combineReducers, configureStore, ThunkAction } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { sanitizeAuthAction } from '@/features/auth/authDevTools';
import authReducer from '@/features/auth/authSlice';
import rootSaga from './rootSaga';

const rootReducer = combineReducers({
  auth: authReducer,
});

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: rootReducer,
  devTools: import.meta.env.DEV ? {
    // Credential actions must never be retained in Redux DevTools history.
    actionSanitizer: sanitizeAuthAction,
  } : false,
  middleware: getDefaultMiddleware => getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;
export type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, Action<string>>;
