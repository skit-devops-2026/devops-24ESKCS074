
import { useState, useEffect } from "react";

import Dashboard from "./pages/Dashboard";
import MyPets from "./pages/MyPets";
import DailyCare from "./pages/DailyCare";
import Login from "./pages/Login";
import WalkTracker from "./pages/WalkTracker";
import PhoneWalk from "./pages/PhoneWalk";
import HealthManager from "./pages/HealthManager";

import "./App.css";

const API = "/api";

function App() {
  const [user, setUser] = useState(null);
  const [pets, setPets] = useState([]);
  const [page, setPage] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [checkingLogin, setCheckingLogin] = useState(true);

  // Restore login after refreshing
  useEffect(() => {
    async function restoreLogin() {
      const token = sessionStorage.getItem("petpal_token");

      if (!token) {
        setCheckingLogin(false);
        return;
      }

      try {
        const response = await fetch(`${API}/auth/me`, {
          headers: {
            Authorization: "Bearer " + token
          }
        });

        if (!response.ok) {
          throw new Error("Session expired");
        }

        const loggedUser = await response.json();
        setUser(loggedUser);
      } catch (error) {
        sessionStorage.removeItem("petpal_token");
        setUser(null);
      } finally {
        setCheckingLogin(false);
      }
    }

    restoreLogin();
  }, []);

  // Load pets from MongoDB
  useEffect(() => {
    async function loadPets() {
      if (!user) {
        setPets([]);
        return;
      }

      setLoading(true);

      try {
        const response = await fetch(`${API}/pets`, {
          headers: {
            Authorization:
              "Bearer " +
              sessionStorage.getItem("petpal_token")
          }
        });

        if (!response.ok) {
          throw new Error("Could not load pets");
        }

        const data = await response.json();
        setPets(data);
      } catch (error) {
        alert(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadPets();
  }, [user]);

  // Add or edit pet
  async function savePet(pet, editId = null) {
    const token = sessionStorage.getItem("petpal_token");

    const response = await fetch(
      editId ? `${API}/pets/${editId}` : `${API}/pets`,
      {
        method: editId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify(pet)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not save pet");
    }

    if (editId) {
      setPets((oldPets) =>
        oldPets.map((item) =>
          item._id === editId ? data : item
        )
      );
    } else {
      setPets((oldPets) => [...oldPets, data]);
    }
  }

  // Delete pet
  async function deletePet(id) {
    const token = sessionStorage.getItem("petpal_token");

    const response = await fetch(`${API}/pets/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: "Bearer " + token
      }
    });

    if (!response.ok) {
      throw new Error("Could not delete pet");
    }

    setPets((oldPets) =>
      oldPets.filter((pet) => pet._id !== id)
    );
  }

  // Logout
  function logout() {
    sessionStorage.removeItem("petpal_token");
    setUser(null);
    setPets([]);
    setPage("dashboard");
  }

  // Protected navigation
  function changePage(nextPage) {
    if (!user && nextPage !== "dashboard") {
      setPage("login");
    } else {
      setPage(nextPage);
    }
  }

  // Detect QR phone handoff
  const walkToken = new URLSearchParams(
    window.location.search
  ).get("walkToken");

  if (checkingLogin) {
    return <p className="container">Loading PetPal...</p>;
  }

  // Phone walk handoff
  if (walkToken) {
    if (!user) {
      return (
        <Login
          onLogin={(loggedUser) => {
            setUser(loggedUser);
          }}
        />
      );
    }

    return <PhoneWalk token={walkToken} />;
  }

  return (
    <div>
      <nav className="navbar petpal-navbar">
        <h2 className="petpal-logo">🐾 PetPal</h2>

        <div className="petpal-nav-links">
          <button
            type="button"
            className={
              page === "dashboard"
                ? "petpal-nav-item selected"
                : "petpal-nav-item"
            }
            onClick={() => changePage("dashboard")}
          >
            Dashboard
          </button>

          <button
            type="button"
            className={
              page === "pets"
                ? "petpal-nav-item selected"
                : "petpal-nav-item"
            }
            onClick={() => changePage("pets")}
          >
            My Pets
          </button>

          <button
            type="button"
            className={
              page === "care"
                ? "petpal-nav-item selected"
                : "petpal-nav-item"
            }
            onClick={() => changePage("care")}
          >
            Daily Care
          </button>

          <button
            type="button"
            className={
              page === "walks"
                ? "petpal-nav-item selected"
                : "petpal-nav-item"
            }
            onClick={() => changePage("walks")}
          >
            Walk Tracker
          </button>

          <button
            type="button"
            className={
              page === "health"
                ? "petpal-nav-item selected"
                : "petpal-nav-item"
            }
            onClick={() => changePage("health")}
          >
            Health Manager
          </button>

          {user ? (
            <button
              type="button"
              className="petpal-nav-item petpal-logout"
              onClick={logout}
            >
              Logout
            </button>
          ) : (
            <button
              type="button"
              className={
                page === "login"
                  ? "petpal-nav-item selected"
                  : "petpal-nav-item"
              }
              onClick={() => setPage("login")}
            >
              Login
            </button>
          )}
        </div>
      </nav>

      {!user && page === "login" ? (
        <Login
          onLogin={(loggedUser) => {
            setUser(loggedUser);
            setPage("dashboard");
          }}
        />
      ) : (
        <main className="container">
          {page === "dashboard" && (
            <>
              <Dashboard
  petCount={pets.length}
  pets={pets}
  user={user}
/>
              {!user && (
                <button onClick={() => setPage("login")}>
                  + Add Pet — Login Required
                </button>
              )}
            </>
          )}

          {user && page === "pets" && (
            <>
              {loading ? (
                <p>Loading pets...</p>
              ) : (
                <MyPets
                  pets={pets}
                  savePet={savePet}
                  deletePet={deletePet}
                />
              )}
            </>
          )}

          {user && page === "care" && (
            <DailyCare pets={pets} />
          )}

          {user && page === "walks" && (
            <WalkTracker pets={pets} />
          )}

          {user && page === "health" && (
            <HealthManager />
          )}
        </main>
      )}
    </div>
  );
}

export default App;
