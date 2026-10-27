
import { useState } from "react";

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (isRegister && password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    const url = isRegister
      ? "http://localhost:5000/api/auth/register"
      : "http://localhost:5000/api/auth/login";

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          isRegister
            ? { name, email, password }
            : { email, password }
        )
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Something went wrong");
        return;
      }

      if (isRegister) {
        setMessage("Registration successful! Please login.");
        setIsRegister(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        sessionStorage.setItem("petpal_token", data.token);
        onLogin(data.user);
      }
    } catch (error) {
      setMessage("Cannot connect to the server");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>🐾 PetPal</h1>
        <p>Your pet's happiness starts here.</p>

        <h2>{isRegister ? "Create Account" : "Welcome Back"}</h2>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <input
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isRegister && (
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          )}

          {message && <p className="auth-message">{message}</p>}

          <button type="submit">
            {isRegister ? "Register" : "Login"}
          </button>
        </form>

        <p>
          {isRegister ? "Already have an account?" : "New to PetPal?"}
          <button
            type="button"
            className="auth-switch"
            onClick={() => {
              setIsRegister(!isRegister);
              setMessage("");
            }}
          >
            {isRegister ? "Login" : "Register"}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
