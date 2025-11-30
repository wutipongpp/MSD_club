    const API_URL = '/api/posts';
    const ADMIN_PASS = '1234';
    let isAdmin = false;
    let editId = null;
    let uploadedFile = null;

    const el = id => document.getElementById(id);

    // 🖼️ พรีวิวรูป
    el('fileInput').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        uploadedFile = file;
        const reader = new FileReader();
        reader.onload = ev => {
        el('pvImageBox').innerHTML = `<img src="${ev.target.result}" class="object-cover w-full h-full" />`;
        };
        reader.readAsDataURL(file);
    });

    // 📋 พรีวิวข้อความ
    function syncPreview() {
        el('pvTitle').textContent = el('title').value || '(หัวข้อ)';
        el('pvContent').textContent = el('content').value
        ? el('content').value.slice(0, 120) + (el('content').value.length > 120 ? '…' : '')
        : '(เนื้อหาย่อ)';
    }
    ['title', 'content'].forEach(id => el(id).addEventListener('input', syncPreview));

    // 🧾 โหลดโพสต์
    async function loadPosts() {
        const res = await fetch(API_URL);
        const posts = await res.json();
        renderRows(posts);
    }

    // 📊 แสดงตารางโพสต์
    function renderRows(posts) {
        const tbody = el('rows');
        tbody.innerHTML = '';
        if (!posts.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">ยังไม่มีโพสต์</td></tr>`;
        return;
        }
        posts.forEach(p => {
        tbody.innerHTML += `
            <tr class="border-t">
            <td class="p-3">${p.id}</td>
            <td class="p-3 font-semibold text-blue-900">${p.title}</td>
            <td class="p-3">${new Date(p.updated_at).toLocaleString()}</td>
            <td class="p-3 text-right ">
                <button class="btn bg-white border" ${!isAdmin ? 'disabled' : ''} onclick="editPost(${p.id})">แก้ไข</button>
                <button class="btn bg-red-600 text-white" ${!isAdmin ? 'disabled' : ''} onclick="deletePost(${p.id})">ลบ</button>
            </td>
            </tr>`;
        });
    }

    // ➕ เพิ่มหรือแก้ไขโพสต์
    el('saveBtn').onclick = async () => {
        if (!isAdmin) return alert('ต้องเข้าสู่ระบบก่อน');
        const title = el('title').value.trim();
        const content = el('content').value.trim();
        if (!title) return alert('กรุณากรอกหัวข้อ');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        if (uploadedFile) formData.append('image', uploadedFile);

        // ถ้ามี editId → ลบของเดิมก่อน แล้วเพิ่มใหม่ (ง่ายและปลอดภัย)
        if (editId) {
        await fetch(`${API_URL}/${editId}`, { method: 'DELETE' });
        }

        await fetch(API_URL, { method: 'POST', body: formData });
        alert(editId ? '✅ แก้ไขโพสต์แล้ว' : '✅ เพิ่มโพสต์แล้ว');
        resetForm();
        loadPosts();
    };

    // ✏️ แก้ไขโพสต์
    async function editPost(id) {
        const res = await fetch(API_URL);
        const posts = await res.json();
        const p = posts.find(x => x.id === id);
        if (!p) return alert('ไม่พบโพสต์');

        editId = id;
        el('title').value = p.title;
        el('content').value = p.content;
        if (p.image) {
        el('pvImageBox').innerHTML = `<img src="${p.image}" class="object-cover w-full h-full" />`;
        } else {
        el('pvImageBox').innerHTML = '<span class="text-gray-400 text-sm">ไม่มีรูป</span>';
        }
        syncPreview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.editPost = editPost;

    // ❌ ลบโพสต์
    async function deletePost(id) {
        if (!isAdmin) return alert('ต้องเข้าสู่ระบบก่อน');
        if (!confirm('ยืนยันการลบโพสต์นี้?')) return;
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        if (res.ok) {
        alert('🗑️ ลบโพสต์แล้ว');
        loadPosts();
        } else {
        alert('❌ ลบโพสต์ไม่สำเร็จ');
        }
    }
    window.deletePost = deletePost;

    // 🧹 รีเซ็ตฟอร์ม
    function resetForm() {
        editId = null;
        uploadedFile = null;
        el('title').value = '';
        el('content').value = '';
        el('fileInput').value = '';
        el('pvImageBox').innerHTML = '<span class="text-gray-400 text-sm">ไม่มีรูป</span>';
        syncPreview();
    }
    el('resetBtn').onclick = resetForm;

    // 🔐 ระบบล็อกอินแอดมินแบบสมบูรณ์
    el('loginBtn').onclick = () => {
    const p = prompt('ใส่รหัสผ่านแอดมิน', '');
    if (p === ADMIN_PASS) {
        // ✅ เก็บสถานะใน localStorage
        localStorage.setItem('msd:isAdmin', true);
        isAdmin = true;
        alert('เข้าสู่ระบบแล้ว ✅');
        location.reload(); // 🔄 โหลดหน้าใหม่เพื่อรีเฟรช UI ทั้งหมด
    } else {
        alert('รหัสผ่านไม่ถูกต้อง ❌');
    }
    };

    el('logoutBtn').onclick = () => {
    // ❌ เคลียร์สถานะแอดมิน
    localStorage.removeItem('msd:isAdmin');
    isAdmin = false;
    alert('ออกจากระบบแล้ว 👋');
    location.reload(); // 🔄 โหลดหน้าใหม่เพื่อซ่อนปุ่มและป้องกันสิทธิ์ค้าง
    };

    // 🧠 ฟังก์ชันตรวจสอบสถานะเมื่อเปิดหน้า
    function checkAdmin() {
    isAdmin = JSON.parse(localStorage.getItem('msd:isAdmin') || 'false');
    renderAuth();
    }

    // 🎨 ปรับ UI ตามสถานะปัจจุบัน
    function renderAuth() {
    el('loginBtn').classList.toggle('hidden', isAdmin);
    el('logoutBtn').classList.toggle('hidden', !isAdmin);
    el('saveBtn').disabled = !isAdmin;

    // 🔒 ปิดช่องกรอก / ปุ่มแก้ไขเมื่อไม่ได้เป็นแอดมิน
    const inputs = document.querySelectorAll('input, textarea, button');
    inputs.forEach(b => {
        if (b.id !== 'loginBtn' && b.id !== 'logoutBtn') {
        b.disabled = !isAdmin && b.id !== 'saveBtn' ? true : false;
        }
    });
    }

    // 🚀 ตรวจสอบทันทีตอนโหลดหน้า
    checkAdmin();


    // 🧾 โหลดโพสต์ทั้งหมดจากฐานข้อมูล
    async function loadPosts() {
    try {
        const res = await fetch(API_URL, { cache: "no-store" }); // ป้องกัน cache เก่า
        if (!res.ok) throw new Error('ไม่สามารถโหลดโพสต์ได้');
        const posts = await res.json();

        // ถ้าไม่มีโพสต์ในฐานข้อมูลเลย
        if (!Array.isArray(posts) || posts.length === 0) {
        const tbody = el('rows');
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-500">ยังไม่มีโพสต์ในระบบ</td></tr>`;
        return;
        }

        renderRows(posts);
    } catch (err) {
        console.error("❌ โหลดโพสต์ล้มเหลว:", err);
        const tbody = el('rows');
        tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดโพสต์</td></tr>`;
    }
    }


    // 🚀 เริ่มต้น
    loadPosts();
    renderAuth();
    syncPreview();