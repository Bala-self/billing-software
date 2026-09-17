import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated) {
    navigate("/dashboard", { replace: true });
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border rounded-2xl p-6 shadow-sm"
      >
        <h1 className="text-xl font-bold text-[#111]">Sign in to BillPro</h1>
        <p className="text-xs text-gray-500 mt-1 mb-6">
          Use your business account credentials.
        </p>
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </p>
        )}
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-sm mb-4"
        />
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full border rounded-lg px-3 py-2.5 text-sm mb-5"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-[#111] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};

export default Login;
