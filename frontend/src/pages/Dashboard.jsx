
import { useEffect, useState } from "react";
import "./Dashboard.css";

const API = "/api";

function Dashboard({ petCount, pets = [], user }) {
  const [medicines, setMedicines] = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Today's date in local time
  const now = new Date();
  const today =
    now.getFullYear() + "-" +
    String(now.getMonth() + 1).padStart(2, "0") + "-" +
    String(now.getDate()).padStart(2, "0");

  useEffect(() => {
    if (!user || pets.length === 0) {
      setMedicines([]);
      setVaccinations([]);
      setAppointments([]);
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("petpal_token");

      try {
        const allMedicines = [];
        const allVaccinations = [];
        const allAppointments = [];

        // Get health records for every registered pet
        for (const pet of pets) {
          const headers = {
            Authorization: "Bearer " + token
          };

          const responses = await Promise.all([
            fetch(`${API}/medicines/${pet._id}`, {
              headers
            }),
            fetch(`${API}/vaccinations/${pet._id}`, {
              headers
            }),
            fetch(`${API}/appointments/${pet._id}`, {
              headers
            })
          ]);

          if (responses.some((res) => !res.ok)) {
            throw new Error(
              "Some health records could not be loaded."
            );
          }

          const [meds, vaccines, visits] =
            await Promise.all(
              responses.map((res) => res.json())
            );

          // Attach pet name for dashboard display
          allMedicines.push(
            ...meds.map((item) => ({
              ...item,
              petName: pet.name
            }))
          );

          allVaccinations.push(
            ...vaccines.map((item) => ({
              ...item,
              petName: pet.name
            }))
          );

          allAppointments.push(
            ...visits.map((item) => ({
              ...item,
              petName: pet.name
            }))
          );
        }

        if (!cancelled) {
          setMedicines(allMedicines);
          setVaccinations(allVaccinations);
          setAppointments(allAppointments);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [user, pets]);

  // All medicines whose status is Pending
  const pendingMedicines = medicines.filter(
    (medicine) => !medicine.given
  );

  // Vaccines with a due date of today or earlier
  const vaccinesDue = vaccinations.filter(
    (vaccine) =>
      vaccine.nextDueDate &&
      vaccine.nextDueDate <= today
  );

  // Appointments still scheduled from today onward
  const upcomingVisits = appointments
    .filter(
      (item) =>
        item.status === "Scheduled" &&
        item.date >= today
    )
    .sort((a, b) =>
      (a.date + a.time).localeCompare(
        b.date + b.time
      )
    );

  // Future vaccination dates, sorted earliest first
  const upcomingVaccines = vaccinations
    .filter(
      (item) =>
        item.nextDueDate &&
        item.nextDueDate > today
    )
    .sort((a, b) =>
      a.nextDueDate.localeCompare(b.nextDueDate)
    );

  const stats = [
    {
      icon: "🐶",
      title: "My Pets",
      count: petCount
    },
    {
      icon: "💊",
      title: "Pending Medicines",
      count: pendingMedicines.length
    },
    {
      icon: "💉",
      title: "Vaccines Due",
      count: vaccinesDue.length
    },
    {
      icon: "🩺",
      title: "Upcoming Vet Visits",
      count: upcomingVisits.length
    }
  ];

  return (
    <div className="smart-dashboard" id="dashboard">

      <div className="dashboard-hero">
        <p className="dashboard-eyebrow">
          PETPAL · MY DASHBOARD
        </p>

        <h1>Welcome to PetPal 🐾</h1>

        <p>
          Everything your furry friend needs,
          in one place.
        </p>
      </div>

      {!user ? (
        <div className="dashboard-panel">
          <h2>Welcome, Pet Lover!</h2>
          <p>
            Login to manage your pets, health
            records, medicines and appointments.
          </p>
        </div>
      ) : (
        <>
          <h2 className="dashboard-title">
            Your Pet Care Overview
          </h2>

          {loading && (
            <p>Loading your pet information...</p>
          )}

          {error && (
            <p className="dashboard-error">
              {error}
            </p>
          )}

          <div className="dashboard-stats">
            {stats.map((item) => (
              <div
                className="dashboard-stat-card"
                key={item.title}
              >
                <div className="dashboard-stat-top">
                  <span>{item.title}</span>
                  <span className="dashboard-stat-icon">
                    {item.icon}
                  </span>
                </div>

                <h2>{item.count}</h2>
              </div>
            ))}
          </div>

          <div className="dashboard-grid">

            <div className="dashboard-panel">
              <h2>🐾 My Pets</h2>

              {pets.length === 0 ? (
                <p>No pets registered yet.</p>
              ) : (
                pets.map((pet) => (
                  <div
                    className="dashboard-list-item"
                    key={pet._id}
                  >
                    <div>
                      <strong>{pet.name}</strong>
                      {pet.breed && (
                        <p>{pet.breed}</p>
                      )}
                    </div>

                    <span>🐾</span>
                  </div>
                ))
              )}
            </div>

            <div className="dashboard-panel">
              <h2>💊 Pending Medicines</h2>

              {pendingMedicines.length === 0 ? (
                <p>No pending medicines.</p>
              ) : (
                pendingMedicines.slice(0, 5).map(
                  (medicine) => (
                    <div
                      className="dashboard-list-item"
                      key={medicine._id}
                    >
                      <div>
                        <strong>
                          {medicine.name}
                        </strong>

                        <p>
                          {medicine.petName} ·{" "}
                          {medicine.dosage}
                        </p>
                      </div>

                      <span className="dashboard-tag">
                        Pending
                      </span>
                    </div>
                  )
                )
              )}
            </div>

            <div className="dashboard-panel">
              <h2>💉 Vaccinations</h2>

              {vaccinesDue.length === 0 &&
              upcomingVaccines.length === 0 ? (
                <p>
                  No vaccination due dates recorded.
                </p>
              ) : (
                <>
                  {[
                    ...vaccinesDue,
                    ...upcomingVaccines
                  ].slice(0, 5).map((vaccine) => (
                    <div
                      className="dashboard-list-item"
                      key={vaccine._id}
                    >
                      <div>
                        <strong>
                          {vaccine.vaccineName}
                        </strong>

                        <p>
                          {vaccine.petName} ·{" "}
                          {vaccine.nextDueDate}
                        </p>
                      </div>

                      <span
                        className={
                          vaccine.nextDueDate <= today
                            ? "dashboard-tag due"
                            : "dashboard-tag"
                        }
                      >
                        {vaccine.nextDueDate < today
                          ? "Overdue"
                          : vaccine.nextDueDate === today
                            ? "Due Today"
                            : "Upcoming"}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="dashboard-panel">
              <h2>🩺 Upcoming Vet Visits</h2>

              {upcomingVisits.length === 0 ? (
                <p>No upcoming appointments.</p>
              ) : (
                upcomingVisits.slice(0, 5).map(
                  (visit) => (
                    <div
                      className="dashboard-list-item"
                      key={visit._id}
                    >
                      <div>
                        <strong>{visit.clinic}</strong>

                        <p>
                          {visit.petName} ·{" "}
                          {visit.date} at {visit.time}
                        </p>
                      </div>

                      <span className="dashboard-tag">
                        Scheduled
                      </span>
                    </div>
                  )
                )
              )}
            </div>

          </div>

          <p className="dashboard-footer">
            Manage individual records in Health Manager.
          </p>
        </>
      )}
    </div>
  );
}

export default Dashboard;
