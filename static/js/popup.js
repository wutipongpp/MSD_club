document.addEventListener("DOMContentLoaded", () => {

    const popup = document.getElementById("promoPopup");
    const closeBtn = document.querySelector(".close-btn");
    const slider = document.getElementById("popupSlider");
    const prevBtn = document.getElementById("popupPrev");
    const nextBtn = document.getElementById("popupNext");

    let currentIndex = 0;
    const slides = slider.querySelectorAll("a");
    const total = slides.length;

    /* จุดด้านล่าง */
    const dotsContainer = document.createElement("div");
    dotsContainer.className = "dots";
    popup.querySelector(".popup-content").appendChild(dotsContainer);

    slides.forEach((_, i) => {
        const dot = document.createElement("span");
        if (i === 0) dot.classList.add("active");
        dotsContainer.appendChild(dot);
    });

    /* show slide */
    function showSlide(index) {
        if (index < 0) index = total - 1;
        if (index >= total) index = 0;

        slider.style.transform = `translateX(-${index * 100}%)`;
        currentIndex = index;

        dotsContainer.querySelectorAll("span").forEach((d, i) => {
            d.classList.toggle("active", i === currentIndex);
        });
    }

    prevBtn.onclick = () => showSlide(currentIndex - 1);
    nextBtn.onclick = () => showSlide(currentIndex + 1);

    dotsContainer.querySelectorAll("span").forEach((dot, i) => {
        dot.onclick = () => showSlide(i);
    });

    /* ============ AUTO SLIDE ============ */
    let autoSlide = setInterval(() => {
        showSlide(currentIndex + 1);
    }, 4500);

    function stopSlide() {
        clearInterval(autoSlide);
    }

    function startSlide() {
        autoSlide = setInterval(() => {
            showSlide(currentIndex + 1);
        }, 4500);
    }

    /* ====== หยุดเมื่อ hover (คอม) ====== */
    popup.addEventListener("mouseenter", stopSlide);
    popup.addEventListener("mouseleave", startSlide);

    /* ====== TOUCH + SWIPE (มือถือ) ====== */
    let startX = 0;
    let endX = 0;

    popup.addEventListener("touchstart", (e) => {
        stopSlide();  
        startX = e.touches[0].clientX;
    });

    popup.addEventListener("touchmove", (e) => {
        endX = e.touches[0].clientX;
    });

    popup.addEventListener("touchend", () => {
        let diff = endX - startX;

        if (diff < -50) {
            // ปัดซ้าย → ถัดไป
            showSlide(currentIndex + 1);
        } else if (diff > 50) {
            // ปัดขวา → ก่อนหน้า
            showSlide(currentIndex - 1);
        }

        startSlide();  // กลับมาเลื่อนต่อ
    });

    popup.addEventListener("touchcancel", startSlide);


    /* ปิด popup */
    closeBtn.onclick = () => popup.classList.remove("active");

    popup.onclick = e => {
        if (e.target === popup) popup.classList.remove("active");
    };

    /* เปิด popup หลังโหลดหน้าเว็บ */
    setTimeout(() => popup.classList.add("active"), 800);

});
