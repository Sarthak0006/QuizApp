import { configureStore } from "@reduxjs/toolkit";
import auth from "./authSlice";
import ui from "./uiSlice";

// Disable thunk middleware (no thunk, no saga)
export const store = configureStore({
    reducer: { auth, ui },
    middleware: (getDefault) => getDefault({ thunk: false }) // <-- no thunk
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
