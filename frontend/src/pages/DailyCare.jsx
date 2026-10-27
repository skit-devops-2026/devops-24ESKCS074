
import { useState, useEffect } from "react";

const API = "http://localhost:5000/api/care";

const emptyCare = {
  feeding: false,
  walking: false,
  grooming: false,
  customTasks: []
};

function DailyCare({ pets }) {
  const [petId, setPetId] = useState("");
  const [care, setCare] = useState(emptyCare);
  const [newTask, setNewTask] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Today's local date
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  // Select the first pet if needed
  useEffect(() => {
    if (!pets.some((pet) => pet._id === petId)) {
      setPetId(pets[0]?._id || "");
    }
  }, [pets, petId]);

  // Load daily care from MongoDB
  useEffect(() => {
    if (!petId) return;

    const controller = new AbortController();

    async function loadCare() {
      setLoading(true);
      setCare({ ...emptyCare, customTasks: [] });

      try {
        const token = sessionStorage.getItem("petpal_token");

        const response = await fetch(
          `${API}/${petId}?date=${today}`,
          {
            headers: {
              Authorization: "Bearer " + token
            },
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load care");
        }

        if (!controller.signal.aborted) {
          setCare({
            feeding: data.feeding,
            walking: data.walking,
            grooming: data.grooming,
            customTasks: data.customTasks || []
          });
        }

      } catch (error) {
        if (error.name !== "AbortError") {
          alert(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCare();

    return () => controller.abort();
  }, [petId, today]);

  // Save updated care to MongoDB
  async function saveCare(updatedCare) {
    if (!petId || loading || saving) return false;

    const currentPetId = petId;
    setSaving(true);

    try {
      const token = sessionStorage.getItem("petpal_token");

      const response = await fetch(`${API}/${currentPetId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          date: today,
          ...updatedCare
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save care");
      }

      if (currentPetId === petId) {
        setCare({
          feeding: data.feeding,
          walking: data.walking,
          grooming: data.grooming,
          customTasks: data.customTasks || []
        });
      }

      return true;

    } catch (error) {
      alert(error.message);
      return false;
    } finally {
      setSaving(false);
    }
  }

  // Mark a default task done or undo
  function toggleTask(task) {
    saveCare({
      ...care,
      [task]: !care[task]
    });
  }

  // Add a new custom task
  async function addTask() {
    const name = newTask.trim();

    if (!name) {
      alert("Please enter an activity name");
      return;
    }

    const existingNames = [
      "Feeding",
      "Walking",
      "Grooming",
      ...care.customTasks.map((task) => task.name)
    ];

    if (existingNames.some(
      (item) => item.toLowerCase() === name.toLowerCase()
    )) {
      alert("This activity already exists");
      return;
    }

    if (name.length > 100 || care.customTasks.length >= 30) {
      alert("Maximum activity limit reached");
      return;
    }

    const success = await saveCare({
      ...care,
      customTasks: [
        ...care.customTasks,
        { name, done: false }
      ]
    });

    if (success) setNewTask("");
  }

  // Mark a custom task done or undo
  function toggleCustom(index) {
    const updatedTasks = care.customTasks.map((task, i) =>
      i === index
        ? { name: task.name, done: !task.done }
        : { name: task.name, done: task.done }
    );

    saveCare({
      ...care,
      customTasks: updatedTasks
    });
  }

  // Delete a custom task
  function deleteTask(index) {
    const updatedTasks = care.customTasks.filter(
      (_, i) => i !== index
    );

    saveCare({
      ...care,
      customTasks: updatedTasks
    });
  }

  // Mark everything done or reset
  function markAll(done) {
    saveCare({
      feeding: done,
      walking: done,
      grooming: done,
      customTasks: care.customTasks.map((task) => ({
        name: task.name,
        done
      }))
    });
  }

  // Calculate progress
  const completed =
    Number(care.feeding) +
    Number(care.walking) +
    Number(care.grooming) +
    care.customTasks.filter((task) => task.done).length;

  const total = 3 + care.customTasks.length;
  const percentage = Math.round((completed / total) * 100);

  const selectedPet = pets.find((pet) => pet._id === petId);

  if (pets.length === 0) {
    return (
      <section className="care-page">
        <h2>Daily Care</h2>
        <p>Please add a pet first from My Pets.</p>
      </section>
    );
  }

  return (
    <section className="care-page">
      <div className="care-top">
        <div className="care-hero">
          <p>DAILY CARE · TODAY</p>

          <h1>
            Let's take care of{" "}
            <span>{selectedPet?.name}</span> today!
          </h1>

          <p>
            Track feeding, walking, grooming
            and your own activities.
          </p>

          <label htmlFor="carePet">Select Pet</label>

          <select
            id="carePet"
            value={petId}
            disabled={saving}
            onChange={(e) => {
              setPetId(e.target.value);
              setNewTask("");
            }}
          >
            {pets.map((pet) => (
              <option key={pet._id} value={pet._id}>
                {pet.name}
              </option>
            ))}
          </select>

          <div className="care-actions">
            <button
              disabled={saving || loading}
              onClick={() => markAll(true)}
            >
              ✓ Mark Everything Done
            </button>

            <button
              disabled={saving || loading}
              onClick={() => markAll(false)}
            >
              Reset Today
            </button>
          </div>
        </div>

        <div className="care-progress">
          <h2>Today's Paw Trail 🐾</h2>

          <h1>{percentage}%</h1>

          <p>
            {completed} of {total} activities completed
          </p>

          <div className="progress-bar">
            <div style={{ width: percentage + "%" }} />
          </div>
        </div>
      </div>

      <h2>Today's Care</h2>

      {loading ? (
        <p>Loading activities...</p>
      ) : (
        <>
          <div className="care-cards">
            <div className="care-card">
              <h2>🍖 Feeding</h2>
              <p>
                {care.feeding ? "Completed today" : "Pending"}
              </p>

              <button
                disabled={saving}
                onClick={() => toggleTask("feeding")}
              >
                {care.feeding ? "✓ Completed (Undo)" : "Mark Done"}
              </button>
            </div>

            <div className="care-card">
              <h2>🚶 Walking</h2>
              <p>
                {care.walking ? "Completed today" : "Pending"}
              </p>

              <button
                disabled={saving}
                onClick={() => toggleTask("walking")}
              >
                {care.walking ? "✓ Completed (Undo)" : "Mark Done"}
              </button>
            </div>

            <div className="care-card">
              <h2>🧼 Grooming</h2>
              <p>
                {care.grooming ? "Completed today" : "Pending"}
              </p>

              <button
                disabled={saving}
                onClick={() => toggleTask("grooming")}
              >
                {care.grooming ? "✓ Completed (Undo)" : "Mark Done"}
              </button>
            </div>
          </div>

          <h2>My Custom Activities</h2>

          <div className="pet-form">
            <input
              placeholder="e.g. Training, Playtime, Ear Cleaning"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
            />

            <button
              disabled={saving}
              onClick={addTask}
            >
              + Add Activity
            </button>
          </div>

          {care.customTasks.length === 0 && (
            <p>No custom activities yet. Add one above!</p>
          )}

          <div className="care-cards">
            {care.customTasks.map((task, index) => (
              <div
                className="care-card"
                key={task._id || index}
              >
                <h2>🐾 {task.name}</h2>

                <p>
                  {task.done ? "Completed today" : "Pending"}
                </p>

                <button
                  disabled={saving}
                  onClick={() => toggleCustom(index)}
                >
                  {task.done ? "✓ Completed (Undo)" : "Mark Done"}
                </button>

                <button
                  disabled={saving}
                  onClick={() => deleteTask(index)}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export default DailyCare;
