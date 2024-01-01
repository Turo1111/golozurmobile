import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  usuario: "",
  token: "",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.usuario = action.payload.user;
      state.token = action.payload.token;
    },
    clearUser: (state) => {
      state.usuario = "";
      state.token = "";
    },
  },
});

export const getUser = (state) => state.user;

export const { setUser, clearUser } = userSlice.actions;

export default userSlice.reducer;
