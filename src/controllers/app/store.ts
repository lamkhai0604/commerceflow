import { sanitizeAuthAction } from 'controllers/feature/auth/authDevTools';
import { configureStore, ThunkAction, Action, combineReducers } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import rootSaga from './rootSaga';
import { productsReducer } from 'controllers/feature/product/productSlice';
import { categoriesReducer } from 'controllers/feature/categories/categoriesSlice';
import { userReducers } from 'controllers/feature/user/userSlice';
import authReducers from 'controllers/feature/auth/authSlice';

const rootReducer = combineReducers({
  categories: categoriesReducer,
  products: productsReducer,
  user: userReducers,
  auth: authReducers,
})

const sagaMiddleware = createSagaMiddleware()

export const store = configureStore({
  reducer: rootReducer,
  devTools: process.env.NODE_ENV !== 'production' ? {
    // Credential actions must never be retained in Redux DevTools history.
    actionSanitizer: sanitizeAuthAction,
  } : false,
  middleware: (getDefaultMiddleware) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    getDefaultMiddleware().concat(sagaMiddleware),
});

sagaMiddleware.run(rootSaga)

export type AppDispatch = typeof store.dispatch;

export type RootState = ReturnType<typeof store.getState>;

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
