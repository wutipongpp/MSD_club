const calendarEl = document.getElementById("calendar");
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth();
const EVENTS_API = "/get_events";

let eventsCache = [];

// โหลด events ครั้งเดียว
async function loadEvents() {
    if (eventsCache.length) return eventsCache;
    const res = await fetch(EVENTS_API);
    eventsCache = await res.json();
    return eventsCache;
}

function toDateKey(value) {
    if (value instanceof Date) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    // กรณีเป็น string เช่น "2025-02-03" หรือ "2025-02-03T00:00:00"
    return String(value).slice(0, 10);
}

function normalizeDate(d) {
    return new Date(toDateKey(d) + "T00:00:00");
}


async function renderCalendar() {
    const allEvents = await loadEvents();
    console.log(allEvents); 
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    const monthName = firstDay.toLocaleString("th-TH", { month: "long" });
    const yearBE = currentYear + 543;

    let html = `
      <div class="flex justify-between items-center mb-4">
        <button id="prevMonth" 
            class="p-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 focus:outline-none active:scale-95">
            <span class="text-lg font-bold"
            style="font-weight: bolder;">←</span>
        </button>
        
        <h2 class="text-xl font-extrabold text-gray-800 tracking-tight">
            <span class="text-blue-600 transition duration-300 ease-in-out"
                    style="font-weight: bolder;">${monthName}</span>
            <span class="text-gray-500 font-medium ml-1 transition duration-300 ease-in-out"
                    style="font-weight: bolder;">${yearBE}</span>
        </h2>
        
        <button id="nextMonth" 
            class="p-2 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all duration-200 focus:outline-none active:scale-95">
            <span class="text-lg font-bold"
            style="font-weight: bolder;">→</span>
        </button>
    </div>
    
    <div style="position: relative;">
        <table class="w-full text-center text-sm border-separate border-spacing-0 border border-gray-300 rounded-lg overflow-hidden">
            <thead>
                <tr class="font-semibold tracking-wide bg-gray-50/80"
                    style="font-weight: bolder;">
                    <th class="py-2 text-red-600 border-b border-gray-300">อา</th>
                    <th class="py-2 text-yellow-600 border-b border-gray-300">จ</th>
                    <th class="py-2 text-pink-600 border-b border-gray-300">อ</th>
                    <th class="py-2 text-green-600 border-b border-gray-300">พ</th>
                    <th class="py-2 text-orange-600 border-b border-gray-300">พฤ</th>
                    <th class="py-2 text-blue-600 border-b border-gray-300">ศ</th>
                    <th class="py-2 text-purple-600 border-b border-gray-300">ส</th>
                </tr>
            </thead>
        <tbody>
    `;

    let dow = firstDay.getDay();
    html += `<tr class="calendar-row" style="position:relative;">`;

    const dayCells = [];
    for (let i = 0; i < dow; i++) {
        html += "<td></td>";
        dayCells.push(null);
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const fullDate = `${currentYear}-${String(currentMonth + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

        html += `
            <td class="calendar-cell" style="height:85px; position:relative;">
                <div class="day-number font-semibold">${d}</div>
                <div class="event-slot"></div>
            </td>`;

        dayCells.push(fullDate);

        if ((dayCells.length % 7) === 0)
            html += `</tr><tr class="calendar-row" style="position:relative;">`;

    }

    html += "</tr></tbody></table>";

    // ---------------------------------------------------
    // 🧠 ระบบจัด Event ซ้อนให้สวยงาม
    // ---------------------------------------------------

    // เรียงสั้นก่อน → ยาวทีหลัง → ยาวอยู่ล่าง
    allEvents.sort((a, b) => {
        const durA = new Date(a.end_date) - new Date(a.start_date);
        const durB = new Date(b.end_date) - new Date(b.start_date);
        return durA - durB;
    });

    const daysPerRow = 7;
    const monthStart = new Date(toDateKey(firstDay));
    const monthEnd = new Date(toDateKey(lastDay));

    const levels = {};  // เก็บชั้นของแต่ละ row

    function getEventLevel(row, startInRow, endInRow) {
    if (!window.calendarSlots) window.calendarSlots = [];
    if (!window.calendarSlots[row]) window.calendarSlots[row] = [];

    const slots = window.calendarSlots[row];
    let level = 0;

    const newLength = endInRow - startInRow;

    while (true) {
        let needNextLevel = false;

        for (const taken of slots[level] || []) {
            const [ts, te] = taken;
            const takenLength = te - ts;

            const isOverlap = !(endInRow < ts || startInRow > te);
            if (isOverlap) {
                if (newLength >= takenLength) {
                    // ถ้าอันใหม่ยาวกว่าหรือเท่า → ต้องลง level ถัดไป
                    needNextLevel = true;
                }
                break;
            }
        }

        if (!needNextLevel) break;
        level++;
    }

    if (!slots[level]) slots[level] = [];
    slots[level].push([startInRow, endInRow]);

    return level;
}


    for (const ev of allEvents) {
        const start = new Date(ev.start_date);
        const end = new Date(ev.end_date);

        if (end < monthStart || start > monthEnd) continue;

        const startKey = toDateKey(ev.start_date);
        const endKey   = toDateKey(ev.end_date);

        let sIndex = dayCells.indexOf(startKey);
        let eIndex = dayCells.indexOf(endKey);

        if (sIndex === -1) sIndex = 0;
        if (eIndex === -1) eIndex = dayCells.length - 1;

        while (sIndex <= eIndex) {
            const row = Math.floor(sIndex / daysPerRow);

            const rowStartIndex = row * daysPerRow;
            const rowEndIndex = rowStartIndex + daysPerRow - 1;

            const startInRow = Math.max(sIndex, rowStartIndex);
            const endInRow = Math.min(eIndex, rowEndIndex);

            const span = endInRow - startInRow + 1;

            let charPerDay = 20;
            if (window.innerWidth < 1024) charPerDay = 1500;
            if (window.innerWidth < 640) charPerDay = 100;

            const maxChars = span * charPerDay;
            let titleShort = ev.title.length > maxChars
                ? ev.title.slice(0, maxChars - 1) + "…"
                : ev.title;

            function calcEventTop(row, level) {
                const WEEK_HEIGHT = 82;      // ความสูงของ 1 สัปดาห์
                const MULTI_OFFSET = 99;     // เริ่มต้นของ event ทับกัน
                const SINGLE_OFFSET = 102;    // เริ่มต้น event เดี่ยว เลื่อนลงมาหน่อย
                const EVENT_GAP = 28;        // ระยะห่าง event ซ้อนกัน

                if (level === 0) {
                    // ไม่ทับ — เดี่ยว = ลงต่ำกว่าเพื่อดู balance
                    return row * WEEK_HEIGHT + SINGLE_OFFSET;
                }

                // ทับ — ใช้ระบบ Level stacking
                return row * WEEK_HEIGHT + MULTI_OFFSET + (level * EVENT_GAP);
            }


            const level = getEventLevel(row, startInRow, endInRow);
            const topPx = calcEventTop(row, level);



            const leftPercent = (startInRow % 7) * (100 / 7);
            const widthPercent = span * (100 / 7);

            html += `
                <div class="event-bar"
                     onclick="openEventDayModal('${startKey}')"
                     style="top:${topPx}px;
                            left:${leftPercent}%;
                            width:${widthPercent}%;
                            --event-color:${ev.color};">
                    ${titleShort}
                </div>
            `;

            sIndex = rowEndIndex + 1;
        }
    }

    html += "</div>";
    calendarEl.innerHTML = html;

    document.getElementById("prevMonth").onclick = () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderCalendar();
    };

    document.getElementById("nextMonth").onclick = () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderCalendar();
    };
}




// Popup รายวัน
function openEventDayModal(date) {
    const modal = document.getElementById("eventDayModal");
    const list = document.getElementById("eventDayList");
    const modalContent = document.getElementById('eventDayModalContent'); // สำหรับ Transition

    // 1. แสดง Loading State ขณะรอข้อมูล
    list.innerHTML = `
        <div class="text-center py-5 text-gray-500 italic">
            กำลังโหลดกิจกรรม...
        </div>
    `;

    // 2. แสดง Modal ทันที (พร้อม Transition)
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        modalContent.classList.remove('opacity-0', 'scale-95');
    }, 10);

    // 3. โหลดและประมวลผลกิจกรรม
    loadEvents().then(events => {
        // 3.1. ปรับปรุง Logic การกรอง: ต้องจัดการกับ null และ Date Object
        const dayEvents = events.filter(ev => {
            const start = ev.start_date; // อาจเป็น null
            const end = ev.end_date;     // อาจเป็น null
            
            // ใช้ Moment.js หรือ Date Object ในการเปรียบเทียบจริงจัง (สมมติว่า date ที่รับมาเป็น YYYY-MM-DD)
            // ถ้าใช้ String เปรียบเทียบตรงๆ อาจมีปัญหาเมื่อ format ไม่ใช่ YYYY-MM-DD
            
            // A) กรองกิจกรรมที่มีช่วงเวลา: ต้องอยู่ในช่วง start - end
            if (start && end) {
                return date >= start && date <= end;
            }
            
            // B) กรองกิจกรรมวันเดียว: ถ้ามีแค่ start_date ให้เทียบกับวันนั้น
            if (start && !end) {
                return date === start;
            }
            
            // C) กรองกิจกรรมที่ไม่มีกำหนด (ถือว่ามีอยู่เสมอในรายการ):
            if (!start && !end) {
                return true; 
            }
            
            return false;
        });

        // 3.2. สร้าง HTML โดยใช้ฟังก์ชันที่เราสร้างไว้ก่อนหน้า
        if (dayEvents.length > 0) {
            list.innerHTML = dayEvents.map(ev => createEventItemHTML(ev)).join("");
        } else {
            list.innerHTML = `
                <div class="text-center py-5 text-gray-500">
                    <p class="text-xl">🎉</p>
                    <p class="font-semibold">ไม่มีกิจกรรมในวันนี้</p>
                    <p class="text-sm">คุณสามารถพักผ่อนได้!</p>
                </div>
            `;
        }
    })
    .catch(error => {
        console.error("เกิดข้อผิดพลาดในการโหลดกิจกรรม:", error);
        list.innerHTML = `
            <div class="text-center py-5 text-red-600">
                <p class="font-semibold">⚠️ ไม่สามารถโหลดข้อมูลได้</p>
                <p class="text-sm">${error.message || 'โปรดลองใหม่อีกครั้ง'}</p>
            </div>
        `;
    });
}


// ต้องมีฟังก์ชันนี้อยู่ (นำมาจากคำตอบก่อนหน้า)
function createEventItemHTML(ev) {
    const getEventDateDisplay = (startDate, endDate) => {
        if (!startDate && !endDate) {
            return '<span class="text-red-500 font-semibold">ไม่มีกำหนด/ตลอดกิจกรรม</span>';
        }
        if (!startDate && endDate) {
            return '<span class="text-red-500 font-semibold">ไม่มีกำหนด/ตลอดกิจกรรม</span>';
        }
        if (startDate && !endDate) {
            return `<span class="font-medium">${startDate}</span>`;
        }
        if (startDate && endDate) {
            return `${startDate} ---  ${endDate}`;
        }
        return 'ไม่ระบุช่วงเวลา';
    };

    const dateDisplay = getEventDateDisplay(ev.start_date, ev.end_date);
    
    return `
        <div class="p-4 bg-white shadow-md hover:shadow-lg transition-shadow duration-300 rounded-lg flex justify-between items-center border-l-4 border-indigo-500">
            <div class="flex-grow">
                <div class="font-bold text-lg text-gray-800 mb-1">${ev.title}</div>
                <div class="text-sm text-gray-500 italic">${dateDisplay}</div>
            </div>
            <a href="/event/${ev.folder}"
                class="ml-4 flex-shrink-0 text-sm px-4 py-2 rounded-full text-white bg-indigo-600 hover:bg-indigo-700 transition duration-200 ease-in-out shadow-md hover:shadow-lg">
                ดูรายละเอียด
            </a>
        </div>
    `;
}

function closeEventDayModal() {
    document.getElementById("eventDayModal").classList.add("hidden");
}

renderCalendar();


function gotoMonthYear() {
    const month = parseInt(document.getElementById("monthSelect").value);
    const yearBE = parseInt(document.getElementById("yearSelect").value);

    if (isNaN(yearBE)) {
        alert("กรุณากรอกปี พ.ศ.");
        return;
    }

    currentMonth = month;
    currentYear = yearBE - 543; // แปลงเป็น ค.ศ.

    renderCalendar();
}


