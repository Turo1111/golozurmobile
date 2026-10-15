import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: '',
  open: false,
  owners: {},
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    acquireLoading: (state, action) => {
      state.owners[action.payload.token] = action.payload;
    },
    releaseLoading: (state, action) => {
      delete state.owners[action.payload];
    },
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


export const getLoading = (state) => {
  const loading = state.loading;
  if (loading.open) return loading;
  const owners = Object.values(loading.owners);
  const owner = owners.find((item) => !item.thermal) || owners[0];
  return owner ? { ...owner, open: true } : loading;
};
export const { setLoading, clearLoading, acquireLoading, releaseLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
