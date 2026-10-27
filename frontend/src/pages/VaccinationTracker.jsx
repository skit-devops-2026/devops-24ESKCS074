
import { useEffect, useState } from "react";
import "./VaccinationTracker.css";

const API = "/api";

function VaccinationTracker({ petId }) {
  const [vaccinations, setVaccinations] = useState([]);
  const [vaccineName, setVaccineName] = useState("");
  const [dateGiven, setDateGiven] = useState("");
  const [nextDueDate, setNextDueDate] = useState("");
  const [vetName, setVetName] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const token = sessionStorage.getItem("petpal_token");

  // Get vaccinations from MongoDB
  useEffect(() => {
    async function loadVaccinations() {
      setVaccinations([]);
      setMessage("");

      if (!petId) return;

      try {
        const response = await fetch(
          `${API}/vaccinations/${petId}`,
          {
            headers: {
              Authorization: "Bearer " + token
            }
          }
        );

        if (!response.ok) {
          throw new Error("Could not load vaccinations");
        }

        const data = await response.json();
        setVaccinations(data);
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadVaccinations();
  }, [petId, token]);

  // Refresh vaccination list
  async function refreshVaccinations() {
    if (!petId) return;

    const response = await fetch(
      `${API}/vaccinations/${petId}`,
      {
        headers: {
          Authorization: "Bearer " + token
        }
      }
    );

    if (!response.ok) {
      throw new Error("Could not refresh vaccinations");
    }

    const data = await response.json();
    setVaccinations(data);
  }

  // Add new vaccination
  async function addVaccination(e) {
    e.preventDefault();
    setMessage("");

    if (!petId) {
      setMessage("Please select a pet first");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API}/vaccinations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          petId,
          vaccineName,
          dateGiven,
          nextDueDate,
          vetName,
          notes
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Could not add vaccination"
        );
      }

      setVaccineName("");
      setDateGiven("");
      setNextDueDate("");
      setVetName("");
      setNotes("");

      await refreshVaccinations();
      setMessage("Vaccination saved successfully!");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  // Delete vaccination
  async function deleteVaccination(id) {
    const confirmDelete = window.confirm(
      "Delete this vaccination record?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `${API}/vaccinations/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token
          }
        }
      );

      if (!response.ok) {
        throw new Error("Could not delete vaccination");
      }

      await refreshVaccinations();
      setMessage("Vaccination deleted");

    } catch (error) {
      setMessage(error.message);
    }
  }

  // Get status from due date
  function getStatus(dueDate) {
    if (!dueDate) return "No due date";

    const now = new Date();
    const today =
      now.getFullYear() + "-" +
      String(now.getMonth() + 1).padStart(2, "0") + "-" +
      String(now.getDate()).padStart(2, "0");

    if (dueDate < today) return "Overdue";
    if (dueDate === today) return "Due Today";

    return "Upcoming";
  }

  return (
    <section className="vaccination-section">
      <div className="vaccination-heading">
        <h2>Vaccination Tracker</h2>
        <p>
          Store your pet's vaccination history and next due dates.
        </p>
      </div>

      <div className="vaccination-card">
        <h3>Add Vaccination Record</h3>

        <form onSubmit={addVaccination}>
          <label>
            Vaccine Name
            <input
              type="text"
              placeholder="e.g. Rabies"
              value={vaccineName}
              onChange={(e) =>
                setVaccineName(e.target.value)
              }
              required
            />
          </label>

          <label>
            Date Given
            <input
              type="date"
              value={dateGiven}
              onChange={(e) =>
                setDateGiven(e.target.value)
              }
              required
            />
          </label>

          <label>
            Next Due Date
            <input
              type="date"
              value={nextDueDate}
              min={dateGiven || undefined}
              onChange={(e) =>
                setNextDueDate(e.target.value)
              }
            />
          </label>

          <label>
            Veterinarian Name (Optional)
            <input
              type="text"
              placeholder="Enter veterinarian name"
              value={vetName}
              onChange={(e) =>
                setVetName(e.target.value)
              }
            />
          </label>

          <label>
            Notes (Optional)
            <textarea
              placeholder="Vaccination details"
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              rows="3"
            />
          </label>

          <button
            type="submit"
            className="vaccination-add-btn"
            disabled={!petId || saving}
          >
            {saving ? "Saving..." : "+ Add Vaccination"}
          </button>
        </form>
      </div>

      {message && (
        <p className="vaccination-message">{message}</p>
      )}

      <div className="vaccination-card">
        <h3>Vaccination History</h3>

        {!petId ? (
          <p>Please select a pet first.</p>
        ) : vaccinations.length === 0 ? (
          <p>No vaccination records added yet.</p>
        ) : (
          vaccinations.map((vaccine) => (
            <div
              className="vaccination-record"
              key={vaccine._id}
            >
              <div className="vaccination-record-top">
                <h4>{vaccine.vaccineName}</h4>
                <span className={
                  "vaccination-status " +
                  getStatus(vaccine.nextDueDate)
                    .toLowerCase()
                    .replaceAll(" ", "-")
                }>
                  {getStatus(vaccine.nextDueDate)}
                </span>
              </div>

              <p>
                <strong>Date Given:</strong>{" "}
                {vaccine.dateGiven}
              </p>

              <p>
                <strong>Next Due:</strong>{" "}
                {vaccine.nextDueDate || "Not entered"}
              </p>

              {vaccine.vetName && (
                <p>
                  <strong>Vet:</strong> {vaccine.vetName}
                </p>
              )}

              {vaccine.notes && (
                <p>
                  <strong>Notes:</strong> {vaccine.notes}
                </p>
              )}

              <button
                type="button"
                className="vaccination-delete-btn"
                onClick={() =>
                  deleteVaccination(vaccine._id)
                }
              >
                Delete Record
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

export default VaccinationTracker;
