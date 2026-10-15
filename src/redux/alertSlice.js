import { createSlice, nanoid } from '@reduxjs/toolkit';

const initialState = {
  message: '',
  type: '',
  open: false,
  color: '',
  id: null,
  blocking: null,
  queue: [],
};

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    setAlert: {
      prepare: (payload) => ({ payload: { ...payload, id: payload.id || nanoid() } }),
      reducer: (state, action) => {
        const notice = { ...action.payload, open: true, color: getColorByType(action.payload.type) };
        if (notice.blocking) state.blocking = notice;
        else if (notice.thermal && state.open) state.queue.push(notice);
        else Object.assign(state, { ...notice, blocking: state.blocking });
      },
    },
    dismissBlockingAlert: (state, action) => {
      if (state.blocking?.id === action.payload) state.blocking = null;
    },
    clearAlert: (state, action) => {
      if (action.payload && action.payload !== state.id) return;
      if (state.queue.length) {
        Object.assign(state, { ...state.queue.shift(), blocking: state.blocking });
        return;
      }
      state.message = '';
      state.type = '';
      state.open = false;
      state.color = '';
      state.id = null;
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
export const getBlockingAlert = (state) => state.alert.blocking;
export const { setAlert, clearAlert, dismissBlockingAlert } = alertSlice.actions;
export default alertSlice.reducer;
