// 🧭 ระบบแท็บ: โพสต์ / ศิษย์เก่า / ตารางกิจกรรม
const tabPosts = document.getElementById('tabPosts');
const tabAlumni = document.getElementById('tabAlumni');
const tabEvent = document.getElementById('tabEvent');

const postSection = document.getElementById('postSection');
const alumniSection = document.getElementById('alumniSection');
const eventsSection = document.getElementById('eventsSection');

// เริ่มต้น: แสดงโพสต์ก่อน
postSection.classList.remove('hidden');
alumniSection.classList.add('hidden');
eventsSection.classList.add('hidden');

// เมื่อคลิก "โพสต์"
tabPosts.addEventListener('click', () => {
  postSection.classList.remove('hidden');
  alumniSection.classList.add('hidden');
  eventsSection.classList.add('hidden');

  tabPosts.classList.add('bg-yellow-400', 'text-blue-950');
  tabAlumni.classList.remove('bg-yellow-400', 'text-blue-950');
  tabAlumni.classList.add('bg-white', 'text-blue-950');
  tabEvent.classList.remove('bg-yellow-400', 'text-blue-950');
  tabEvent.classList.add('bg-white', 'text-blue-950');
});

// เมื่อคลิก "ศิษย์เก่า"
tabAlumni.addEventListener('click', () => {
  postSection.classList.add('hidden');
  alumniSection.classList.remove('hidden');
  eventsSection.classList.add('hidden');

  tabAlumni.classList.add('bg-yellow-400', 'text-blue-950');
  tabPosts.classList.remove('bg-yellow-400', 'text-blue-950');
  tabPosts.classList.add('bg-white', 'text-blue-950');
  tabEvent.classList.remove('bg-yellow-400', 'text-blue-950');
  tabEvent.classList.add('bg-white', 'text-blue-950');
});

// เมื่อคลิก "ตารางกิจกรรม"
tabEvent.addEventListener('click', () => {
  postSection.classList.add('hidden');
  alumniSection.classList.add('hidden');
  eventsSection.classList.remove('hidden');

  tabEvent.classList.add('bg-yellow-400', 'text-blue-950');
  tabPosts.classList.remove('bg-yellow-400', 'text-blue-950');
  tabPosts.classList.add('bg-white', 'text-blue-950');
  tabAlumni.classList.remove('bg-yellow-400', 'text-blue-950');
  tabAlumni.classList.add('bg-white', 'text-blue-950');
});

async function loadAdminEvents() {
    const res = await fetch("/get_events");
    const data = await res.json();

    const tbody = document.querySelector("#eventsSection tbody");
    tbody.innerHTML = "";

    data.forEach(e => {
        tbody.innerHTML += `
        <tr>
            <td class="py-3 font-medium">${e.title}</td>
            <td class="py-3">${e.date}</td>
            <td class="py-3 text-xs text-gray-500">${e.folder}</td>
            <td class="py-3 flex justify-center gap-2">
                <button onclick="openEditModal(${e.id}, '${e.title}', '${e.date}', \`${e.desc || ""}\`)"
                    class="px-3 py-1 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">แก้ไข</button>

                <form action="/admin/delete_event/${e.id}" method="POST"
                    onsubmit="return confirm('ต้องการลบกิจกรรมนี้หรือไม่?')">
                    <button class="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700">ลบ</button>
                </form>
            </td>
        </tr>`;
    });
}
