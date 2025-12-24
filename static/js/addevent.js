// -----------------------------------------------------
// Add Modal
// -----------------------------------------------------
function openAddPopup() {
    const modal = document.getElementById("eventModal");
    if (modal) modal.classList.remove("hidden");
}

function closeEventModal() {
    const modal = document.getElementById("eventModal");
    if (modal) modal.classList.add("hidden");
}

// -----------------------------------------------------
// DOM READY
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    // ---------------- Color picker: ADD ----------------
    const addColorInput = document.getElementById("eventColorInput");
    const addColorChoices = document.querySelectorAll(".color-choice");

    if (addColorInput && addColorChoices.length) {
        addColorChoices.forEach(item => {
            item.addEventListener("click", () => {
                const selectedColor = item.dataset.color;
                addColorInput.value = selectedColor;

                addColorChoices.forEach(c => c.classList.remove("selected"));
                item.classList.add("selected");
            });
        });
    }

    // ---------------- Color picker: EDIT ---------------
    const editColorInput = document.getElementById("editColorInput");
    const editColorChoices = document.querySelectorAll(".edit-color-choice");

    if (editColorInput && editColorChoices.length) {
        editColorChoices.forEach(item => {
            item.addEventListener("click", () => {
                const selectedColor = item.dataset.color;
                editColorInput.value = selectedColor;

                editColorChoices.forEach(c => c.classList.remove("selected"));
                item.classList.add("selected");
            });
        });

        editColorInput.addEventListener("input", () => {
            editColorChoices.forEach(c => c.classList.remove("selected"));
        });
    }

    // ---------------- Submit EDIT form -----------------
    const form = document.getElementById("editEventForm");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const id = document.getElementById("editEventId").value;

            const data = {
                title:      document.getElementById("editTitle").value,
                start_date: document.getElementById("editStartDate").value,
                end_date:   document.getElementById("editEndDate").value,
                desc:       document.getElementById("editDesc").value,
                color:      document.getElementById("editColorInput").value
            };

            await fetch(`/admin/edit_event/${id}`, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(data)
            });

            closeEditModal();
            location.reload();
        });
    }
});

// -----------------------------------------------------
// Edit Modal (ใช้ฟังก์ชันเดียวเท่านี้พอ)
// -----------------------------------------------------
function openEditModal(ev) {
    const m = document.getElementById("editEventModal");
    if (!m) return;

    // console.log(ev); // เปิดมาดูค่าก็ได้ถ้าอยากเช็ค

    document.getElementById("editEventId").value      = ev.id;
    document.getElementById("editTitle").value        = ev.title;
    document.getElementById("editStartDate").value    = ev.start_date;
    document.getElementById("editEndDate").value      = ev.end_date;
    document.getElementById("editDesc").value         = ev.desc || "";

    const color = ev.color || "#f97316";
    const editColorInput = document.getElementById("editColorInput");
    if (editColorInput) editColorInput.value = color;

    const editColorChoices = document.querySelectorAll(".edit-color-choice");
    editColorChoices.forEach(c => {
        c.classList.remove("selected");
        if (c.dataset.color.toLowerCase() === color.toLowerCase()) {
            c.classList.add("selected");
        }
    });

    m.classList.remove("hidden");
}

function closeEditModal() {
    const m = document.getElementById("editEventModal");
    if (m) m.classList.add("hidden");
}
