const studentId = window.location.pathname.split('/').pop();

async function loadProfile() {
    try {
        const res = await fetch(`/api/alumni/people/${studentId}`);
        if (!res.ok) throw new Error('ไม่พบข้อมูลศิษย์เก่าคนนี้');
        const person = await res.json();

        const img = document.getElementById('alumniImage');
        const name = document.getElementById('alumniName');
        const sid = document.getElementById('alumniId');
        const batch = document.getElementById('alumniBatch');
        const contactBox = document.getElementById('alumniContact');
        const quote = document.getElementById('alumniQuote');
        const friendsGrid = document.getElementById('friendsGrid');

        // ✅ แสดงข้อมูล
        img.src = person.image || '/static/alumni_photos/default.jpg';
        name.textContent = person.name || '-';
        sid.textContent = person.student_id || '-';
        batch.textContent = person.batch_year || '-';
        quote.textContent = person.quote ? `“${person.quote}”` : '';

        // ✅ ช่องทางติดต่อ
        if (person.contact) {
        contactBox.innerHTML = `
            <div class="flex items-center gap-2 text-blue-900 font-semibold">
            <span>📱</span> ${person.contact}
            </div>`;
        } else {
        contactBox.innerHTML = `<span class="text-gray-500">— ไม่มีข้อมูล —</span>`;
        }

        // ✅ โหลดเพื่อนในรุ่นเดียวกัน
        const friendsRes = await fetch('/api/alumni/people');
        const all = await friendsRes.json();
        const friends = all.filter(a =>
        a.batch_year === person.batch_year && a.student_id !== person.student_id
        );

        if (friends.length) {
        friendsGrid.innerHTML = friends.map(f => `
            <div class="rounded-2xl bg-white p-4 flex items-center gap-3 shadow hover:shadow-lg transition cursor-pointer"
            onclick="window.location.href='/alumni/profile/${f.student_id}'">
            <img src="${f.image || '/static/alumni_photos/default.jpg'}"
                class="w-14 h-14 rounded-full object-cover border">
            <div>
                <div class="font-semibold text-blue-900">${f.name}</div>
                <div class="text-sm text-gray-500">${f.contact || '-'}</div>
            </div>
            </div>`).join('');
        } else {
        friendsGrid.innerHTML = `<div class="col-span-full text-center text-gray-500">ยังไม่มีเพื่อนในรุ่นนี้</div>`;
        }

    } catch (err) {
        console.error(err);
        document.querySelector('main').innerHTML = `
        <div class="text-center text-gray-500 mt-20 text-lg">❌ ${err.message}</div>
        <a href="/alumni" class="mt-3 inline-block bg-blue-600 text-white px-4 py-2 rounded-xl">⬅ กลับ</a>`;
    }
    }

loadProfile();
document.getElementById('y').textContent = new Date().getFullYear();

