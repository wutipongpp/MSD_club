function revealOnScroll() {
    const reveals = document.querySelectorAll('.reveal');

    for (let el of reveals) {
        const rect = el.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight - 50 && rect.bottom > 50;

        if (isVisible) {
            el.classList.add("active");   // เห็น → โผล่
        } else {
            el.classList.remove("active"); // ไม่เห็น → หาย
        }
    }
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);
