import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: '',
  type: '',
  open: false,
  color: '',
};

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    setAlert: (state, action) => {
      state.message = action.payload.message;
      state.type = action.payload.type;
      state.open = true;
      state.color = getColorByType(action.payload.type);
    },
    clearAlert: (state) => {
      state.message = '';
      state.type = '';
      state.open = false;
      state.color = '';
    },
  },
});

const getColorByType = (type) => {
  switch (type) {
    case 'error':
      return '#F7A4A4';
    case 'warning':
      return '#EA906C';
    case 'success':
      return '#B6E2A1';
    default:
      return '';
  }
};

export const getAlert = (state) => state.alert;
export const { setAlert, clearAlert } = alertSlice.actions;
export default alertSlice.reducer;