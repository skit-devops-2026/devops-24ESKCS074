
import { useEffect, useState } from "react";
import "./VetAppointments.css";

const emptyForm = {
  vetName: "",
  clinic: "",
  date: "",
  time: "",
  reason: ""
};

export default function VetAppointments({ petId }) {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const token = sessionStorage.getItem("petpal_token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + token
  };

  useEffect(() => {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
    setAppointments([]);

    if (!petId) return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(
          `/api/appointments/${petId}`,
          { headers }
        );

        if (!res.ok) {
          throw new Error("Could not load appointments");
        }

        const data = await res.json();

        if (!cancelled) {
          setAppointments(data);
        }
      } catch (error) {
        if (!cancelled) setMessage(error.message);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [petId]);

  async function refresh() {
    const res = await fetch(
      `/api/appointments/${petId}`,
      { headers }
    );

    if (!res.ok) {
      throw new Error("Could not refresh appointments");
    }

    setAppointments(await res.json());
  }

  function updateField(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function saveAppointment(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const url = editingId
        ? `/api/appointments/${editingId}`
        : "/api/appointments";

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers,
        body: JSON.stringify({
          ...form,
          petId
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Could not save");
      }

      setForm(emptyForm);
      setEditingId(null);
      await refresh();

      setMessage("Appointment saved successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  function editAppointment(item) {
    setEditingId(item._id);

    setForm({
      vetName: item.vetName,
      clinic: item.clinic,
      date: item.date,
      time: item.time,
      reason: item.reason
    });

    setMessage("");
  }

  async function updateStatus(id, status) {
    try {
      const res = await fetch(
        `/api/appointments/${id}/status`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status })
        }
      );

      if (!res.ok) {
        throw new Error("Could not update status");
      }

      await refresh();
      setMessage(`Appointment marked ${status}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteAppointment(id) {
    if (!window.confirm("Delete this appointment?")) {
      return;
    }

    try {
      const res = await fetch(
        `/api/appointments/${id}`,
        {
          method: "DELETE",
          headers
        }
      );

      if (!res.ok) {
        throw new Error("Could not delete appointment");
      }

      await refresh();
      setMessage("Appointment deleted");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <section className="vet-section">
      <div className="vet-heading">
        <h2>Vet Appointments</h2>
        <p>
          Schedule veterinary visits and keep a record
          of your pet's appointments.
        </p>
      </div>

      <div className="vet-card">
        <h3>
          {editingId
            ? "Edit Appointment"
            : "Schedule Appointment"}
        </h3>

        <form onSubmit={saveAppointment}>
          <label>
            Veterinarian Name
            <input
              name="vetName"
              value={form.vetName}
              onChange={updateField}
              placeholder="Enter veterinarian name"
              required
            />
          </label>

          <label>
            Clinic Name
            <input
              name="clinic"
              value={form.clinic}
              onChange={updateField}
              placeholder="Enter clinic name"
              required
            />
          </label>

          <label>
            Appointment Date
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Appointment Time
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Reason for Visit
            <textarea
              name="reason"
              value={form.reason}
              onChange={updateField}
              placeholder="e.g. Routine checkup"
              rows="3"
              required
            />
          </label>

          <div className="vet-actions">
            <button
              className="vet-save-btn"
              type="submit"
              disabled={!petId || saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "+ Add Appointment"}
            </button>

            {editingId && (
              <button
                type="button"
                className="vet-cancel-btn"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel Editing
              </button>
            )}
          </div>
        </form>
      </div>

      {message && <p className="vet-message">{message}</p>}

      <div className="vet-card">
        <h3>Appointment History</h3>

        {!petId ? (
          <p>Select a pet first.</p>
        ) : appointments.length === 0 ? (
          <p>No appointments added yet.</p>
        ) : (
          appointments.map((item) => (
            <div className="vet-record" key={item._id}>
              <div className="vet-record-top">
                <h4>{item.clinic}</h4>
                <span className="vet-status">
                  {item.status}
                </span>
              </div>

              <p><strong>Vet:</strong> {item.vetName}</p>
              <p><strong>Date:</strong> {item.date}</p>
              <p><strong>Time:</strong> {item.time}</p>
              <p><strong>Reason:</strong> {item.reason}</p>

              <div className="vet-actions">
                <button
                  onClick={() => editAppointment(item)}
                >
                  Edit
                </button>

                {item.status === "Scheduled" && (
                  <>
                    <button
                      onClick={() =>
                        updateStatus(item._id, "Completed")
                      }
                    >
                      Mark Completed
                    </button>

                    <button
                      onClick={() =>
                        updateStatus(item._id, "Cancelled")
                      }
                    >
                      Cancel Visit
                    </button>
                  </>
                )}

                <button
                  className="vet-delete-btn"
                  onClick={() =>
                    deleteAppointment(item._id)
                  }
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
