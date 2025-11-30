
    // ✅ แสดงปุ่มแอดมิน
    const isAdmin = JSON.parse(localStorage.getItem("msd:isAdmin") || "false");
    if (isAdmin) {
        const nav = document.querySelector("nav");
        const adminLink = document.createElement("a");
        adminLink.href = "/admin";
        adminLink.textContent = "⚙️ แอดมิน";
        adminLink.className =
        "px-3 py-2 rounded-lg bg-yellow-400 text-blue-950 font-bold hover:bg-yellow-300 transition";
        nav.appendChild(adminLink);
    }

    const grid = document.getElementById("grid");
    const q = document.getElementById("q");
    let posts = [];

    // ✅ โหลดโพสต์จากเซิร์ฟเวอร์
    async function loadPosts() {
        try {
        const res = await fetch("/api/posts");
        if (!res.ok) throw new Error("โหลดโพสต์ไม่สำเร็จ");
        posts = await res.json();
        render(posts);
        } catch (err) {
        console.error("❌ โหลดโพสต์ล้มเหลว:", err);
        grid.innerHTML =
            `<div class="text-center text-red-500 py-10">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>`;
        }
    }

    // ✅ ฟังก์ชันกำหนดอัตราส่วน
    function aspectFor(layout) {
        if (layout === "banner") return "aspect-[3/1]";
        if (layout === "cover") return "aspect-[4/3]";
        if (layout === "square") return "aspect-square";
        if (layout === "portrait") return "aspect-[3/4]";
        if (layout === "story") return "aspect-[9/16]";
        if (layout === "wide") return "aspect-[5/2]";
        if (layout === "free") return "";
        return "aspect-video";
    }

    // ✅ แสดงโพสต์ทั้งหมด
    function render(list) {
        grid.innerHTML = "";
        if (!list.length) {
        grid.innerHTML = `<div class="text-center text-gray-500 col-span-full mt-10">ไม่มีโพสต์ในระบบ</div>`;
        return;
        }

        list.forEach((p) => {
        const el = document.createElement("a");
        el.href = `/post/${p.id}`;
        el.className =
            "card overflow-hidden block hover:shadow-xl transition bg-white rounded-2xl";

        let imageUrl = "/static/uploads/default.jpg";
        if (p.image) {
        // ถ้า image มีคำว่า "/static/" แปลว่าเป็น URL เต็ม → ใช้ตรง ๆ ได้เลย
        imageUrl = p.image.startsWith("/static/")
            ? p.image
            : `/static/uploads/${p.image}`;
        }


        const aspect = aspectFor(p.layout || "cover");

        const imgPart =
            p.layout === "free"
            ? `
            <div class="bg-gray-100 rounded-t-2xl overflow-hidden">
                <img src="${imageUrl}" class="w-full h-auto object-contain" />
            </div>`
            : `
            <div class="${aspect} bg-gray-100 rounded-t-2xl overflow-hidden">
                <img src="${imageUrl}" class="w-full h-full object-cover" />
            </div>`;

        el.innerHTML = `
            ${imgPart}
            <div class="p-4">
            <div class="inline-block bg-yellow-400 text-blue-950 text-[11px] font-bold px-2 py-1 rounded">
                ${p.layout ? p.layout.toUpperCase() : "POST"}
            </div>
            <div class="font-bold text-blue-950 mt-2">${p.title || "-"}</div>
            <div class="text-sm text-gray-600">
                ${(p.content || "").slice(0, 120)}${
            (p.content || "").length > 120 ? "…" : ""
        }
            </div>
            <div class="text-xs text-gray-500 mt-2">
                โพสต์เมื่อ ${new Date(p.created_at).toLocaleString()}
            </div>
            </div>
        `;
        grid.appendChild(el);
        });
    }

    // ✅ ระบบค้นหา
    q.addEventListener("input", () => {
        const keyword = q.value.toLowerCase();
        render(posts.filter((p) => p.title.toLowerCase().includes(keyword)));
    });

    // ✅ เริ่มโหลดข้อมูล
    loadPosts();
    document.getElementById("y").textContent = new Date().getFullYear();

