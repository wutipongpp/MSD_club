// Open / Close menu
        document.getElementById('menuBtn').onclick = () => {
            mobileMenu.style.transform = "translateX(0)";
        };
        document.getElementById('closeMenu').onclick = () => {
            mobileMenu.style.transform = "translateX(100%)";
        };

        // Dropdown logic
        document.querySelectorAll(".dropdownBtn").forEach((btn, index) => {
            btn.onclick = () => {
                const content = btn.nextElementSibling;
                const arrow = btn.querySelector(".arrow");

                const isOpen = content.style.maxHeight && content.style.maxHeight !== "0px";

                if (isOpen) {
                    content.style.maxHeight = "0px";
                    arrow.style.transform = "rotate(0deg)";
                } else {
                    content.style.maxHeight = content.scrollHeight + "px";
                    arrow.style.transform = "rotate(180deg)";
                }
            };
        });