import { configureStore } from '@reduxjs/toolkit'
import userSlice from './userSlice';
import alertSlice from './alertSlice';
import loadingSlice from './loadingSlice';

export const store = configureStore({
    reducer: {
        user: userSlice,
        alert: alertSlice,
        loading: loadingSlice
    }
})

