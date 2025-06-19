document.addEventListener("DOMContentLoaded", function () {
    const API_URL = "https://yn-hiking-engage-everywhere.trycloudflare.com";
    const toolsList = document.getElementById("tools-list");
    const borrowedList = document.getElementById("borrowed-list");
    const siteInput = document.getElementById("site-name");
    const noteInput = document.getElementById("note");
    const searchTool = document.getElementById("search-tool");
    const borrowForm = document.getElementById("borrow-form");

    // ✅ ตรวจสอบ DOM elements ที่จำเป็น
    console.log("🔍 ตรวจสอบ DOM elements:");
    console.log("- toolsList:", toolsList);
    console.log("- borrowedList:", borrowedList);
    console.log("- siteInput:", siteInput);
    console.log("- noteInput:", noteInput);
    console.log("- searchTool:", searchTool);
    console.log("- borrowForm:", borrowForm);

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

    // ✅ สร้าง tool cards
    function loadTools() {
        if (!toolsList) {
            console.warn("⚠️ toolsList element not found");
            return;
        }
        toolsList.innerHTML = toolNames.map(name => `
            <div class="tool-card">
                <input type="checkbox" name="tools" value="${name}" id="tool-${name.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}">
                <label for="tool-${name.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}">${name}</label>
                <input type="number" class="tool-quantity" min="1" max="99" value="1">
            </div>
        `).join("");
        console.log("✅ โหลดรายการอุปกรณ์เสร็จสิ้น");
    }

    // ✅ ฟังก์ชันค้นหาอุปกรณ์
    if (searchTool) {
        searchTool.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase();
            const tools = document.querySelectorAll("#tools-list .tool-card");

            tools.forEach(tool => {
                const toolName = tool.textContent.toLowerCase();
                if (toolName.includes(searchTerm)) {
                    tool.style.display = "block";
                } else {
                    tool.style.display = "none";
                }
            });
        });
    }

    // ✅ ฟังก์ชันบันทึกอุปกรณ์ที่ยืม - แก้ไขปัญหาการอัปเดต
    if (borrowForm) {
        borrowForm.addEventListener("submit", async function (event) {
            event.preventDefault();

            const siteName = siteInput?.value?.trim() || "";
            const note = noteInput?.value?.trim() || "";
            
            // ✅ รวบรวมอุปกรณ์ที่เลือก
            const selectedTools = Array.from(document.querySelectorAll("input[name='tools']:checked"))
                .map(checkbox => {
                    const quantity = parseInt(checkbox.parentElement.querySelector(".tool-quantity").value, 10) || 1;
                    return {
                        name: checkbox.value,
                        quantity: quantity
                    };
                });

            console.log("📋 ข้อมูลที่จะส่ง:", { siteName, selectedTools, note });

            // ✅ ตรวจสอบข้อมูล
            if (!siteName) {
                Swal.fire({ 
                    icon: "warning", 
                    title: "กรุณากรอกชื่อหน้างาน!",
                    text: "ต้องระบุชื่อหน้างานก่อนยืมอุปกรณ์"
                });
                return;
            }
            
            if (selectedTools.length === 0) {
                Swal.fire({ 
                    icon: "warning", 
                    title: "กรุณาเลือกอุปกรณ์!",
                    text: "ต้องเลือกอุปกรณ์อย่างน้อย 1 รายการ"
                });
                return;
            }

            // ✅ แสดง loading
            Swal.fire({
                title: 'กำลังบันทึกข้อมูล...',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            try {
                console.log("🔗 ส่งข้อมูลไปยัง:", `${API_URL}/borrow`);
                const response = await fetch(`${API_URL}/borrow`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({ 
                        site: siteName, 
                        tools: selectedTools, 
                        note: note 
                    })
                });

                console.log("📡 Response status:", response.status);
                const result = await response.json();
                console.log("📝 Response data:", result);

                if (response.ok) {
                    // ✅ แสดงข้อความสำเร็จก่อน
                    Swal.fire({ 
                        icon: "success", 
                        title: "บันทึกสำเร็จ!", 
                        text: result.message,
                        timer: 2000,
                        showConfirmButton: false
                    });
                    
                    // ✅ รีเซ็ตฟอร์ม
                    if (siteInput) siteInput.value = "";
                    if (noteInput) noteInput.value = "";
                    document.querySelectorAll("input[name='tools']").forEach(checkbox => {
                        checkbox.checked = false;
                        const quantityInput = checkbox.parentElement.querySelector(".tool-quantity");
                        if (quantityInput) quantityInput.value = 1;
                    });
                    
                    // ✅ บังคับอัปเดตข้อมูลทันทีหลังรีเซ็ตฟอร์ม
                    console.log("🔄 กำลังอัปเดตรายการอุปกรณ์ที่ยืม...");
                    setTimeout(() => {
                        fetchBorrowedTools(true); // รอ 100ms ให้ Swal หายก่อน
                    }, 100);
                    
                } else {
                    Swal.fire({ 
                        icon: "error", 
                        title: "เกิดข้อผิดพลาด!", 
                        text: result.error || "ไม่สามารถบันทึกข้อมูลได้"
                    });
                }
            } catch (error) {
                console.error("❌ Error:", error);
                Swal.fire({ 
                    icon: "error", 
                    title: "เกิดข้อผิดพลาด!", 
                    text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้: " + error.message 
                });
            }
        });
    }

    // ✅ แก้ไขฟังก์ชันโหลดข้อมูลอุปกรณ์ที่ยืม - ใช้ borrowedList โดยตรง
    async function fetchBorrowedTools(forceRefresh = false) {
        console.log("🔄 เริ่มต้น fetchBorrowedTools...");
        
        // ✅ ตรวจสอบว่า DOM element มีอยู่หรือไม่
        if (!borrowedList) {
            console.warn("⚠️ borrowedList element not found, skipping fetchBorrowedTools");
            return;
        }

        try {
            console.log("🔄 กำลังโหลดข้อมูลอุปกรณ์ที่ยืม...", forceRefresh ? "(บังคับรีเฟรช)" : "");
            
            // ✅ แสดง loading indicator - ใช้ borrowedList โดยตรง
            borrowedList.innerHTML = '<div style="text-align: center; padding: 20px;"><span class="loading-spinner"></span> กำลังโหลดข้อมูล...</div>';
            
            // ✅ เพิ่ม timestamp เพื่อป้องกัน cache เมื่อ forceRefresh = true
            const apiUrl = forceRefresh 
                ? `${API_URL}/borrowed-tools?t=${Date.now()}`
                : `${API_URL}/borrowed-tools`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Cache-Control': forceRefresh ? 'no-cache, no-store, must-revalidate' : 'default',
                    'Pragma': forceRefresh ? 'no-cache' : 'default',
                    'Expires': forceRefresh ? '0' : 'default'
                }
            });
            
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            
            const data = await response.json();
            console.log("📊 API Response:", data);

            // ✅ ล้างข้อมูลเดิมทั้งหมด - ใช้ borrowedList โดยตรง
            borrowedList.innerHTML = '';

            if (!data || Object.keys(data).length === 0) {
                // Empty state
                borrowedList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #718096;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                        <div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; color: #4a5568;">ไม่มีอุปกรณ์ที่ยืม</div>
                        <div style="font-size: 1rem; line-height: 1.5;">เริ่มต้นยืมอุปกรณ์โดยเลือกจากรายการด้านบน</div>
                    </div>
                `;
                return;
            }

            // ✅ วนลูปสร้างหัวข้อและตารางแต่ละหน้างาน
            Object.keys(data).forEach((site, index) => {
                const siteSection = document.createElement("div");
                siteSection.classList.add("site-section");
                siteSection.style.marginBottom = "30px";

                // ✅ เพิ่ม animation สำหรับรายการใหม่
                if (forceRefresh) {
                    siteSection.style.opacity = "0";
                    siteSection.style.transform = "translateY(20px)";
                    setTimeout(() => {
                        siteSection.style.transition = "all 0.5s ease";
                        siteSection.style.opacity = "1";
                        siteSection.style.transform = "translateY(0)";
                    }, index * 100);
                }

                // ✅ สร้างหัวข้อหน้างาน
                const siteHeader = document.createElement("div");
                siteHeader.classList.add("site-header");
                siteHeader.innerHTML = `
                    <h3 style="
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin: 0 0 15px 0;
                        font-size: 1.3rem;
                        text-align: center;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        🏗️ หน้างาน: ${site} 
                        <span style="
                            background: rgba(255,255,255,0.2);
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 0.9rem;
                            font-weight: 600;
                        ">
                            ${data[site].length} รายการ
                        </span>
                    </h3>
                `;

                // ✅ สร้างตารางอุปกรณ์ของหน้างานนี้
                const toolTable = document.createElement("table");
                toolTable.style.width = "100%";
                toolTable.style.borderCollapse = "collapse";
                toolTable.style.background = "white";
                toolTable.style.borderRadius = "12px";
                toolTable.style.overflow = "hidden";
                toolTable.style.boxShadow = "0 5px 15px rgba(0, 0, 0, 0.08)";

                // ✅ หัวตาราง
                toolTable.innerHTML = `
                    <thead>
                        <tr style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                            <th style="padding: 15px; text-align: left; font-weight: 600;">🛠️ อุปกรณ์</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; width: 120px;">🔢 จำนวน</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600;">📝 หมายเหตุ</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; width: 120px;">🕐 วันที่ยืม</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; width: 200px;">⚡ การจัดการ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data[site].map((tool, toolIndex) => `
                            <tr id="tool-row-${site.replace(/\s+/g, '-')}-${tool.name.replace(/\s+/g, '-')}" style="
                                border-bottom: 1px solid #e2e8f0;
                                transition: all 0.3s ease;
                            " onmouseover="this.style.background='#f7fafc'" onmouseout="this.style.background='white'">
                                <td style="padding: 15px;">
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <span style="
                                            background: #e6fffa;
                                            color: #00695c;
                                            padding: 4px 8px;
                                            border-radius: 20px;
                                            font-size: 0.8rem;
                                            font-weight: 600;
                                        ">
                                            #${toolIndex + 1}
                                        </span>
                                        <strong>${tool.name}</strong>
                                    </div>
                                </td>
                                <td style="padding: 15px; text-align: center;">
                                    <span class="quantity-display" style="
                                        background: #fff3cd;
                                        color: #856404;
                                        padding: 6px 12px;
                                        border-radius: 6px;
                                        font-weight: 700;
                                        font-size: 1.1rem;
                                    ">
                                        ${tool.quantity} ชิ้น
                                    </span>
                                </td>
                                <td style="padding: 15px; max-width: 200px; word-wrap: break-word;">
                                    ${tool.note ? `
                                        <div style="
                                            background: #f8f9fa;
                                            padding: 8px 12px;
                                            border-radius: 8px;
                                            font-style: italic;
                                            color: #495057;
                                            border-left: 4px solid #667eea;
                                        ">
                                            ${tool.note}
                                        </div>
                                    ` : '<span style="color: #6c757d;">ไม่มีหมายเหตุ</span>'}
                                </td>
                                <td style="padding: 15px; text-align: center;">
                                    <div style="font-size: 0.9rem; color: #495057;">
                                        ${new Date(tool.borrowedAt).toLocaleDateString('th-TH', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                    </div>
                                    <div style="font-size: 0.8rem; color: #6c757d; margin-top: 2px;">
                                        ${new Date(tool.borrowedAt).toLocaleTimeString('th-TH', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </div>
                                </td>
                                <td style="padding: 15px; text-align: center;">
                                    <div style="display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
                                        <button 
                                            class="return-item-btn" 
                                            data-site="${site}" 
                                            data-name="${tool.name}"
                                            style="
                                                background: #28a745;
                                                color: white;
                                                border: none;
                                                padding: 6px 12px;
                                                border-radius: 6px;
                                                font-size: 0.85rem;
                                                cursor: pointer;
                                                transition: all 0.3s ease;
                                                display: flex;
                                                align-items: center;
                                                gap: 4px;
                                            "
                                            onmouseover="this.style.background='#218838'; this.style.transform='translateY(-1px)'"
                                            onmouseout="this.style.background='#28a745'; this.style.transform='translateY(0)'"
                                        >
                                            🔄 คืน 1
                                        </button>
                                        <button 
                                            class="return-all-btn" 
                                            data-site="${site}" 
                                            data-name="${tool.name}"
                                            style="
                                                background: #dc3545;
                                                color: white;
                                                border: none;
                                                padding: 6px 12px;
                                                border-radius: 6px;
                                                font-size: 0.85rem;
                                                cursor: pointer;
                                                transition: all 0.3s ease;
                                                display: flex;
                                                align-items: center;
                                                gap: 4px;
                                            "
                                            onmouseover="this.style.background='#c82333'; this.style.transform='translateY(-1px)'"
                                            onmouseout="this.style.background='#dc3545'; this.style.transform='translateY(0)'"
                                        >
                                            🗑️ คืนทั้งหมด
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                `;

                // ✅ รวมทุกอย่างเข้าด้วยกัน
                siteSection.appendChild(siteHeader);
                siteSection.appendChild(toolTable);
                borrowedList.appendChild(siteSection); // ✅ ใช้ borrowedList โดยตรง
            });

            // ✅ แสดงสถิติรวม
            const totalTools = Object.values(data).flat().length;
            const totalQuantity = Object.values(data).flat().reduce((sum, tool) => sum + tool.quantity, 0);
            const totalSites = Object.keys(data).length;

            const summaryDiv = document.createElement("div");
            summaryDiv.style.marginTop = "30px";
            summaryDiv.style.padding = "20px";
            summaryDiv.style.background = "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
            summaryDiv.style.color = "white";
            summaryDiv.style.borderRadius = "12px";
            summaryDiv.style.textAlign = "center";
            summaryDiv.innerHTML = `
                <h4 style="margin: 0 0 15px 0; font-size: 1.2rem;">📊 สรุปรวม</h4>
                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
                    <div>
                        <div style="font-size: 2rem; font-weight: bold;">${totalSites}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">หน้างาน</div>
                    </div>
                    <div>
                        <div style="font-size: 2rem; font-weight: bold;">${totalTools}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">รายการอุปกรณ์</div>
                    </div>
                    <div>
                        <div style="font-size: 2rem; font-weight: bold;">${totalQuantity}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">ชิ้นทั้งหมด</div>
                    </div>
                </div>
            `;
            borrowedList.appendChild(summaryDiv); // ✅ ใช้ borrowedList โดยตรง

            // ✅ เรียก attachReturnEventListeners หลังจากสร้าง DOM เสร็จ
            attachReturnEventListeners();

            console.log("✅ อัปเดตข้อมูลอุปกรณ์ที่ยืมเรียบร้อยแล้ว");

        } catch (error) {
            console.error("❌ Error fetching borrowed tools:", error);
            if (borrowedList) {
                borrowedList.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #dc3545;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">⚠️</div>
                        <div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 8px;">เกิดข้อผิดพลาด</div>
                        <div style="font-size: 1rem;">${error.message}</div>
                    </div>
                `;
            }
        }
    }

    // ✅ แก้ไขฟังก์ชัน attachReturnEventListeners
    function attachReturnEventListeners() {
        // คืนอุปกรณ์ทีละชิ้น
        document.querySelectorAll(".return-item-btn").forEach(button => {
            button.addEventListener("click", async function () {
                const site = this.dataset.site;
                const name = this.dataset.name;

                console.log("🔄 คืนอุปกรณ์ 1 ชิ้น:", { site, name });

                // ✅ แสดง loading บนปุ่มที่กด (ใช้ CSS spinner)
                const originalText = this.innerHTML;
                this.innerHTML = '<span class="loading-spinner"></span>กำลังคืน...';
                this.disabled = true;

                try {
                    const response = await fetch(`${API_URL}/return-item`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ site, name })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        Swal.fire({ 
                            icon: "success", 
                            title: result.message,
                            timer: 2000,
                            showConfirmButton: false
                        });

                        // ✅ อัปเดต UI แบบ Real-time โดยไม่ต้องรีโหลดทั้งหมด
                        const rowId = `tool-row-${site.replace(/\s+/g, '-')}-${name.replace(/\s+/g, '-')}`;
                        const row = document.getElementById(rowId);
                        
                        if (row) {
                            const quantityDisplay = row.querySelector('.quantity-display');
                            if (quantityDisplay) {
                                const currentQuantityText = quantityDisplay.textContent;
                                const currentQuantity = parseInt(currentQuantityText.match(/\d+/)[0]);
                                
                                if (currentQuantity > 1) {
                                    // ลดจำนวน พร้อม animation
                                    quantityDisplay.textContent = `${currentQuantity - 1} ชิ้น`;
                                    quantityDisplay.classList.add('pulse');
                                    
                                    // แสดง animation สีเขียว
                                    quantityDisplay.style.background = '#d4edda';
                                    quantityDisplay.style.color = '#155724';
                                    setTimeout(() => {
                                        quantityDisplay.style.background = '#fff3cd';
                                        quantityDisplay.style.color = '#856404';
                                        quantityDisplay.classList.remove('pulse');
                                    }, 1000);
                                } else {
                                    // ลบแถวทั้งแถว พร้อม fadeOut animation
                                    row.classList.add('fade-out');
                                    setTimeout(() => {
                                        row.remove();
                                        // ตรวจสอบว่ายังมีอุปกรณ์ในหน้างานนี้หรือไม่
                                        checkAndUpdateSiteSection(site);
                                    }, 500);
                                }
                            }
                        }
                        
                        // ✅ อัปเดตสถิติรวม
                        updateSummaryStats();
                        
                    } else {
                        Swal.fire({ icon: "error", title: "คืนอุปกรณ์ไม่สำเร็จ!", text: result.error });
                        // ✅ คืนค่าปุ่มเดิม
                        this.innerHTML = originalText;
                        this.disabled = false;
                    }
                } catch (error) {
                    console.error("Error:", error);
                    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด!", text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" });
                    // ✅ คืนค่าปุ่มเดิม
                    this.innerHTML = originalText;
                    this.disabled = false;
                }
            });
        });

        // คืนอุปกรณ์ทั้งหมด
        document.querySelectorAll(".return-all-btn").forEach(button => {
            button.addEventListener("click", async function () {
                const site = this.dataset.site;
                const name = this.dataset.name;

                // ถามยืนยันก่อนคืนทั้งหมด
                const result = await Swal.fire({
                    title: 'คืนอุปกรณ์ทั้งหมด?',
                    text: `คุณต้องการคืน "${name}" ทั้งหมดจากหน้างาน "${site}" หรือไม่?`,
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#dc3545',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'คืนทั้งหมด',
                    cancelButtonText: 'ยกเลิก'
                });

                if (!result.isConfirmed) return;

                console.log("🔄 คืนอุปกรณ์ทั้งหมด:", { site, name });

                // ✅ แสดง loading บนปุ่มที่กด (ใช้ CSS spinner)
                const originalText = this.innerHTML;
                this.innerHTML = '<span class="loading-spinner"></span>กำลังคืน...';
                this.disabled = true;

                try {
                    const response = await fetch(`${API_URL}/return-all`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ site, name })
                    });

                    const apiResult = await response.json();

                    if (response.ok) {
                        Swal.fire({ 
                            icon: "success", 
                            title: apiResult.message,
                            timer: 2000,
                            showConfirmButton: false
                        });

                        // ✅ ลบแถวทั้งแถว พร้อม fadeOut animation
                        const rowId = `tool-row-${site.replace(/\s+/g, '-')}-${name.replace(/\s+/g, '-')}`;
                        const row = document.getElementById(rowId);
                        
                        if (row) {
                            row.classList.add('fade-out');
                            setTimeout(() => {
                                row.remove();
                                // ตรวจสอบว่ายังมีอุปกรณ์ในหน้างานนี้หรือไม่
                                checkAndUpdateSiteSection(site);
                            }, 500);
                        }
                        
                        // ✅ อัปเดตสถิติรวม
                        updateSummaryStats();
                        
                    } else {
                        Swal.fire({ icon: "error", title: "คืนอุปกรณ์ไม่สำเร็จ!", text: apiResult.error });
                        // ✅ คืนค่าปุ่มเดิม
                        this.innerHTML = originalText;
                        this.disabled = false;
                    }
                } catch (error) {
                    console.error("Error:", error);
                    Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด!", text: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้" });
                    // ✅ คืนค่าปุ่มเดิม
                    this.innerHTML = originalText;
                    this.disabled = false;
                }
            });
        });
    }

    // ✅ ฟังก์ชันตรวจสอบและอัปเดตส่วนของหน้างาน
    function checkAndUpdateSiteSection(siteName) {
        const allRows = document.querySelectorAll(`[id^="tool-row-${siteName.replace(/\s+/g, '-')}-"]`);
        if (allRows.length === 0) {
            // ไม่มีอุปกรณ์ในหน้างานนี้แล้ว ลบ section ทั้งหมด
            const siteSections = document.querySelectorAll('.site-section');
            let targetSection = null;
            
            siteSections.forEach(section => {
                const header = section.querySelector('h3');
                if (header && header.textContent.includes(siteName)) {
                    targetSection = section;
                }
            });
            
            if (targetSection) {
                targetSection.classList.add('fade-out');
                setTimeout(() => {
                    targetSection.remove();
                    // ตรวจสอบว่ายังมีหน้างานอื่นหรือไม่
                    checkForEmptyState();
                }, 500);
            }
        } else {
            // อัปเดตจำนวนรายการในหัวข้อ
            const siteSections = document.querySelectorAll('.site-section');
            siteSections.forEach(section => {
                const header = section.querySelector('h3');
                if (header && header.textContent.includes(siteName)) {
                    const badge = header.querySelector('span');
                    if (badge) {
                        badge.textContent = `${allRows.length} รายการ`;
                        badge.classList.add('pulse');
                        setTimeout(() => badge.classList.remove('pulse'), 500);
                    }
                }
            });
        }
    }

    // ✅ ฟังก์ชันตรวจสอบสถานะว่าง
    function checkForEmptyState() {
        const allSections = document.querySelectorAll('.site-section');
        if (allSections.length === 0) {
            // ✅ ใช้ borrowedList โดยตรง
            if (borrowedList) {
                borrowedList.innerHTML = `
                    <div class="slide-up" style="text-align: center; padding: 40px; color: #718096;">
                        <div style="font-size: 3rem; margin-bottom: 15px;">📭</div>
                        <div style="font-size: 1.25rem; font-weight: 600; margin-bottom: 8px; color: #4a5568;">ไม่มีอุปกรณ์ที่ยืม</div>
                        <div style="font-size: 1rem; line-height: 1.5;">เริ่มต้นยืมอุปกรณ์โดยเลือกจากรายการด้านบน</div>
                    </div>
                `;
            }
        }
    }

    // ✅ ฟังก์ชันอัปเดตสถิติรวม
    function updateSummaryStats() {
        const allRows = document.querySelectorAll('[id^="tool-row-"]');
        const allSections = document.querySelectorAll('.site-section');
        
        let totalQuantity = 0;
        allRows.forEach(row => {
            const quantityText = row.querySelector('.quantity-display')?.textContent || "0";
            const quantity = parseInt(quantityText.match(/\d+/)?.[0] || "0");
            totalQuantity += quantity;
        });

        // อัปเดตสถิติ พร้อม animation
        const summaryDivs = document.querySelectorAll('div[style*="สรุปรวม"]');
        summaryDivs.forEach(summaryDiv => {
            summaryDiv.innerHTML = `
                <h4 style="margin: 0 0 15px 0; font-size: 1.2rem;">📊 สรุปรวม</h4>
                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
                    <div class="pulse">
                        <div style="font-size: 2rem; font-weight: bold;">${allSections.length}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">หน้างาน</div>
                    </div>
                    <div class="pulse">
                        <div style="font-size: 2rem; font-weight: bold;">${allRows.length}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">รายการอุปกรณ์</div>
                    </div>
                    <div class="pulse">
                        <div style="font-size: 2rem; font-weight: bold;">${totalQuantity}</div>
                        <div style="font-size: 0.9rem; opacity: 0.9;">ชิ้นทั้งหมด</div>
                    </div>
                </div>
            `;
            
            // ลบ animation หลังจาก 500ms
            setTimeout(() => {
                summaryDiv.querySelectorAll('.pulse').forEach(el => el.classList.remove('pulse'));
            }, 500);
        });
    }

    // ✅ เริ่มต้น
    console.log("🚀 เริ่มต้นระบบ...");
    loadTools();
    fetchBorrowedTools();
});

// ✅ Service Worker Registration
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
        .then(() => console.log("✅ Service Worker ลงทะเบียนเรียบร้อย!"))
        .catch(err => console.log("❌ Service Worker ลงทะเบียนล้มเหลว:", err));
}