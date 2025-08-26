import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./hooks";
import { setLoading, setUser, clearUser } from "./store/authSlice";
import { api } from "./lib/axios";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./pages/Dashboard";
import { Button } from "./components/ui/button";
import { ThemeToggle } from "./components/ThemeToggle";

function Protected({ children }: { children: React.ReactNode }) {
  const user = useAppSelector(s => s.auth.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const user = useAppSelector(s => s.auth.user);
  if (user) return <Navigate to="/" replace />; // already logged in
  return <>{children}</>;
}

function Navbar() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(s => s.auth);

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
      dispatch(clearUser());
    } catch (e) { console.error(e); }
  };

  return (
    <div className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl flex items-center justify-between p-3">
        <Link to="/" className="font-semibold">Skill Portal</Link>
        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Link to="/login"><Button variant="outline">Login</Button></Link>
              <Link to="/register"><Button>Register</Button></Link>
            </>
          ) : (
            <>
              <Link to="/"><Button variant="ghost">Dashboard</Button></Link>
              <span className="text-sm mr-2">Hi, <b>{user.username}</b>{user.role === "ADMIN" ? " (Admin)" : ""}</span>
              <Button onClick={logout} variant="outline">Logout</Button>
              <ThemeToggle />
            </>
          )}
        </div>
      </div>
    </div>
  );
}


export default function App() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    (async () => {
      try {
        dispatch(setLoading(true));
        const res = await api.get("/api/auth/me");
        dispatch(setUser(res.data.user));
      } catch { dispatch(setUser(null)); }
      finally { dispatch(setLoading(false)); }
    })();
  }, [dispatch]);

  return (
    <BrowserRouter>
      <Navbar />
      <div className="mx-auto max-w-6xl p-4">
        <Routes>
          <Route path="/" element={<Protected><Dashboard /></Protected>} />
          <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
          <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
