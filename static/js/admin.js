
    // ✅ ตรวจสอบว่าผู้ใช้เป็นแอดมินหรือไม่
    const isAdmin = JSON.parse(localStorage.getItem('msd:isAdmin') || 'false');

    if (isAdmin) {
        // หาปุ่มนำทาง (navbar)
        const nav = document.querySelector('nav');

        // ✅ สร้างปุ่ม "แอดมิน"
        const adminLink = document.createElement('a');
        adminLink.href = "/admin"; // ← ไปหน้าแอดมินของคุณ
        adminLink.textContent = "⚙️ แอดมิน";
        adminLink.className = "px-3 py-2 rounded-lg bg-yellow-400 text-blue-950 font-bold hover:bg-yellow-300 transition";

        // ✅ แทรกไว้ท้าย nav
        nav.appendChild(adminLink);
    }
