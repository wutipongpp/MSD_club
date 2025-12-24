 const batchGrid = document.getElementById('batchGrid');
        const peopleGrid = document.getElementById('peopleGrid');
        const batchTitle = document.getElementById('batchTitle');
        const q = document.getElementById('q');

        let allBatches = [];
        let allAlumni = [];
        let selectedBatch = null;

        

        async function loadData() {
        try {
            const [batchesRes, alumniRes] = await Promise.all([
            fetch('/api/alumni/batches'),
            fetch('/api/alumni/people')
            ]);
            allBatches = await batchesRes.json();
            allAlumni = await alumniRes.json();
            renderBatches(allBatches);
        } catch (err) {
            console.error('❌ โหลดข้อมูลไม่สำเร็จ:', err);
        }
        }

        function renderBatches(list = allBatches) {
        batchGrid.innerHTML = '';
        if (!list.length) {
            batchGrid.innerHTML = `<div class="col-span-full text-center text-gray-500">ยังไม่มีข้อมูลรุ่น</div>`;
            return;
        }

        list.forEach(year => {
            const count = allAlumni.filter(a => a.batch_year === year).length;
            const card = document.createElement('div');
            card.className = `
            rounded-2xl border border-gray-200 shadow bg-white p-5 hover:shadow-xl cursor-pointer transition-all duration-300
            ${selectedBatch === year ? 'scale-105 ring-4 ring-yellow-400' : ''}
            `;
            card.innerHTML = `
            <div class="aspect-[4/3] bg-gradient-to-br ${selectedBatch===year?'from-yellow-200 to-red-200':'from-red-100 to-yellow-100'} rounded-xl flex items-center justify-center mb-3 transition-all">
                <div class="text-3xl font-bold ${selectedBatch===year?'text-blue-900 text-4xl':'text-red-600'}">${year}</div>
            </div>
            <div class="font-bold text-blue-950">รุ่นปี ${year}</div>
            <div class="text-sm text-gray-500">${count} คน</div>
            `;
            card.addEventListener('click', () => {
            selectedBatch = year;
            renderBatches();
            renderPeople(year);
            document.getElementById('peopleGrid').scrollIntoView({ behavior: 'smooth' });
            });
            batchGrid.appendChild(card);
        });
        }

        function renderPeople(batch) {
        batchTitle.textContent = batch;
        const list = allAlumni.filter(a => a.batch_year === batch);
        peopleGrid.innerHTML = '';

        if (!list.length) {
            peopleGrid.innerHTML = `<div class="col-span-full text-center text-gray-500">ยังไม่มีสมาชิกในรุ่นนี้</div>`;
            return;
        }

        list.forEach(p => {
            const card = document.createElement('div');
            card.className = 'rounded-2xl border border-gray-200 shadow p-4 bg-white hover:shadow-xl transition';
            card.innerHTML = `
            <div class="flex items-center gap-3 cursor-pointer" onclick="viewProfile('${p.student_id || p.id}')">
                <img src="${p.image || '/static/alumni_photos/default.jpg'}"
                    class="w-14 h-14 rounded-full object-cover bg-gray-100">
                <div>
                <div class="font-bold text-blue-950">${p.name}</div>
                <div class="text-sm text-gray-600">${p.student_id || '-'} | ${p.contact || ''}</div>
                </div>
            </div>
            <div class="mt-3 text-sm text-gray-500 italic">“${p.quote || ''}”</div>
            `;
            peopleGrid.appendChild(card);
        });
        }

        q.addEventListener('input', () => {
        const keyword = q.value.trim();
        const filtered = allBatches.filter(y => y.includes(keyword));
        renderBatches(filtered);
        });

        function viewProfile(id) {
        window.location.href = `/alumni/profile/${id}`;
        }

        document.getElementById('y').textContent = new Date().getFullYear();
        loadData();

        const isAdmin = JSON.parse(localStorage.getItem('msd:isAdmin') || 'false');
        if (isAdmin) {
        const nav = document.querySelector('nav');
        const adminLink = document.createElement('a');
        adminLink.href = "/admin";
        adminLink.textContent = "⚙️ แอดมิน";
        adminLink.className = "px-3 py-2 rounded-lg bg-yellow-400 text-blue-950 font-bold hover:bg-yellow-300 transition";
        nav.appendChild(adminLink);
        }