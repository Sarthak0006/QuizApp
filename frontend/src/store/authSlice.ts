import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type Role = "USER" | "ADMIN";
export type User = { sub: number; username: string; role: Role } | null;

type AuthState = {
    user: User;
    loading: boolean;
    error: string | null;
};

const initialState: AuthState = { user: null, loading: false, error: null };

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setLoading(state, action: PayloadAction<boolean>) { state.loading = action.payload; },
        setError(state, action: PayloadAction<string | null>) { state.error = action.payload; },
        setUser(state, action: PayloadAction<User>) { state.user = action.payload; },
        clearUser(state) { state.user = null; }
    }
});

export const { setLoading, setError, setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
