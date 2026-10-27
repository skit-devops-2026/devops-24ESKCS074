

import { useState, useEffect, useRef } from "react";

const API = "http://localhost:5000/api/walks";

// Calculate distance between two GPS points in metres
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = Math.PI / 180;

  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) *
    Math.cos(lat2 * toRad) *
    Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatTime(total) {
  total = Math.floor(total);

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return [hours, minutes, seconds]
    .map(n => String(n).padStart(2, "0"))
    .join(":");
}

function PhoneWalk({ token }) {
  const [walk, setWalk] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(Date.now());
  const [distance, setDistance] = useState(0);
  const [accuracy, setAccuracy] = useState(null);

  const gpsWatch = useRef(null);
  const lastPosition = useRef(null);
  const distanceRef = useRef(0);
  const tracking = useRef(false);

  // Update the timer every second
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Stop GPS when leaving the page
  useEffect(() => {
    return () => {
      stopGPS();
    };
  }, []);

  // Request location permission and first position
  function getLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("GPS is not supported on this device"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        }
      );
    });
  }

  // Start watching phone GPS
  function startGPS(firstPosition) {
    if (!navigator.geolocation) return;

    stopGPS();

    tracking.current = true;

    // First point becomes our starting reference
    lastPosition.current = {
      lat: firstPosition.coords.latitude,
      lon: firstPosition.coords.longitude,
      time: firstPosition.timestamp
    };

    setAccuracy(firstPosition.coords.accuracy);

    gpsWatch.current =
      navigator.geolocation.watchPosition(
        (position) => {
          if (!tracking.current) return;

          const {
            latitude,
            longitude,
            accuracy: gpsAccuracy
          } = position.coords;

          setAccuracy(gpsAccuracy);

          // Ignore inaccurate GPS readings
          if (gpsAccuracy > 30) return;

          const previous = lastPosition.current;

          const current = {
            lat: latitude,
            lon: longitude,
            time: position.timestamp
          };

          if (previous) {
            const metres = calculateDistance(
              previous.lat,
              previous.lon,
              current.lat,
              current.lon
            );

            const seconds =
              (current.time - previous.time) / 1000;

            // Ignore repeated or impossible updates
            if (seconds <= 0) return;

            const speed = metres / seconds;

            // Ignore implausible jumps
            if (speed > 4) {
              lastPosition.current = current;
              return;
            }

            // Ignore tiny GPS movements
            if (metres >= 5) {
              distanceRef.current += metres / 1000;
              setDistance(distanceRef.current);
              lastPosition.current = current;
            }
          } else {
            lastPosition.current = current;
          }
        },

        (error) => {
          setMessage("GPS error: " + error.message);
          stopGPS();
        },

        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000
        }
      );
  }

  // Stop receiving GPS updates
  function stopGPS() {
    tracking.current = false;

    if (gpsWatch.current !== null) {
      navigator.geolocation.clearWatch(
        gpsWatch.current
      );
      gpsWatch.current = null;
    }

    lastPosition.current = null;
  }

  // Helper function for backend requests
  async function request(path, method, body) {
    const response = await fetch(API + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer " +
          sessionStorage.getItem("petpal_token")
      },
      body: body ? JSON.stringify(body) : undefined
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Request failed");
    }

    return data;
  }

  // Accept walk transferred from laptop
  async function acceptWalk() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      const data = await request(
        "/claim",
        "POST",
        { token }
      );

      setWalk(data.walk);
      setMessage("Walk connected! You can start GPS.");

      // Clear the one-time handoff URL
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );

    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Start or resume GPS walk
  async function startWalk() {
    if (!walk || busy) return;

    setBusy(true);
    setMessage("Getting your location...");

    try {
      // Obtain GPS before starting the backend timer
      const position = await getLocation();

      const path =
        walk.status === "paused" &&
        walk.elapsedSeconds > 0
          ? `/${walk._id}/gps/resume`
          : `/${walk._id}/gps/start`;

      const updated = await request(
        path,
        "PUT"
      );

      setWalk(updated);
      setNow(Date.now());

      startGPS(position);
      setMessage("GPS tracking started!");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Pause walk
  async function pauseWalk() {
    if (!walk || busy) return;

    setBusy(true);

    try {
      const updated = await request(
        `/${walk._id}/gps/pause`,
        "PUT"
      );

      stopGPS();
      setWalk(updated);
      setMessage("Walk paused");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Finish and save to MongoDB
  async function finishWalk() {
    if (!walk || busy) return;

    if (!window.confirm("Finish this walk?")) {
      return;
    }

    setBusy(true);

    try {
      const updated = await request(
        `/${walk._id}/gps/finish`,
        "PUT",
        {
          distance: Number(
            distanceRef.current.toFixed(3)
          )
        }
      );

      stopGPS();
      setWalk(updated);
      setMessage("Walk saved successfully!");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  // Calculate live elapsed time
  let seconds = walk?.elapsedSeconds || 0;

  if (
    walk?.status === "walking" &&
    walk.lastResumedAt
  ) {
    seconds += Math.max(
      0,
      (now -
        new Date(walk.lastResumedAt).getTime()
      ) / 1000
    );
  }

  const completed = walk?.status === "completed";

  return (
    <section className="phone-walk">
      <h1>🐾 PetPal Smart Walk</h1>

      <div className="phone-walk-card">
        {!walk ? (
          <>
            <h2>Continue Your Walk</h2>

            <p>
              Your walk is ready to transfer
              from your laptop to this phone.
            </p>

            <button
              onClick={acceptWalk}
              disabled={busy}
            >
              {busy ? "Connecting..." : "Accept Walk"}
            </button>
          </>
        ) : (
          <>
            <h2>
              {completed
                ? "Adventure Completed!"
                : "Your Walking Adventure"}
            </h2>

            <p>ACTIVE WALK TIME</p>

            <h1 className="walk-clock">
              {formatTime(
                completed ? walk.duration : seconds
              )}
            </h1>

            <p>ESTIMATED GPS DISTANCE</p>

            <h1 className="gps-distance">
              {distance.toFixed(2)} km
            </h1>

            <p>Status: {walk.status}</p>

            {accuracy !== null && (
              <p>
                GPS accuracy: approximately{" "}
                {Math.round(accuracy)} metres
              </p>
            )}

            {!completed && (
              <div className="walk-buttons">
                {walk.status === "paused" && (
                  <button
                    onClick={startWalk}
                    disabled={busy}
                  >
                    📍 Start / Resume GPS
                  </button>
                )}

                {walk.status === "walking" && (
                  <button
                    onClick={pauseWalk}
                    disabled={busy}
                  >
                    ⏸ Pause
                  </button>
                )}

                <button
                  onClick={finishWalk}
                  disabled={busy}
                >
                  ✓ Finish Walk
                </button>
              </div>
            )}

            {completed && (
              <p>
                Your walk has been saved in MongoDB.
              </p>
            )}
          </>
        )}

        {message && (
          <p className="gps-message">
            {message}
          </p>
        )}
      </div>
    </section>
  );
}

export default PhoneWalk;
