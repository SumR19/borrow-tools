document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "https://3d00-1-10-233-58.ngrok-free.app";
    const toolsList = document.getElementById("tools-list");
    const borrowedList = document.getElementById("borrowed-list");
    const siteInput = document.getElementById("site-name");
    const noteInput = document.getElementById("note");
    const searchTool = document.getElementById("search-tool"); // ✅ เพิ่มช่องค้นหา
    const borrowForm = document.getElementById("borrow-form");

    // ✅ อุปกรณ์ 64 รายการครบ
    const toolNames = [
        "สว่าน (ไร้สาย,แบต)", "สว่าน (ไฟฟ้า)", "สว่านโรตารี,สว่านแช็ก (ไฟฟ้า)", "สว่านโรตารี่,สว่านแย็ก(ไร้สาย,แบต)",
        "เครื่องสกัด,เจาะ คอนกรีต (ไฟฟ้า)", "เครื่องเจาะคิน, ขุดหลุม (น้ำมัน)", "หินเจียรขนาดเล็ก (ไฟฟ้า)", "หินเจียรขนาดเล็ก (ไร้สาย,แบต)",
        "หินเจียรขนาดกลาง (ไฟฟ้า)", "หินเจียรขนาดกลาง (ไร้สาย,แบต)", "หินเจียรขนาดใหญ่ (ไฟฟ้า)", "ไฟเบอร์ขนาดเล็ก (ไฟฟ้า)",
        "ไฟเบอร์ขนาดใหญ่ (ไฟฟ้า)", "เครื่องดูดฝุ่น (ไฟฟ้า)", "เครื่องเป่าลมร้อนต่อท่อ Pvc (ไฟฟ้า)", "เครื่องเป่าลม (ไร้สาย,แบต)",
        "เครื่องขัดกระดาษทรายขนาดเล็ก (ไฟฟ้า)", "เครื่องขัดกระดาษทรายขนาดใหญ่ (ไฟฟ้า)", "เครื่องวายจี้ปูน (ไฟฟ้า)", "เครื่องตัดไม้ (ไฟฟ้า)",
        "เครื่องตัดหญ้า (น้ำมัน)", "เครื่องยิงเลเซอร์ (ไร้สาย,แบต)", "เครื่องโม่ปูนฉาบ (ไฟฟ้า)", "วงเดือน (ไฟฟ้า)", "วงเดือน (ไร้สาย,แบต)",
        "ทริมเมอร์ (ไร้สาย,แบต)", "จิ๊กซอตัดไม้ (ไร้สาย,แบต)", "จิ๊กซอตัดไม้ (ไฟฟ้า)", "ตู้เชื่อม (ไฟฟ้า)", "ตู้เชื่อม Mig (ไฟฟ้า)",
        "สายไฟ (ไฟฟ้า)", "สามเชื่อม (ไฟฟ้า)", "ระดับน้ำ", "สายวัดระดับน้ำ", "กรรไกรตัดซีลาย (C-Line)", "กรรไกรตัดท่อ Pvc",
        "กรรไกรตัดแผ่นเมทัลชีท", "กรรไกรตัดเหล็ก", "หัวปั่นปูน", "ปั๊มลม", "ตัวตัดกระเบื้อง", "ตัวจับกระเบื้อง",
        "กิ๊ฟหนีบกระเบื้อง (ถุงละ 100 ตัว)", "สามเหลี่ยม", "ปืนยิ่งกาว", "ปืนยิงกาวไส้กรอก", "แม็กลม",
        "แด๊ปขาว,กาวตะปูแด๊ปสีอื่นๆ", "สว่านโรตารี่แบตเล็ก", "ค้อนเล็ก", "ชะแลง", "กล้องวัดระดับ",
        "สปอร์ตไลท์", "ถังลม", "เกรียงขัดมันขนาดเล็ก", "เกรียงขัดมันขนาดใหญ่", "รถถังขัดสกิม",
        "เครื่องพ่นสี", "บันได", "จอบ", "เสียม", "บุ้งกี๋", "กะบะปูน", "ถังใส่ปูน"
    ];

    function loadTools() {
        toolsList.innerHTML = toolNames.map(name => `
            <div class="tool-card">
                <input type="checkbox" name="tools" value="${name}">
                <label>${name}</label>
                <input type="number" class="tool-quantity" min="1" max="99" value="1">
            </div>
        `).join("");
    }

    // ✅ ฟังก์ชันค้นหาอุปกรณ์
    if (searchTool) {
        searchTool.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase();
            const tools = document.querySelectorAll("#tools-list .tool-card");

            tools.forEach(tool => {
                const toolName = tool.textContent.toLowerCase();
                if (toolName.includes(searchTerm)) {
                    tool.style.display = "block"; // แสดงผลถ้าตรงกับคำค้นหา
                } else {
                    tool.style.display = "none"; // ซ่อนถ้าไม่ตรง
                }
            });
        });
    }

    function attachReturnEventListeners() {
        document.querySelectorAll(".return-item-btn").forEach(button => {
            button.addEventListener("click", async function () {
                const site = this.dataset.site;
                const name = this.dataset.name;
    
                try {
                    const response = await fetch(API_URL + "/return-item", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ site, name })
                    });
    
                    if (response.ok) {
                        Swal.fire({ icon: "success", title: `คืน ${name} สำเร็จ!` });
                        fetchBorrowedTools();  // ✅ โหลดข้อมูลใหม่
                    } else {
                        const errorData = await response.json();
                        Swal.fire({ icon: "error", title: "คืนอุปกรณ์ไม่สำเร็จ!", text: errorData.error });
                    }
                } catch (error) {
                    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด!", text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" });
                }
            });
        });
    }
    

    async function fetchBorrowedTools() {
        try {
            const response = await fetch(API_URL + "/borrowed-tools");
            const data = await response.json();
    
            borrowedList.innerHTML = "";
    
            if (data.length === 0) {
                borrowedList.innerHTML = "<p>📭 ไม่มีอุปกรณ์ที่ถูกยืม</p>";
                return;
            }
    
            // ✅ จัดกลุ่มอุปกรณ์ตามหน้างาน
            const groupedBySite = {};
            data.forEach(tool => {
                if (!groupedBySite[tool.site]) {
                    groupedBySite[tool.site] = [];
                }
                groupedBySite[tool.site].push(tool);
            });
    
            // ✅ สร้าง UI แสดงผลแบบแยกหมวดหมู่หน้างาน
            Object.keys(groupedBySite).forEach(site => {
                const siteContainer = document.createElement("div");
                siteContainer.classList.add("site-section");
                siteContainer.innerHTML = `<h2>🏗️ หน้างาน: ${site}</h2>`;
    
                const toolTable = document.createElement("table");
                toolTable.innerHTML = `
                    <thead>
                        <tr>
                            <th>🛠️ อุปกรณ์</th>
                            <th>🔢 จำนวน</th>
                            <th>📝 หมายเหตุ</th>
                            <th>🔄 คืน</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groupedBySite[site].map(tool => `
                            <tr>
                                <td>${tool.name}</td>
                                <td>${tool.quantity} ชิ้น</td>
                                <td>${tool.note || "ไม่มีหมายเหตุ"}</td>
                                <td><button class="return-item-btn" data-site="${site}" data-name="${tool.name}">🔄 คืน</button></td>
                            </tr>
                        `).join("")}
                    </tbody>
                `;
    
                siteContainer.appendChild(toolTable);
                borrowedList.appendChild(siteContainer);
            });
    
            attachReturnEventListeners();  // ✅ เรียกใช้ฟังก์ชันคืนอุปกรณ์
        } catch (error) {
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด!", text: "ไม่สามารถโหลดข้อมูลจาก API ได้" });
        }
    }
    

    // ✅ ฟังก์ชันบันทึกอุปกรณ์ที่ยืม
    borrowForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const siteName = siteInput.value.trim();
        const note = noteInput.value.trim();
        const selectedTools = Array.from(document.querySelectorAll("input[name='tools']:checked"))
            .map(checkbox => ({
                name: checkbox.value,
                quantity: parseInt(checkbox.parentElement.querySelector(".tool-quantity").value, 10)
            }));

        if (!siteName) {
            Swal.fire({ icon: "warning", title: "กรุณากรอกชื่อหน้างาน!" });
            return;
        }
        if (selectedTools.length === 0) {
            Swal.fire({ icon: "warning", title: "กรุณาเลือกอุปกรณ์!" });
            return;
        }

        try {
            const response = await fetch(API_URL + "/borrow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ site: siteName, tools: selectedTools, note })
            });

            if (response.ok) {
                Swal.fire({ icon: "success", title: "บันทึกสำเร็จ!" });
                siteInput.value = "";
                noteInput.value = "";
                document.querySelectorAll("input[name='tools']").forEach(checkbox => checkbox.checked = false);
                fetchBorrowedTools();
            }
        } catch (error) {
            Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด!", text: "ไม่สามารถบันทึกข้อมูลได้" });
        }
    });

    loadTools();
    fetchBorrowedTools();
});

if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("✅ Service Worker ลงทะเบียนเรียบร้อย!"))
        .catch(err => console.log("❌ Service Worker ลงทะเบียนล้มเหลว:", err));
}
