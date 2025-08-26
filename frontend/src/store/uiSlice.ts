import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type UIState = { sidebarOpen: boolean };
const initialState: UIState = { sidebarOpen: false };

const uiSlice = createSlice({
    name: "ui",
    initialState,
    reducers: {
        setSidebar(state, action: PayloadAction<boolean>) { state.sidebarOpen = action.payload; },
        toggleSidebar(state) { state.sidebarOpen = !state.sidebarOpen; }
    }
});

export const { setSidebar, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;
