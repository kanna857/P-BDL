import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { authStart, authFailure, loginSuccess, logoutSuccess, clearError } from '../store/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  const login = async (email, password, rememberMe = false) => {
    dispatch(authStart());
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        remember_me: rememberMe,
      });
      
      const { access_token, refresh_token } = response.data;
      
      // Fetch user details immediately using the new access token
      const userResponse = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      
      dispatch(
        loginSuccess({
          user: userResponse.data,
          access_token,
          refresh_token,
        })
      );
      
      navigate('/dashboard');
      return true;
    } catch (err) {
      const errMsg = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
      dispatch(authFailure(errMsg));
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout API failed:', err);
    } finally {
      dispatch(logoutSuccess());
      navigate('/login');
    }
  };

  const hasPermission = (permission) => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Administrator') return true;
    
    // Check if permission matches any associated with user role
    return user.role.permissions.some((p) => p.name === permission);
  };

  const hasAnyPermission = (permissionsList) => {
    if (!user || !user.role) return false;
    if (user.role.name === 'Administrator') return true;
    
    return permissionsList.some((perm) => hasPermission(perm));
  };

  const resetError = () => {
    dispatch(clearError());
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    resetError,
  };
};
