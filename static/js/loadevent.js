
async function loadEventList() {
    const tbody = document.getElementById("eventTableBody");

    try {
        const res = await fetch("/get_events");
        const events = await res.json();

        if (events.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="4" class="py-6 text-gray-400 text-center">
                    ยังไม่มีกิจกรรม
                </td></tr>`;
            return;
        }

        tbody.innerHTML = events.map(e => {
            const start = new Date(e.start_date);
            const end = new Date(e.end_date);
            
            const formatDate = d => d.toLocaleDateString("th-TH", {
                day: "2-digit", month: "short", year: "numeric"
            });
            
            const dateText = start.getTime() === end.getTime()
                ? formatDate(start)
                : `${formatDate(start)} - ${formatDate(end)}`;

            return `
                <tr class="hover:bg-blue-50 transition">
                    <td class="py-3 font-medium">${e.title}</td>
                    <td class="py-3">${dateText}</td>
                    <td class="py-3 text-xs text-gray-500">${e.folder}</td>

                    <td class="py-3 flex justify-center gap-2">
                        <button type="button"
                            onclick='openEditModal(${JSON.stringify(e).replace(/"/g, "&quot;")})'
                            class="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                            ✏ แก้ไข
                        </button>


                        <form method="POST" action="/admin/delete_event/${e.id}"
                            onsubmit="return confirm('⚠ ต้องการลบกิจกรรมนี้จริงหรือไม่?');">
                            <button class="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                🗑 ลบ
                            </button>
                        </form>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `
            <tr><td colspan="4" class="py-6 text-red-500 text-center">
                ❌ โหลดกิจกรรมล้มเหลว
            </td></tr>`;
    }
}

// เรียกตอนเปิดหน้า
document.addEventListener("DOMContentLoaded", loadEventList);
