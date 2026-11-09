import { all } from 'redux-saga/effects';
import authSaga from '@/features/auth/authSaga';
import cartSaga from '@/features/cart/cartSaga';

export default function* rootSaga() {
  yield all([authSaga(), cartSaga()]);
}
