import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: '',
  open: false,
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.message = action.payload.message;
      state.open = true;
    },
    clearLoading: (state) => {
      state.message = '';
      state.open = false;
    },
  },
});


export const getLoading = (state) => state.loading;
export const { setLoading, clearLoading } = loadingSlice.actions;
export default loadingSlice.reducer;