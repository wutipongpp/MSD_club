// ดึง element
const q = document.getElementById('q');
const batchGrid = document.getElementById('batchList');

let allBatches = [];  // เก็บ batch จาก API
let allAlumni = [];   // เก็บ alumni จาก API

// ฟังก์ชัน render batch cards
function renderBatches(list = allBatches) {
    batchGrid.innerHTML = ''; // ล้างก่อน render
    if (!list.length) {
        batchGrid.innerHTML = `<div class="col-span-full text-center text-gray-500">ยังไม่มีข้อมูลรุ่น</div>`;
        return;
    }

    list.forEach(year => {
        const count = allAlumni.filter(a => a.batch_year === year).length;
        const card = document.createElement('div');
        card.className = `
            rounded-2xl border border-gray-200 shadow bg-white p-5 hover:shadow-xl cursor-pointer transition-all duration-300
        `;
        card.innerHTML = `
            <div class="bg-gradient-to-br from-red-100 to-yellow-100 rounded-xl flex items-center justify-center mb-3 w-full h-40">
                <div class="text-3xl font-bold text-red-600">${year}</div>
            </div>
            <div class="font-bold text-blue-950">รุ่นปี ${year}</div>
            <div class="text-sm text-gray-500">${count} คน</div>
        `;
        batchGrid.appendChild(card);
    });
}

// ฟังก์ชันค้นหา batch
q.addEventListener('input', () => {
    const keyword = q.value.trim(); // ดึงข้อความที่พิมพ์
    if (!keyword) {
        renderBatches(allBatches); // ถ้า input ว่าง → render ทั้งหมด
        return;
    }
    // filter batch ที่ตรงกับ keyword
    const filtered = allBatches.filter(year => year.toString().includes(keyword));
    renderBatches(filtered);
});

// ตัวอย่างโหลดข้อมูล (สมมติ API)
async function renderBatches(batchArray = batches) {
  const batchList = document.getElementById("batchList");
  batchList.innerHTML = `<div class="text-center text-gray-400 py-10">กำลังโหลด...</div>`;

  try {
    const sorted = [...batchArray].sort((a, b) => parseInt(b) - parseInt(a));

    batchList.innerHTML = "";
    if (!sorted.length) {
      batchList.innerHTML = `<div class="col-span-full text-center text-gray-500">ยังไม่มีรุ่น</div>`;
      return;
    }

    sorted.forEach(b => {
      const members = alumni.filter(a => a.batch_year === b);
      const card = document.createElement("div");
      card.className = `
        rounded-2xl border border-gray-200 shadow bg-white p-5 hover:shadow-lg transition relative
      `;
      card.innerHTML = `
        <div class="aspect-[4/3] bg-gradient-to-br from-red-100 to-yellow-100 rounded-xl flex items-center justify-center mb-3">
          <div class="text-3xl font-bold text-red-600">${b}</div>
        </div>
        <div class="font-bold text-blue-950 mb-1">รุ่นปี ${b}</div>
        <div class="text-sm text-gray-600 mb-3">${members.length} สมาชิก</div>
        <div class="flex gap-2">
          <button onclick="openMemberForm('${b}')" class="flex-1 bg-blue-600 text-white rounded-xl py-2 hover:bg-blue-700">เพิ่มสมาชิก</button>
          <button onclick="viewMembers('${b}')" class="flex-1 bg-yellow-400 text-blue-950 rounded-xl py-2 hover:bg-yellow-300">ดูสมาชิก</button>
        </div>
        <button onclick="deleteBatch('${b}')" class="absolute top-2 right-2 text-red-500 hover:text-red-700" title="ลบรุ่น">🗑️</button>
      `;
      batchList.appendChild(card);
    });
  } catch (err) {
    console.error("❌ renderBatches ล้มเหลว:", err);
    batchList.innerHTML = `<div class="text-red-500 text-center py-10">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>`;
  }
}

// โหลดข้อมูลตอนเปิดเพจ
loadData();
