// ==========================
// 🌟 ตัวแปรหลัก
// ==========================
let alumni = [];
let batches = [];

// ==========================
// 🎨 ฟังก์ชันแสดงรุ่นทั้งหมด
// ==========================
async function renderBatches() {
    const batchList = document.getElementById("batchList");
    batchList.innerHTML = `<div class="text-center text-gray-400 py-10">กำลังโหลด...</div>`;

    try {
        // 🔹 โหลดรุ่นและศิษย์เก่าทั้งหมดจาก API
        const [batchRes, alumniRes] = await Promise.all([
        fetch("/api/alumni/batches"),
        fetch("/api/alumni/people")
        ]);

        batches = await batchRes.json(); // ✅ ไม่มี const
        alumni = await alumniRes.json(); // ✅ ไม่มี const


        batchList.innerHTML = '';

        if (!batches.length) {
        batchList.innerHTML = `<div class="col-span-full text-center text-gray-500">ยังไม่มีรุ่น</div>`;
        return;
        }

        const sorted = [...batches].sort((a, b) => parseInt(b) - parseInt(a));
        sorted.forEach(b => {
        const members = alumni.filter(a => a.batch_year === b);
        const card = document.createElement('div');
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

// ==========================
// 📦 โหลดข้อมูลทั้งหมด
// ==========================
async function initAlumni() {
    try {
        const [res1, res2] = await Promise.all([
        fetch("/api/alumni/people"),
        fetch("/api/alumni/batches")
        ]);

        alumni = await res1.json();
        batches = await res2.json();

        console.log(`✅ โหลดศิษย์เก่า ${alumni.length} คน | รุ่น ${batches.length} รุ่น`);

        // ✅ ต้องอยู่หลังจาก renderBatches ถูกประกาศ
        renderBatches();

    } catch (err) {
        console.error("❌ โหลดข้อมูลไม่สำเร็จ:", err);
        document.getElementById("batchList").innerHTML =
        `<div class="text-center text-red-500 py-10">⚠️ โหลดข้อมูลล้มเหลว</div>`;
    }
    }




// ==========================
// 🚀 เริ่มทำงานหลัง DOM โหลด
// ==========================
document.addEventListener("DOMContentLoaded", initAlumni);




document.addEventListener('DOMContentLoaded', () => {

const isAdmin = JSON.parse(localStorage.getItem('msd:isAdmin') || 'false');
const batchList = document.getElementById('batchList');
const addBatchBtn = document.getElementById('addBatchBtn');
const batchForm = document.getElementById('batchForm');
const batchYear = document.getElementById('batchYear');
const saveBatchBtn = document.getElementById('saveBatchBtn');
const cancelBatchBtn = document.getElementById('cancelBatchBtn');
const q = document.getElementById("q");

// ฟังก์ชันค้นหา batch
    q.addEventListener("input", () => {
    const keyword = q.value.trim();

    // ถ้า input ว่าง → แสดง batch ทั้งหมด
    if (!keyword) return renderBatches();

    // กรอง batches ที่มี keyword ตรงกับปี
    const filtered = batches.filter(b => b.toString().includes(keyword));

    // แสดงผลลัพธ์
    renderBatches(filtered);
    });


    // 🧱 Modal สำหรับเพิ่มสมาชิก
    const memberModal = document.createElement('div');
    memberModal.className = `fixed inset-0 bg-black/60 hidden items-center justify-center z-50`;
    memberModal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg">
        <div class="flex justify-between items-center mb-3">
            <h4 class="text-xl font-bold text-blue-900">➕ เพิ่มศิษย์เก่า</h4>
            <button id="closeMemberForm" class="text-red-500 text-2xl leading-none">&times;</button>
        </div>
        <div class="space-y-3">
            <input id="memBatch" class="w-full px-3 py-2 border rounded-xl" placeholder="รุ่น (เช่น 2020)" />
            <input id="memStudentId" class="w-full px-3 py-2 border rounded-xl" placeholder="รหัสนิสิต" />
            <input id="memName" class="w-full px-3 py-2 border rounded-xl" placeholder="ชื่อเล่น / ชื่อ" />
            <input id="memContact" class="w-full px-3 py-2 border rounded-xl" placeholder="ช่องทางติดต่อ (Line, FB, IG...)" />
            <textarea id="memQuote" class="w-full px-3 py-2 border rounded-xl min-h-[80px]" placeholder="คติสอนใจ"></textarea>
            <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">เลือกรูปภาพ</label>
            <input id="memImage" type="file" accept="image/*" class="w-full border rounded-xl px-3 py-2 bg-white" />
            <img id="memPreview" class="mt-2 w-24 h-24 object-cover rounded-xl hidden" />
            </div>
        </div>
        <div class="flex justify-end gap-3 mt-5">
            <button id="cancelMemberBtn" class="btn bg-gray-200">ยกเลิก</button>
            <button id="saveMemberBtn" class="btn bg-green-600 text-white">บันทึก</button>
        </div>
        </div>`;
    document.body.appendChild(memberModal);

    // ===============================
    // 🔹 โหลดข้อมูลจากเซิร์ฟเวอร์
    // ===============================
    async function loadBatches() {
        const res = await fetch("/api/alumni/batches");
        return await res.json();
    }

    async function loadAlumni() {
        const res = await fetch("/api/alumni/people");
        return await res.json();
    }

    

    async function loadAlumni() {
  try {
    const res = await fetch("/api/alumni/people");
    alumni = await res.json();
    console.log(`โหลดศิษย์เก่าสำเร็จ: ${alumni.length} คน`);
    renderBatches(); // ✅ เรียกหลังจากประกาศแล้ว
    } catch (err) {
        console.error("โหลดศิษย์เก่าล้มเหลว:", err);
    }
}

    // ✨ เปิด/ปิดฟอร์มเพิ่มรุ่น
    addBatchBtn.onclick = () => batchForm.classList.replace('hidden', 'flex');
    cancelBatchBtn.onclick = () => batchForm.classList.replace('flex', 'hidden');

    // ✅ บันทึกรุ่นใหม่
saveBatchBtn.onclick = async () => {
  const y = batchYear.value.trim();
  if (!y) return alert('⚠️ กรุณากรอกรุ่น');

  try {
    const res = await fetch("/api/alumni/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: y })
    });

    const result = await res.json();

    if (result.error) {
      alert("❌ " + result.error);
    } else {
      
      batchYear.value = "";
      batchForm.classList.replace('flex', 'hidden');

      // 🌀 โหลดข้อมูลใหม่ทั้งหมดหลังเพิ่มรุ่น
      await loadAlumni(); // โหลดข้อมูลสมาชิกใหม่ (เพื่ออัปเดตรุ่นล่าสุด)
      await renderBatches(); // รีเฟรชการ์ดรุ่นในหน้า admin

      console.log("✅ รีเฟรชข้อมูลหลังเพิ่มรุ่นเรียบร้อย");
    }
  } catch (err) {
    console.error("❌ เพิ่มรุ่นล้มเหลว:", err);
    alert("เกิดข้อผิดพลาดขณะเพิ่มรุ่น");
  }
};


   // 📋 เปิดฟอร์มเพิ่มสมาชิก
    window.openMemberForm = (batch) => {
    memberModal.classList.remove('hidden');
    memberModal.classList.add('flex');
    document.getElementById('memBatch').value = batch || '';
    };

    // ❌ ปิดฟอร์ม
    const closeMemberModal = () => {
    memberModal.classList.add('hidden');
    memberModal.classList.remove('flex');
    };
    document.getElementById('closeMemberForm').onclick = closeMemberModal;
    document.getElementById('cancelMemberBtn').onclick = closeMemberModal;

    // 📸 พรีวิวรูปภาพ + ปุ่มลบ
    const memImageInput = document.getElementById('memImage');
    const memPreview = document.getElementById('memPreview');

    // สร้าง container สำหรับพรีวิว (เพิ่มปุ่มลบ)
    const previewWrapper = document.createElement('div');
    previewWrapper.className = 'relative inline-block mt-2 w-24 h-24';
    memPreview.parentNode.insertBefore(previewWrapper, memPreview);
    previewWrapper.appendChild(memPreview);

    // เพิ่มปุ่มลบ (ถังขยะ)
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '🗑️';
    removeBtn.className = `
    absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex
    items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition
    `;
    removeBtn.title = 'ลบรูปนี้';
    removeBtn.style.display = 'none';
    previewWrapper.appendChild(removeBtn);

    // เมื่อเลือกไฟล์ → แสดงรูปและปุ่มลบ
    memImageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        memPreview.src = ev.target.result;
        memPreview.classList.remove('hidden');
        removeBtn.style.display = 'flex';
    };
    reader.readAsDataURL(file);
    });

    // คลิกถังขยะ → ลบรูปออก
    removeBtn.addEventListener('click', () => {
    memPreview.src = '';
    memPreview.classList.add('hidden');
    removeBtn.style.display = 'none';
    memImageInput.value = ''; // reset file input
    });


    // ✅ บันทึกสมาชิกใหม่
        document.getElementById("saveMemberBtn").onclick = async () => {
            const file = document.getElementById("memImage").files[0];
            const data = {
                batch: document.getElementById("memBatch").value.trim(),
                student_id: document.getElementById("memStudentId").value.trim(),
                name: document.getElementById("memName").value.trim(),
                contact: document.getElementById("memContact").value.trim(),
                quote: document.getElementById("memQuote").value.trim(),
                image: "",
            };

            if (!data.name || !data.batch) {
                alert("⚠️ กรุณากรอก \"รุ่น\" และ \"ชื่อ\" ให้ครบ");
                return;
            }

            try {
                // 📤 อัปโหลดรูป (ถ้ามี)
                if (file) {
                const formData = new FormData();
                formData.append("image", file);
                const upRes = await fetch("/upload_alumni", { method: "POST", body: formData });
                const upData = await upRes.json();
                if (!upRes.ok || !upData.url) {
                    alert("❌ อัปโหลดรูปไม่สำเร็จ");
                    return;
                }
                data.image = upData.url;
                }

                // 🧩 บันทึกข้อมูลลงฐานข้อมูล
                const res = await fetch("/api/alumni/people", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                });

                if (!res.ok) throw new Error("เพิ่มข้อมูลล้มเหลว");

                
                closeMemberModal();

                // 🌀 โหลดข้อมูลใหม่ทั้งหมดหลังเพิ่ม
                await loadAlumni();
                await renderBatches();

                // 🔁 ถ้ามี viewMembers ให้รีเฟรชรุ่นนั้น
                if (data.batch) viewMembers(data.batch);

            } catch (err) {
                console.error("❌ เกิดข้อผิดพลาด:", err);
                alert("เกิดข้อผิดพลาดขณะบันทึกข้อมูล");
            }
};


   // 🗑️ ลบรุ่น (เวอร์ชันเสถียร)
window.deleteBatch = async (batch) => {
  if (!confirm(`ต้องการลบรุ่น ${batch} และสมาชิกทั้งหมดหรือไม่?`)) return;

  try {
    // 🧩 1) โหลดข้อมูลศิษย์เก่าทั้งหมดใหม่ก่อน
    const res = await fetch("/api/alumni/people");
    const allPeople = await res.json();

    // 🔹 เลือกเฉพาะคนในรุ่นนั้น
    const members = allPeople.filter(p => p.batch_year === batch);

    // 🧹 2) ลบรูปของสมาชิกทุกคน
    for (const m of members) {
      if (m.image && m.image.startsWith("/static/alumni_photos/")) {
        await fetch("/delete_alumni_image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: m.image }),
        });
      }
    }

    // 🔥 3) ลบสมาชิกทุกคนในรุ่นออกจากฐานข้อมูล
    for (const m of members) {
      await fetch(`/api/alumni/people/${m.id}`, { method: "DELETE" });
    }

    // 📦 4) ลบรุ่นออกจากตาราง batch
    const delBatch = await fetch(`/api/alumni/batches`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: batch }),
    });

    if (!delBatch.ok) throw new Error("ไม่สามารถลบรุ่นได้");

    // ✅ แจ้งเตือน
    alert(`✅ ลบรุ่น ${batch} เรียบร้อยแล้ว`);

    // 🔁 5) โหลดข้อมูลใหม่ทั้งหมดจาก server
    const [newAlumni, newBatches] = await Promise.all([
      fetch("/api/alumni/people").then(r => r.json()),
      fetch("/api/alumni/batches").then(r => r.json()),
    ]);

    // อัปเดตตัวแปรหลัก
    alumni = newAlumni;
    batches = newBatches;

    // 🔄 6) เรียก render ใหม่ทั้งหมด
    await renderBatches();

    // เคลียร์รายชื่อสมาชิกในรุ่นที่เพิ่งลบ (ถ้ามี)
    const peopleGrid = document.getElementById("peopleGrid");
    if (peopleGrid) peopleGrid.innerHTML = "";

    console.log("✅ อัปเดตรุ่นและศิษย์เก่าหลังลบเรียบร้อย");

  } catch (err) {
    console.error("❌ ลบรุ่นล้มเหลว:", err);
    alert("❌ เกิดข้อผิดพลาดขณะลบรุ่น");
  }
};




    // 🗑️ ลบสมาชิก
    window.deleteMember = async (batch, index) => {
    const list = alumni.filter(a => a.batch_year === batch);
    const member = list[index];
    if (!member) return alert("❌ ไม่พบข้อมูลสมาชิกในรุ่นนี้");

    if (!confirm(`ต้องการลบ "${member.name}" ใช่หรือไม่?`)) return;

    try {
        const res = await fetch(`/api/alumni/people/${member.id}`, { method: "DELETE" });
        const result = await res.json();

        if (!res.ok) throw new Error(result.error || "ลบข้อมูลไม่สำเร็จ");

        alert(`✅ ลบ "${member.name}" เรียบร้อย`);

        // 🔁 โหลดข้อมูลใหม่จากเซิร์ฟเวอร์ (ไม่ใช้ cache เดิม)
        alumni = await (await fetch("/api/alumni/people")).json();
        renderBatches();
        viewMembers(batch);

    } catch (err) {
        console.error("❌ ลบศิษย์เก่าล้มเหลว:", err);
        alert("เกิดข้อผิดพลาดขณะลบข้อมูล");
    }
};




    

        // 👀 ดูสมาชิกในรุ่น — ดึงจากเซิร์ฟเวอร์
        window.viewMembers = (batch) => {
        try {
            const list = alumni.filter(a => a.batch_year === batch);
            const peopleGrid = document.getElementById("peopleGrid");
            const batchTitle = document.getElementById("batchTitle");

            batchTitle.textContent = batch;
            peopleGrid.innerHTML = "";

            if (!list.length) {
                peopleGrid.innerHTML =
                    `<div class="text-center text-gray-500 py-6">ยังไม่มีสมาชิกในรุ่นนี้</div>`;
                return;
            }

            peopleGrid.innerHTML = `
                <div class="grid md:grid-cols-2 gap-6 mt-6">
                    ${list.map((m, i) => `
                        <div class="flex items-center justify-between bg-white rounded-2xl shadow p-4 hover:shadow-lg transition">
                            <div class="flex items-center gap-4">
                                <img src="${m.image || '/static/alumni_photos/default.jpg'}"
                                    onerror="this.src='/static/picture/default.jpg';"
                                    class="w-14 h-14 rounded-full object-cover border border-gray-200 bg-gray-100">
                                <div>
                                    <div class="font-bold text-blue-950">${m.name || '-'}</div>
                                    <div class="text-sm text-gray-600">รหัส: ${m.student_id || '-'}</div>
                                    <div class="text-sm text-gray-500">${m.contact || '-'}</div>
                                </div>
                            </div>
                            <div class="flex gap-2">
                                <button onclick="editMember('${batch}', ${i})"
                                    class="px-3 py-1 rounded-lg bg-white border text-blue-900 hover:bg-blue-50">แก้ไข</button>
                                <button onclick="deleteMember('${batch}', ${i})"
                                    class="px-3 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700">ลบ</button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
            peopleGrid.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
            console.error(err);
        }

    };

    // ✏️ ฟังก์ชันแก้ไขข้อมูลศิษย์เก่า
    window.editMember = async (batch, index) => {
    try {
        // ดึงข้อมูลทั้งหมดจากเซิร์ฟเวอร์
        const res = await fetch("/api/alumni/people");
        const people = await res.json();

        // หาเฉพาะรุ่นนั้น และ index ตรงตามปุ่ม
        const list = people.filter(p => p.batch_year === batch);
        const m = list[index];
        if (!m) return alert("❌ ไม่พบข้อมูลสมาชิก");

        // ─────────────── Modal ───────────────
        const modal = document.createElement("div");
        modal.className = `
        fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fadeIn
        `;
        modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg relative">
            <div class="flex justify-between items-center mb-3">
            <h4 class="text-xl font-bold text-blue-900">✏️ แก้ไขข้อมูลศิษย์เก่า</h4>
            <button id="closeEditForm" class="text-red-500 text-2xl leading-none">&times;</button>
            </div>
            <div class="space-y-3">
            <input id="editBatch" value="${m.batch_year}" class="w-full px-3 py-2 border rounded-xl" placeholder="รุ่น" disabled />
            <input id="editStudentId" value="${m.student_id || ''}" class="w-full px-3 py-2 border rounded-xl" placeholder="รหัสนิสิต" />
            <input id="editName" value="${m.name || ''}" class="w-full px-3 py-2 border rounded-xl" placeholder="ชื่อเล่น / ชื่อ" />
            <input id="editContact" value="${m.contact || ''}" class="w-full px-3 py-2 border rounded-xl" placeholder="ช่องทางติดต่อ" />
            <textarea id="editQuote" class="w-full px-3 py-2 border rounded-xl min-h-[80px]" placeholder="คติสอนใจ">${m.quote || ''}</textarea>
            <div class="relative group">
                <label class="block text-sm font-medium text-gray-600 mb-1">เลือกรูปภาพ</label>
                <input id="editImage" type="file" accept="image/*" class="w-full border rounded-xl px-3 py-2 bg-white" />
                <div class="relative inline-block mt-2 w-24 h-24 group">
                <img id="editPreview" src="${m.image || ''}" class="w-24 h-24 object-cover rounded-xl ${m.image ? '' : 'hidden'} group-hover:brightness-75" />
                <button id="removeEditImage" title="ลบรูป" class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition">🗑️</button>
                </div>
            </div>
            </div>
            <div class="flex justify-end gap-3 mt-5">
            <button id="cancelEditBtn" class="btn bg-gray-200">ยกเลิก</button>
            <button id="saveEditBtn" class="btn bg-green-600 text-white">บันทึก</button>
            </div>
        </div>
        `;
        document.body.appendChild(modal);

        // ─────────────── ปุ่มลบรูป ───────────────
        const editPreview = modal.querySelector("#editPreview");
        const editImage = modal.querySelector("#editImage");
        const removeBtn = modal.querySelector("#removeEditImage");

        removeBtn.addEventListener("click", () => {
        editPreview.src = "";
        editPreview.classList.add("hidden");
        editImage.value = "";
        });

        // ─────────────── Preview รูปใหม่ ───────────────
        editImage.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            editPreview.src = ev.target.result;
            editPreview.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
        });

        // ─────────────── ปิด Modal ───────────────
        modal.querySelector("#closeEditForm").onclick =
        modal.querySelector("#cancelEditBtn").onclick = () => modal.remove();

        // ─────────────── บันทึกการแก้ไข ───────────────
        modal.querySelector("#saveEditBtn").onclick = async () => {
        const updated = {
            student_id: modal.querySelector("#editStudentId").value.trim(),
            name: modal.querySelector("#editName").value.trim(),
            contact: modal.querySelector("#editContact").value.trim(),
            quote: modal.querySelector("#editQuote").value.trim(),
            image: editPreview.src || "", // ใช้รูปใหม่หรือค่าว่าง
        };

        if (!updated.name) return alert("กรุณากรอกชื่อ");

        // 🔹 ถ้ามีรูปใหม่ → อัปโหลดก่อน
        if (editImage.files.length) {
            const formData = new FormData();
            formData.append("image", editImage.files[0]);
            const uploadRes = await fetch("/upload_alumni", { method: "POST", body: formData });
            const uploadData = await uploadRes.json();
            if (uploadData.url) updated.image = uploadData.url;
        }

        // 🔹 ส่งข้อมูลไปอัปเดตในฐานข้อมูล
        const res = await fetch(`/api/alumni/people/${m.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updated)
        });

        if (res.ok) {
            alert("✅ แก้ไขข้อมูลเรียบร้อย");
            modal.remove();
            viewMembers(batch); // โหลดข้อมูลใหม่
        } else {
            alert("❌ เกิดข้อผิดพลาดขณะบันทึกข้อมูล");
        }
        };

    } catch (err) {
        console.error(err);
        alert("❌ โหลดข้อมูลไม่สำเร็จ");
    }
    };
// ✅ แสดงปุ่ม “เพิ่มรุ่น” เฉพาะแอดมิน
if (isAdmin) addBatchBtn.classList.remove("hidden");

// ✅ เริ่มต้นโหลดข้อมูลหลัก (หลัง DOM โหลดเสร็จ)
initAlumni();  // <-- เรียกที่นี่เท่านั้น

    });

