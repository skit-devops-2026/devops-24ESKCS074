
import { useState } from "react";

const breeds = [
  "Other (Enter manually)",
  "Beagle",
  "Belgian Malinois",
  "Bichon Frise",
  "Border Collie",
  "Boxer",
  "Bulldog",
  "Cane Corso",
  "Chihuahua",
  "Chow Chow",
  "Cocker Spaniel",
  "Dachshund",
  "Dalmatian",
  "Doberman",
  "French Bulldog",
  "German Shepherd",
  "Golden Retriever",
  "Great Dane",
  "Husky",
  "Indian Pariah (Indie)",
  "Labrador Retriever",
  "Lhasa Apso",
  "Maltese",
  "Mixed Breed",
  "Pomeranian",
  "Poodle",
  "Pug",
  "Rottweiler",
  "Saint Bernard",
  "Samoyed",
  "Shih Tzu",
  "Spitz",
  "Tibetan Mastiff",
  "Yorkshire Terrier"
];

function MyPets({ pets, savePet, deletePet }) {
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [customBreed, setCustomBreed] = useState("");
  const [age, setAge] = useState("");
  const [photo, setPhoto] = useState("");
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  function clearForm() {
    setName("");
    setBreed("");
    setCustomBreed("");
    setAge("");
    setPhoto("");
    setEditId(null);
  }

  function uploadPhoto(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    if (file.size > 500000) {
      alert("Please select an image smaller than 500 KB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setPhoto(reader.result);
    };

    reader.readAsDataURL(file);
  }

  async function handleSave() {
    const finalBreed =
      breed === "Other (Enter manually)"
        ? customBreed.trim()
        : breed;

    if (!name.trim() || !finalBreed || age === "" ||
        !Number.isFinite(Number(age)) || Number(age) < 0) {
      alert("Please enter valid pet details.");
      return;
    }

    const petData = {
      name: name.trim(),
      breed: finalBreed,
      age: Number(age),
      photo
    };

    setSaving(true);

    try {
      await savePet(petData, editId);
      clearForm();
      alert(editId ? "Pet updated!" : "Pet added!");
    } catch (error) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(pet) {
    setName(pet.name);
    setAge(String(pet.age));
    setPhoto(pet.photo || "");
    setEditId(pet._id);

    if (breeds.includes(pet.breed)) {
      setBreed(pet.breed);
      setCustomBreed("");
    } else {
      setBreed("Other (Enter manually)");
      setCustomBreed(pet.breed);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this pet?")) {
      return;
    }

    try {
      await deletePet(id);

      if (editId === id) {
        clearForm();
      }
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <section id="pets">
      <h2>My Pets 🐾</h2>
      <p>Manage your furry friends in one place.</p>

      <div className="pet-form">
        <input
          placeholder="Pet Name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <select
          value={breed}
          onChange={(e) => setBreed(e.target.value)}
        >
          <option value="">Select Dog Breed *</option>

          {breeds.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        {breed === "Other (Enter manually)" && (
          <input
            placeholder="Enter your dog's breed *"
            value={customBreed}
            onChange={(e) => setCustomBreed(e.target.value)}
          />
        )}

        <input
          type="number"
          min="0"
          step="0.1"
          placeholder="Age in years *"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />

        <div className="photo-upload">
          <label>Pet Photo (Optional)</label>

          <input
            type="file"
            accept="image/*"
            onChange={uploadPhoto}
          />

          {photo && (
            <div>
              <img
                src={photo}
                alt="Pet preview"
                className="pet-photo"
              />

              <button
                type="button"
                onClick={() => setPhoto("")}
              >
                Remove Photo
              </button>
            </div>
          )}
        </div>

        <button onClick={handleSave} disabled={saving}>
          {saving
            ? "Saving..."
            : editId
              ? "Update Pet"
              : "+ Add Pet"}
        </button>

        {editId !== null && (
          <button onClick={clearForm}>
            Cancel
          </button>
        )}
      </div>

      <h2>Registered Pets</h2>

      <div className="pet-list">
        {pets.length === 0 && (
          <p>No pets registered yet. Add your first pet!</p>
        )}

        {pets.map((pet) => (
          <div className="pet-card" key={pet._id}>
            {pet.photo ? (
              <img
                src={pet.photo}
                alt={pet.name}
                className="pet-photo"
              />
            ) : (
              <div className="pet-placeholder">🐶</div>
            )}

            <h3>{pet.name}</h3>
            <p><b>Breed:</b> {pet.breed}</p>
            <p><b>Age:</b> {pet.age} years</p>

            <button onClick={() => handleEdit(pet)}>
              Edit
            </button>

            <button onClick={() => handleDelete(pet._id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MyPets;
