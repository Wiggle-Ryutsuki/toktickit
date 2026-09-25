import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from "react";
import { getMeApi, loginApi, logoutApi, changePasswordApi } from "../api.js";
export const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const refreshUser = async () => {
        try {
            const currentUser = await getMeApi();
            setUser(currentUser);
        }
        catch {
            setUser(null);
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        refreshUser();
    }, []);
    const login = async (email, password) => {
        const loggedInUser = await loginApi(email, password);
        setUser(loggedInUser);
        return loggedInUser;
    };
    const logout = async () => {
        await logoutApi();
        setUser(null);
    };
    const changePassword = async (currentPassword, newPassword, confirmPassword) => {
        const updatedUser = await changePasswordApi(currentPassword, newPassword, confirmPassword);
        setUser(updatedUser);
        return updatedUser;
    };
    return (_jsx(AuthContext.Provider, { value: {
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout,
            changePassword,
            refreshUser,
        }, children: children }));
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
