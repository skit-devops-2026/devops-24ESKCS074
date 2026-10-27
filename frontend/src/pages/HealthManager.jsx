import VaccinationTracker from "./VaccinationTracker";
import VetAppointments from "./VetAppointments";
import { useEffect, useState } from "react";

const API = "/api";

const green = "#254537";
const gold = "#DCA747";
const cream = "#F6F1E3";

export default function HealthManager() {
  const [pets, setPets] = useState([]);
  const [petId, setPetId] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("Once Daily");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("medicines");
  const [loading, setLoading] = useState(false);

  const token = sessionStorage.getItem("petpal_token");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Load pets from MongoDB
  useEffect(() => {
    async function loadPets() {
      try {
        const res = await fetch(`${API}/pets`, {
          headers,
        });

        if (!res.ok) {
          throw new Error("Could not load pets");
        }

        const data = await res.json();
        const petList = Array.isArray(data)
          ? data
          : data.pets || [];

        setPets(petList);

        if (petList.length > 0) {
          setPetId(petList[0]._id);
        }
      } catch (error) {
        setMessage(error.message);
      }
    }

    loadPets();
  }, []);

  // Load medicines when pet changes
  useEffect(() => {
    if (petId) {
      loadMedicines(petId);
    } else {
      setMedicines([]);
    }
  }, [petId]);

  async function loadMedicines(selectedPetId) {
    try {
      const res = await fetch(
        `${API}/medicines/${selectedPetId}`,
        { headers }
      );

      if (!res.ok) {
        throw new Error("Could not load medicines");
      }

      const data = await res.json();
      setMedicines(data);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function addMedicine(e) {
    e.preventDefault();
    setMessage("");

    if (!petId) {
      setMessage("Please add a pet first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API}/medicines`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          petId,
          name,
          dosage,
          frequency,
          time,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(
          data.message || "Could not save medicine"
        );
      }

      setName("");
      setDosage("");
      setFrequency("Once Daily");
      setTime("");
      setNotes("");
      setMessage("Medicine added successfully!");

      await loadMedicines(petId);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleGiven(medicine) {
    try {
      const res = await fetch(
        `${API}/medicines/${medicine._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({
            given: !medicine.given,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Could not update medicine");
      }

      await loadMedicines(petId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteMedicine(id) {
    if (!window.confirm("Delete this medicine?")) {
      return;
    }

    try {
      const res = await fetch(
        `${API}/medicines/${id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!res.ok) {
        throw new Error("Could not delete medicine");
      }

      setMessage("Medicine deleted");
      await loadMedicines(petId);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #d7d0c1",
    background: "white",
    boxSizing: "border-box",
    fontSize: "14px",
    color: "#254537",
  };

  const cardStyle = {
    padding: "22px",
    borderRadius: "15px",
    background: "white",
    marginBottom: "20px",
    boxShadow: "0 3px 12px #00000010",
  };

  const buttonStyle = {
    padding: "11px 18px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontWeight: "bold",
  };

  return (
    <div
      style={{
        background: cream,
        minHeight: "100vh",
        padding: "25px",
        color: green,
      }}
    >
      <div
        style={{
          background: green,
          color: "white",
          padding: "25px",
          borderRadius: "15px",
          marginBottom: "22px",
        }}
      >
        <p style={{ color: gold, margin: 0 }}>
          PETPAL · HEALTH MANAGER
        </p>

        <h1 style={{ marginBottom: "8px" }}>
          Pet Health Manager
        </h1>

        <p style={{ margin: 0 }}>
          Manage medicines and care for your pet.
        </p>
      </div>

      <div style={cardStyle}>
        <h3>Select Your Pet</h3>

        <select
          value={petId}
          onChange={(e) => setPetId(e.target.value)}
          style={inputStyle}
        >
          {pets.length === 0 && (
            <option value="">No pets added yet</option>
          )}

          {pets.map((pet) => (
            <option key={pet._id} value={pet._id}>
              {pet.name}
            </option>
          ))}
        </select>
      </div>
      
{/* Health Manager Navigation Tabs */}
<div className="health-tabs">
  <button
    type="button"
    className={activeTab === "medicines" ? "health-tab active" : "health-tab"}
    onClick={() => setActiveTab("medicines")}
  >
    💊 Medicines
  </button>

  <button
    type="button"
    className={activeTab === "vaccines" ? "health-tab active" : "health-tab"}
    onClick={() => setActiveTab("vaccines")}
  >
    💉 Vaccines
  </button>

  <button
    type="button"
    className={activeTab === "appointments" ? "health-tab active" : "health-tab"}
    onClick={() => setActiveTab("appointments")}
  >
    🩺 Vet Visits
  </button>
</div>


      {activeTab === "medicines" && (
        <>
      <div style={cardStyle}>
        <h2>Add Medicine</h2>

        <form
          onSubmit={addMedicine}
          style={{ display: "grid", gap: "13px" }}
        >
          <input
            type="text"
            placeholder="Medicine name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
            required
          />

          <input
            type="text"
            placeholder="Dosage (e.g. as prescribed)"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            style={inputStyle}
            required
          />

          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            style={inputStyle}
          >
            <option>Once Daily</option>
            <option>Twice Daily</option>
            <option>As Needed</option>
          </select>

          <label>
            Medicine Time
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{ ...inputStyle, marginTop: "6px" }}
            />
          </label>

          <textarea
            placeholder="Additional notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={inputStyle}
            rows="3"
          />

          <button
            type="submit"
            disabled={!petId || loading}
            style={{
              ...buttonStyle,
              background: gold,
              color: green,
            }}
          >
            {loading ? "Saving..." : "+ Add Medicine"}
          </button>
        </form>
      </div>

      {message && (
        <p style={{ fontWeight: "bold" }}>{message}</p>
      )}

      <div style={cardStyle}>
        <h2>Medicine List</h2>

        {medicines.length === 0 ? (
          <p>No medicines added for this pet yet.</p>
        ) : (
          medicines.map((medicine) => (
            <div
              key={medicine._id}
              style={{
                padding: "16px",
                marginBottom: "12px",
                borderRadius: "10px",
                border: "1px solid #e0dbcf",
                background: medicine.given
                  ? "#e8f2e9"
                  : "#fcfaf5",
              }}
            >
              <h3 style={{ marginTop: 0 }}>
                {medicine.name}
              </h3>

              <p>Dosage: {medicine.dosage}</p>
              <p>Frequency: {medicine.frequency}</p>

              {medicine.time && (
                <p>Time: {medicine.time}</p>
              )}

              {medicine.notes && (
                <p>Notes: {medicine.notes}</p>
              )}

              <p>
                Status:{" "}
                <strong>
                  {medicine.given ? "Given" : "Pending"}
                </strong>
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => toggleGiven(medicine)}
                  style={{
                    ...buttonStyle,
                    background: green,
                    color: "white",
                  }}
                >
                  {medicine.given
                    ? "Mark Pending"
                    : "Mark Given"}
                </button>

                <button
                  onClick={() =>
                    deleteMedicine(medicine._id)
                  }
                  style={{
                    ...buttonStyle,
                    background: "#f3d7d7",
                    color: "#922b21",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      
        </>
      )}

      {activeTab === "vaccines" && (
        <VaccinationTracker petId={petId} />
      )}

      {activeTab === "appointments" && (
        <VetAppointments petId={petId} />
      )}
    </div>
  );
}
