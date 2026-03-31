import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "../services/firebase/auth";

export function LoginPage() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900 sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">MDB Khata</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Sign in with Google to continue.</p>
        <button
          onClick={async () => {
            await loginWithGoogle();
            navigate("/");
          }}
          className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 text-white dark:bg-slate-100 dark:text-slate-900"
        >
          Continue with Google
        </button>
      </div>
    </div>
  );
}
