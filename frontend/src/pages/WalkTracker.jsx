import { useEffect, useState } from "react";
import "./VetAppointments.css";
import QRCode from "qrcode";

const API = "http://localhost:5000/api/walks";

function WalkTracker({ pets = [] }) {
  const [petId, setPetId] = useState("");
  const [walk, setWalk] = useState(null);
  const [history, setHistory] = useState([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [qrImage, setQrImage] = useState("");
  const [handoffUrl, setHandoffUrl] = useState("");

  // Choose a pet, but don't reset the user's selection on every render.
  useEffect(() => {
    if (!pets.some((pet) => pet._id === petId)) {
      setPetId(pets[0]?._id || "");
    }
  }, [pets, petId]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load the active walk and completed walks. Stop waiting after 10 seconds.
  useEffect(() => {
    if (!petId) {
      setWalk(null);
      setHistory([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    async function loadWalks() {
      setLoading(true);
      setError("");
      setWalk(null);
      setHistory([]);
      setQrImage("");
      setHandoffUrl("");

      try {
        const token = sessionStorage.getItem("petpal_token");
        if (!token) throw new Error("Please log in again.");

        const headers = { Authorization: "Bearer " + token };
        const [activeResponse, historyResponse] = await Promise.all([
          fetch(`${API}/active/${petId}`, { headers, signal: controller.signal }),
          fetch(`${API}/${petId}`, { headers, signal: controller.signal })
        ]);

        if (!activeResponse.ok || !historyResponse.ok) {
          throw new Error(
            `Cannot load walks (API status: ${activeResponse.status}, ${historyResponse.status}).`
          );
        }

        const activeData = await activeResponse.json();
        const historyData = await historyResponse.json();
        if (controller.signal.aborted) return;

        setWalk(activeData);
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (err) {
        if (controller.signal.aborted) {
          setError("The walk API took too long. Check your backend and try again.");
        } else {
          setError(err.message || "Could not load walks.");
        }
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    }

    loadWalks();
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [petId, retry]);

  async function request(path, method = "GET", body) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(API + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + sessionStorage.getItem("petpal_token")
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || `API error ${response.status}`);
      return data;
    } catch (err) {
      if (err.name === "AbortError") throw new Error("Backend response timed out.");
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function startWalk() {
    if (!petId || busy || loading || error) return;
    setBusy(true);
    try {
      const data = await request("/start", "POST", { petId, mode: "timer" });
      setWalk(data);
      setNow(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function pauseWalk() {
    if (!walk || busy) return;
    setBusy(true);
    try {
      setWalk(await request(`/${walk._id}/pause`, "PUT"));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resumeWalk() {
    if (!walk || busy) return;
    setBusy(true);
    try {
      setWalk(await request(`/${walk._id}/resume`, "PUT"));
      setNow(Date.now());
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function finishWalk() {
    if (!walk || busy || !window.confirm("Finish this walk?")) return;
    setBusy(true);
    try {
      const finished = await request(`/${walk._id}/finish`, "PUT");
      setHistory((old) => [finished, ...old]);
      setWalk(null);
      setQrImage("");
      setHandoffUrl("");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function continueOnPhone() {
    if (!walk || busy || walk.mode !== "timer") return;
    setBusy(true);
    try {
      const data = await request(`/${walk._id}/handoff`, "POST");
      // Only a reachable HTTPS address will work on another device.
      const phoneLink = `${window.location.origin}/?walkToken=${encodeURIComponent(data.token)}`;
      setQrImage(await QRCode.toDataURL(phoneLink));
      setHandoffUrl(phoneLink);
      setWalk(await request(`/active/${petId}`, "GET"));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function formatTime(value) {
    const total = Math.max(0, Math.floor(Number(value) || 0));
    return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
      .map((n) => String(n).padStart(2, "0"))
      .join(":");
  }

  let seconds = walk?.elapsedSeconds || 0;
  if (walk?.status === "walking" && walk.lastResumedAt) {
    seconds += Math.max(0, (now - new Date(walk.lastResumedAt).getTime()) / 1000);
  }

  const totalMinutes = Math.round(history.reduce((sum, item) => sum + (item.duration || 0), 0) / 60);
  const longestMinutes = Math.round(Math.max(0, ...history.map((item) => item.duration || 0)) / 60);
  const selectedPet = pets.find((pet) => pet._id === petId);

  if (pets.length === 0) {
    return <section className="walk-page"><h2>Smart Walk Tracker</h2><p>Please add a pet first.</p></section>;
  }

  return (
    <section className="walk-page">
      <div className="walk-hero">
        <p>🐾 PETPAL · SMART WALK TRACKER</p>
        <h1>Let's go for a walk!</h1>
        <p>Track your furry friend's exercise automatically.</p>
        <label htmlFor="walkPet">Select Pet</label>
        <select id="walkPet" value={petId} disabled={busy} onChange={(e) => setPetId(e.target.value)}>
          {pets.map((pet) => <option key={pet._id} value={pet._id}>{pet.name}</option>)}
        </select>
      </div>

      <div className="walk-timer-card">
        <h2>{selectedPet?.name}'s Walk</h2>
        <p>ACTIVE WALK TIME</p>
        <h1 className="walk-clock">{formatTime(seconds)}</h1>
        <p>Status: {loading ? "Loading..." : error ? "Connection issue" : walk?.status || "Ready"}</p>

        {loading && <p>Loading walk records...</p>}
        {error && (
          <div role="alert">
            <p style={{ color: "#a33d35" }}>{error}</p>
            <button disabled={busy} onClick={() => setRetry((n) => n + 1)}>Retry Loading</button>
          </div>
        )}

        {!loading && !error && (
          <div className="walk-buttons">
            {!walk && <button disabled={busy} onClick={startWalk}>▶ Start Walk</button>}
            {walk?.status === "walking" && walk.mode === "timer" &&
              <button disabled={busy} onClick={pauseWalk}>⏸ Pause</button>}
            {walk?.status === "paused" && walk.mode === "timer" &&
              <button disabled={busy} onClick={resumeWalk}>▶ Resume</button>}
            {walk && ["walking", "paused"].includes(walk.status) && walk.mode === "timer" &&
              <button disabled={busy} onClick={finishWalk}>✓ Finish Walk</button>}
            {walk?.mode === "gps" && <p>This walk was handed off to the phone.</p>}
          </div>
        )}

        <div className="laptop-only">
          <h3>📱 Continue on Phone</h3>
          <p>Use your phone's GPS for more accurate distance tracking.</p>
          {walk?.mode === "timer" && !loading && !error &&
            <button disabled={busy} onClick={continueOnPhone}>📱 Continue on Phone</button>}
          {qrImage && (
            <div className="qr-box">
              <h3>Scan with your phone</h3>
              <img src={qrImage} alt="PetPal walk QR code" className="walk-qr" />
              <p>Expires after 5 minutes. Sign in with the same account.</p>
              <p>Phone handoff requires a reachable HTTPS website; localhost links won't work on another device.</p>
              <button onClick={() => navigator.clipboard.writeText(handoffUrl).catch(() => alert("Could not copy link"))}>
                Copy Phone Link
              </button>
            </div>
          )}
        </div>
        <div className="mobile-only">
          <p>Phone GPS tracking will be added next. This version records walking time only.</p>
        </div>
      </div>

      <h2>Walking Statistics</h2>
      <div className="walk-stats">
        <div className="walk-stat"><h2>{history.length}</h2><p>Total Walks</p></div>
        <div className="walk-stat"><h2>{totalMinutes}</h2><p>Total Minutes</p></div>
        <div className="walk-stat"><h2>{longestMinutes}</h2><p>Longest Walk (min)</p></div>
      </div>
      <h2>Walk History</h2>
      <div className="walk-history">
        {history.length === 0 && <p>No completed walks yet.</p>}
        {history.map((item) => (
          <div className="walk-history-card" key={item._id}>
            <h3>🐾 Walk Adventure</h3>
            <p>Date: {item.date}</p>
            <p>Duration: {formatTime(item.duration)}</p>
            <p>Distance: {item.distance == null ? "Not recorded" : Number(item.distance).toFixed(2) + " km"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WalkTracker;
