import { createContext, useContext, useState } from "react";
import authApi from "../api/authApi";

const AuthContext = createContext();

export default function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("access_token"));

  const login = async (username, password) => {
    const res = await authApi.login({ username, password });

    const accessToken = res.data.data.access_token;

    localStorage.setItem("access_token", accessToken);
    setToken(accessToken);

    return res;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}