import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const STORAGE_KEY = "toktickit_selected_requester_id";
const RequesterContext = createContext(undefined);
export function RequesterProvider({ children }) {
    const [requesters, setRequesters] = useState([]);
    const [selectedRequester, setSelectedRequesterState] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const setSelectedRequester = useCallback((requester) => {
        setSelectedRequesterState(requester);
        if (requester) {
            localStorage.setItem(STORAGE_KEY, String(requester.id));
        }
        else {
            localStorage.removeItem(STORAGE_KEY);
        }
    }, []);
    const fetchRequesters = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/requesters`);
            if (!res.ok) {
                throw new Error(`Failed to load requesters (HTTP ${res.status})`);
            }
            const data = await res.json();
            setRequesters(data);
            // Rehydrate selection from localStorage if valid
            const storedId = localStorage.getItem(STORAGE_KEY);
            if (storedId) {
                const matching = data.find((r) => r.id === Number(storedId));
                if (matching) {
                    setSelectedRequesterState(matching);
                }
                else {
                    localStorage.removeItem(STORAGE_KEY);
                    setSelectedRequesterState(null);
                }
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load requesters from server.");
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    useEffect(() => {
        fetchRequesters();
    }, [fetchRequesters]);
    const openSelector = useCallback(() => setIsSelectorOpen(true), []);
    const closeSelector = useCallback(() => setIsSelectorOpen(false), []);
    return (_jsx(RequesterContext.Provider, { value: {
            selectedRequester,
            setSelectedRequester,
            requesters,
            isLoading,
            error,
            reloadRequesters: fetchRequesters,
            isSelectorOpen,
            openSelector,
            closeSelector,
        }, children: children }));
}
export function useRequester() {
    const context = useContext(RequesterContext);
    if (!context) {
        throw new Error("useRequester must be used within a RequesterProvider");
    }
    return context;
}
