import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux"; // 👈 type-only import
import type { RootState, AppDispatch } from "./store";

// typed dispatch & selector
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
