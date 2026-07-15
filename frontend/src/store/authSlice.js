import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('access_token');
const refresh = localStorage.getItem('refresh_token');
const userJson = localStorage.getItem('user_profile');

const initialState = {
  user: userJson ? JSON.parse(userJson) : null,
  accessToken: token || null,
  refreshToken: refresh || null,
  isAuthenticated: !!token,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart(state) {
      state.loading = true;
      state.error = null;
    },
    authFailure(state, action) {
      state.loading = false;
      state.error = action.payload;
    },
    loginSuccess(state, action) {
      const { user, access_token, refresh_token } = action.payload;
      state.loading = false;
      state.isAuthenticated = true;
      state.user = user;
      state.accessToken = access_token;
      state.refreshToken = refresh_token;
      state.error = null;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      localStorage.setItem('user_profile', JSON.stringify(user));
    },
    refreshSuccess(state, action) {
      const { access_token, refresh_token } = action.payload;
      state.accessToken = access_token;
      state.refreshToken = refresh_token;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
    },
    logoutSuccess(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_profile');
    },
    updateUserProfile(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem('user_profile', JSON.stringify(state.user));
    },
    clearError(state) {
      state.error = null;
    }
  },
});

export const {
  authStart,
  authFailure,
  loginSuccess,
  refreshSuccess,
  logoutSuccess,
  updateUserProfile,
  clearError
} = authSlice.actions;

export default authSlice.reducer;
