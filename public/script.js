document.addEventListener("DOMContentLoaded", function () {
    // ✅ ใช้ same origin - จะทำงานกับทุก URL
    const API_URL = window.location.origin;
    
    console.log("🌐 ใช้ API URL:", API_URL);
    
    const toolsList = document.getElementById("tools-list");
    const borrowedList = document.getElementById("borrowed-list");
    const siteInput = document.getElementById("site-name");
    const noteInput = document.getElementById("note");
    const searchTool = document.getElementById("search-tool");
    const borrowForm = document.getElementById("borrow-form");

    // ✅ ตรวจสอบ DOM elements ที่จำเป็น
    console.log("🔍 ตรวจสอบ DOM elements:");
    console.log("- API_URL:", API_URL);
    console.log("- toolsList:", toolsList);
    console.log("- borrowedList:", borrowedList);
    console.log("- siteInput:", siteInput);
    console.log("- noteInput:", noteInput);
    console.log("- searchTool:", searchTool);
    console.log("- borrowForm:", borrowForm);
    
    // ✅ เพิ่ม WebSocket connection
    const socket = io(API_URL);
    
    // ✅ เพิ่มตัวแปรสำหรับ API integration
    let availableTools = []; // จะโหลดจาก API
    let allTools = []; // เก็บรายการเต็มสำหรับการค้นหา

    const toolNames = [
        // 🔧 เครื่องมือเจาะ/สว่าน
        "สว่าน (แบต)",
        "สว่าน (ไฟฟ้า)",
        "สว่านโรตารี,สว่านแช็ก (ไฟฟ้า)",
        "สว่านโรตารี่,สว่านแย็ก(แบต)",
        "สว่านโรตารี่แบตเล็ก",
        "เครื่องสกัด,เจาะ คอนกรีต (ไฟฟ้า)",
        "เครื่องเจาะคิน, ขุดหลุม (น้ำมัน)",
        "ชุดสว่าน และ หินเจียร (แบต)",
    
        // 🔨 เครื่องมือตัด/เจียร/ขัด
        "หินเจียรขนาดเล็ก (ไฟฟ้า)",
        "หินเจียรขนาดเล็ก (แบต)",
        "หินเจียรขนาดกลาง (ไฟฟ้า)",
        "หินเจียรขนาดกลาง (แบต)",
        "หินเจียรขนาดใหญ่ (ไฟฟ้า)",
        "ไฟเบอร์ขนาดเล็ก (ไฟฟ้า)",
        "ไฟเบอร์ขนาดใหญ่ (ไฟฟ้า)",
        "เครื่องขัดกระดาษทรายขนาดเล็ก (ไฟฟ้า)",
        "เครื่องขัดกระดาษทรายขนาดใหญ่ (ไฟฟ้า)",
        "รถถังขัดผนัง (ไฟฟ้า)",
        "เครื่องขัดผนัง (ไฟฟ้า)",
        "เกรียงขัดมันขนาดเล็ก",
        "เกรียงขัดมันขนาดใหญ่",
        "รถถังขัดสกิม",
    
        // 🪚 เครื่องมือตัดไม้
        "เครื่องตัดไม้ (ไฟฟ้า)",
        "จิ๊กซอตัดไม้ (ไฟฟ้า)",
        "จิ๊กซอตัดไม้ (แบต)",
        "วงเดือน (ไฟฟ้า)",
        "วงเดือน (แบต)",
    
        // ✂️ เครื่องมือตัดโลหะ/วัสดุ
        "กรรไกรตัดซีลาย (C-Line)",
        "กรรไกรตัดท่อ Pvc",
        "กรรไกรตัดแผ่นเมทัลชีท",
        "กรรไกรตัดเหล็ก",
        "ตัวตัดกระเบื้อง",
        "ตัวจับกระเบื้อง",
        "กิ๊ฟหนีบกระเบื้อง (ถุงละ 100 ตัว)",
    
        // 🏗️ เครื่องมือก่อสร้าง/ปูน
        "เครื่องวายจี้ปูน (ไฟฟ้า)",
        "เครื่องโม่ปูนฉาบ (ไฟฟ้า)",
        "หัวปั่นปูน",
        "กะบะปูน",
        "ถังใส่ปูน",
        "เครื่องตบดิน (น้ำมัน)",
    
        // ⚡ อุปกรณ์เชื่อม/ไฟฟ้า
        "ตู้เชื่อม (ไฟฟ้า)",
        "ตู้เชื่อม Mig (ไฟฟ้า)",
        "สายไฟ (ไฟฟ้า)",
        "สายเชื่อม (ไฟฟ้า)",
    
        // 🌬️ เครื่องมือลม/ดูด/เป่า
        "เครื่องดูดฝุ่น (ไฟฟ้า)",
        "เครื่องเป่าลมร้อนต่อท่อ Pvc (ไฟฟ้า)",
        "เครื่องเป่าลม (ไร้สาย,แบต)",
        "ปั๊มลม",
        "แม็กลม",
        "ถังลม",
        "ปืนลม",
        "ปั้มน้ำไดโว่ (ไฟฟ้า)",
         
    
        // 📏 เครื่องมือวัด/สำรวจ
        "ระดับน้ำ",
        "สายวัดระดับน้ำ",
        "กล้องวัดระดับ",
        "สามเหลี่ยม",
        "เครื่องยิงเลเซอร์ (แบต)",
        "เทปวัด",
    
        // 💡 อุปกรณ์แสงสว่าง/พ่น
        "สปอร์ตไลท์",
        "เครื่องพ่นสี",
    
        // 🔗 เครื่องมือยึด/ติด
        "ปืนยิ่งกาว",
        "ปืนยิงกาวไส้กรอก",
        "แด๊ปขาว,กาวตะปูแด๊ปสีอื่นๆ",
    
        // 🔨 เครื่องมือพื้นฐาน
        "ค้อนเล็ก",
        "ชะแลง",
        "ทริมเมอร์ (แบต)",
        "ค้อนปอนด์",
        "ค้อนยาง",
        "ชุดรวมเครื่องมือช่าง (กระเป๋าชุดใหญ่)",
    
        // 🌱 เครื่องมือสวน/ไร่
        "เครื่องตัดหญ้า (น้ำมัน)",
        "เลื่อยไฟฟ้าตัดไม้ (แบต)",
    
        // 🪜 อุปกรณ์อื่น ๆ
        "บันได",
        "จอบ",
        "เสียม",
        "บุ้งกี๋"
    ];

        // เพิ่มฟังก์ชันนี้หลัง toolNames array
    function getToolOrderFromArray(toolName) {
        const index = toolNames.findIndex(name => name === toolName);
        return index >= 0 ? index : 999; // ถ้าไม่เจอให้อยู่ท้ายสุด
    }

        // หลัง toolNames array
    
    // ✅ WebSocket Event Listeners
    socket.on('connect', () => {
        console.log('🔌 เชื่อมต่อ WebSocket สำเร็จ (หน้าหลัก)');
    });
    
    socket.on('disconnect', () => {
        console.log('🔌 WebSocket ตัดการเชื่อมต่อ');
    });
    
    socket.on('toolAdded', (data) => {
        console.log('✨ อุปกรณ์ใหม่เพิ่มแล้ว:', data.tool.name);
        loadAvailableTools(); // รีโหลดรายการทันที
        showNewToolNotification(data.tool.name);
    });
    
    socket.on('toolUpdated', (data) => {
        console.log('✏️ อุปกรณ์ถูกแก้ไข:', data.tool.name);
        loadAvailableTools(); // รีโหลดรายการทันที
    });
    
    socket.on('toolDeleted', (data) => {
        console.log('🗑️ อุปกรณ์ถูกลบ:', data.toolName);
        loadAvailableTools(); // รีโหลดรายการทันที
        showDeleteToolNotification(data.toolName);
    });

    // แก้ไขส่วนการเรียงลำดับใน loadAvailableTools()
    async function loadAvailableTools() {
        try {
            console.log('🔄 กำลังโหลดรายการอุปกรณ์จาก API...');
            
            const response = await fetch(`${API_URL}/api/tools/catalog`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                // ✅ เรียงลำดับตาม toolNames array ก่อน
                const sortedTools = result.data.sort((a, b) => {
                    const orderA = getToolOrderFromArray(a.name);
                    const orderB = getToolOrderFromArray(b.name);
                    
                    // 1. เรียงตามลำดับใน toolNames array
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    
                    // 2. ถ้าลำดับเท่ากัน เรียงตาม isNew
                    if (a.isNew && !b.isNew) return -1;
                    if (!a.isNew && b.isNew) return 1;
                    
                    // 3. ถ้า isNew เท่ากัน เรียงตาม usageCount
                    if (a.usageCount !== b.usageCount) {
                        return b.usageCount - a.usageCount;
                    }
                    
                    // 4. สุดท้ายเรียงตัวอักษร
                    return a.name.localeCompare(b.name, 'th');
                });
                
                availableTools = sortedTools;
                allTools = [...sortedTools];
                displayToolsFromAPI(availableTools);
                console.log(`✅ โหลดอุปกรณ์จาก API สำเร็จ: ${availableTools.length} รายการ (เรียงตาม toolNames)`);
                
            } else {
                throw new Error(result.error || 'ไม่สามารถโหลดรายการอุปกรณ์ได้');
            }
        } catch (error) {
            console.error('❌ Error loading tools from API:', error);
            console.log('🔄 ใช้ข้อมูลสำรองจาก toolNames array...');
            
            // ✅ Fallback: ใช้ loadTools() เดิมถ้า API ไม่ทำงาน
            loadToolsOriginal();
        }
    }
    
    // ✅ ฟังก์ชันแสดงรายการจาก API
    function displayToolsFromAPI(tools) {
        if (!toolsList) {
            console.warn("⚠️ toolsList element not found");
            return;
        }
    
        if (tools.length === 0) {
            toolsList.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1 / -1; color: #666;">
                    <h3>ไม่มีรายการอุปกรณ์</h3>
                    <p>กรุณาติดต่อผู้ดูแลระบบ</p>
                </div>
            `;
            return;
        }
    
        toolsList.innerHTML = tools.map(tool => {
            const toolName = typeof tool === 'string' ? tool : tool.name;
            const isNew = typeof tool === 'object' && tool.isNew;
            const usageCount = typeof tool === 'object' ? tool.usageCount || 0 : 0;
            
            // สร้าง badge "ใหม่" ถ้าต้องการ
            const newBadge = isNew ? `
                <div class="new-badge" style="
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    background: linear-gradient(45deg, #ff6b6b, #feca57);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    animation: pulse 2s infinite;
                ">✨ ใหม่</div>
            ` : '';
            
            const toolId = toolName.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
            
            return `
                <div class="tool-card ${isNew ? 'new-tool' : ''}" data-tool-name="${toolName}" style="position: relative;">
                    ${newBadge}
                    <input type="checkbox" name="tools" value="${toolName}" id="tool-${toolId}">
                    <label for="tool-${toolId}">${toolName}</label>
                    ${usageCount > 0 ? `
                        <div class="tool-stats" style="font-size: 12px; color: #666; margin: 4px 0;">
                            ยืม ${usageCount} ครั้ง
                        </div>
                    ` : ''}
                    <input type="number" class="tool-quantity" min="1" max="99" value="1" onclick="event.stopPropagation()">
                </div>
            `;
        }).join("");
        
        // ✅ เรียก attachCardClickListeners หลังจากสร้าง DOM เสร็จ
        attachCardClickListeners();
        
        console.log(`✅ แสดงรายการอุปกรณ์จาก API: ${tools.length} รายการ`);
    }
    
    // ✅ แสดง Notification อุปกรณ์ใหม่
    function showNewToolNotification(toolName) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #4ecdc4, #44a08d);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-weight: 600;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        toast.innerHTML = `✨ อุปกรณ์ใหม่: ${toolName}`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
        setTimeout(() => toast.style.transform = 'translateX(400px)', 4000);
        setTimeout(() => document.body.removeChild(toast), 4500);
    }
    
    // ✅ แสดง Notification ลบอุปกรณ์
    function showDeleteToolNotification(toolName) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #ff6b6b, #feca57);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-weight: 600;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        toast.innerHTML = `🗑️ ลบอุปกรณ์: ${toolName}`;
        
        document.body.appendChild(toast);
        
        setTimeout(() => toast.style.transform = 'translateX(0)', 100);
        setTimeout(() => toast.style.transform = 'translateX(400px)', 4000);
        setTimeout(() => document.body.removeChild(toast), 4500);
    }

    // ✅ สร้าง tool cards
    // ✅ แก้ไข loadTools() ให้พยายามโหลดจาก API ก่อน
    function loadTools() {
        console.log("🔄 เริ่มโหลดรายการอุปกรณ์...");
        
        // ลองโหลดจาก API ก่อน
        loadAvailableTools().catch(() => {
            // ถ้า API ไม่ทำงาน ใช้ hardcode
            console.log("🔄 ใช้ข้อมูลสำรอง (hardcode)...");
            loadToolsOriginal();
        });
    }

    // ✅ เปลี่ยนชื่อฟังก์ชันเดิมเป็น loadToolsOriginal()
    function loadToolsOriginal() {
        if (!toolsList) {
            console.warn("⚠️ toolsList element not found");
            return;
        }
        toolsList.innerHTML = toolNames.map(name => `
            <div class="tool-card" data-tool-name="${name}">
                <input type="checkbox" name="tools" value="${name}" id="tool-${name.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}">
                <label for="tool-${name.replace(/\s+/g, '-').replace(/[^\w-]/g, '')}">${name}</label>
                <input type="number" class="tool-quantity" min="1" max="99" value="1" onclick="event.stopPropagation()">
            </div>
        `).join("");
        
        // ✅ เพิ่ม Event Listener สำหรับการกดที่การ์ด
        attachCardClickListeners();
        
        console.log("✅ โหลดรายการอุปกรณ์เสร็จสิ้น (hardcode)");
    }

    // ✅ แทนที่ฟังก์ชัน attachCardClickListeners() เดิม
    function attachCardClickListeners() {
        const toolCards = document.querySelectorAll('.tool-card');
        
        toolCards.forEach(card => {
            // ✅ เพิ่ม tooltip เมื่อ hover
            card.title = "คลิกเพื่อเลือก/ยกเลิก";
            
            card.addEventListener('click', function(event) {
                // ✅ ป้องกันการกดที่ input quantity
                if (event.target.classList.contains('tool-quantity')) {
                    event.stopPropagation();
                    return;
                }
                
                // ✅ ป้องกันการกดซ้ำที่ checkbox หรือ label
                if (event.target.type === 'checkbox' || event.target.tagName === 'LABEL') {
                    return;
                }
                
                const checkbox = this.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked;
                    
                    // ✅ อัปเดต visual state
                    this.classList.toggle('selected', checkbox.checked);
                    
                    // ✅ อัปเดต title
                    this.title = checkbox.checked ? "คลิกเพื่อยกเลิกการเลือก" : "คลิกเพื่อเลือก";
                    
                    // ✅ Animation
                    if (checkbox.checked) {
                        this.classList.add('card-selected-animation');
                        setTimeout(() => {
                            this.classList.remove('card-selected-animation');
                        }, 300);
                    }
                    
                    // ✅ เล่นเสียง (optional)
                    if (checkbox.checked) {
                        // สร้างเสียง click เบา ๆ
                        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAkBYAkBYAk');
                        audio.volume = 0.1;
                        audio.play().catch(() => {}); // ไม่แสดง error ถ้าเล่นไม่ได้
                    }
                    
                    console.log(`${checkbox.checked ? '✅ เลือก' : '❌ ยกเลิก'}: ${checkbox.value}`);
                }
            });
            
            // ✅ เพิ่ม visual feedback เมื่อ hover
            card.addEventListener('mouseenter', function() {
                if (!this.querySelector('input[type="checkbox"]').checked) {
                    this.classList.add('card-hover');
                }
            });
            
            card.addEventListener('mouseleave', function() {
                this.classList.remove('card-hover');
            });
            
            // ✅ Keyboard support
            card.tabIndex = 0; // ทำให้สามารถใช้ Tab ได้
            card.addEventListener('keydown', function(event) {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.click();
                }
            });
        });
    }

    // ✅ ฟังก์ชันค้นหาอุปกรณ์
    // แก้ไขฟังก์ชันค้นหาให้รักษาลำดับจาก toolNames
    if (searchTool) {
        searchTool.addEventListener("input", function () {
            const searchTerm = this.value.toLowerCase();
            
            if (!searchTerm) {
                // ถ้าไม่มีการค้นหา แสดงทั้งหมดตามลำดับเดิม
                displayToolsFromAPI(availableTools);
                return;
            }
            
            // กรองและรักษาลำดับจาก toolNames
            const filteredTools = availableTools.filter(tool => {
                const toolName = typeof tool === 'string' ? tool : tool.name;
                return toolName.toLowerCase().includes(searchTerm);
            });
            
            // ✅ เรียงตามลำดับใน toolNames
            filteredTools.sort((a, b) => {
                const nameA = typeof a === 'string' ? a : a.name;
                const nameB = typeof b === 'string' ? b : b.name;
                return getToolOrderFromArray(nameA) - getToolOrderFromArray(nameB);
            });
            
            displayToolsFromAPI(filteredTools);
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
                    
                    // ✅ รีเซ็ตฟอร์ม (แก้ไขส่วนนี้)
                    if (siteInput) siteInput.value = "";
                    if (noteInput) noteInput.value = "";
                    
                    // ✅ รีเซ็ต checkbox และ visual state
                    document.querySelectorAll("input[name='tools']").forEach(checkbox => {
                        checkbox.checked = false;
                        
                        // ✅ เอา class selected ออกจากการ์ด
                        const card = checkbox.closest('.tool-card');
                        if (card) {
                            card.classList.remove('selected');
                            card.title = "คลิกเพื่อเลือก/ยกเลิก"; // รีเซ็ต tooltip
                        }
                        
                        // ✅ รีเซ็ต quantity
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

    // ✅ แก้ไขฟังก์ชันโหลดข้อมูลที่ยืม - ใช้ borrowedList โดยตรง
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
                        background: rgba(255, 255, 255, 0.08);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        color: #E2E8F0;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin: 0 0 15px 0;
                        font-size: 1.3rem;
                        text-align: center;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    ">
                        🏗️ หน้างาน: ${site} 
                        <span style="
                            background: rgba(255, 215, 0, 0.15);
                            color: #FFD700;
                            padding: 4px 12px;
                            border-radius: 20px;
                            font-size: 0.9rem;
                            font-weight: 600;
                            border: 1px solid rgba(255, 215, 0, 0.3);
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
                        <tr style="background: rgba(255, 255, 255, 0.05);">
                            <th style="padding: 15px; text-align: left; font-weight: 600; color: #FFD700;">🛠️ อุปกรณ์</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; width: 120px; color: #FFD700;">🔢 จำนวน</th>
                            <th style="padding: 15px; text-align: left; font-weight: 600; color: #FFD700;">📝 หมายเหตุ</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; width: 120px; color: #FFD700;">🕐 วันที่ยืม</th>
                            <th style="padding: 15px; text-align: center; font-weight: 600; width: 200px; color: #FFD700;">⚡ การจัดการ</th>
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
                                        <strong style="color: #000000ff;">${tool.name}</strong>
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
                                            color: #000000ff;
                                            border-left: 4px solid #667eea;
                                        ">
                                            ${tool.note}
                                        </div>
                                    ` : '<span style="color: #000000ff;">ไม่มีหมายเหตุ</span>'}
                                </td>
                                <td style="padding: 15px; text-align: center;">
                                    <div style="font-size: 0.9rem; color: #000000ff;">
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
            summaryDiv.style.background = "rgba(255, 255, 255, 0.08)";
            summaryDiv.style.backdropFilter = "blur(15px)";
            summaryDiv.style.webkitBackdropFilter = "blur(15px)";
            summaryDiv.style.border = "1px solid rgba(255, 255, 255, 0.15)";
            summaryDiv.style.color = "#E2E8F0";
            summaryDiv.style.borderRadius = "12px";
            summaryDiv.style.textAlign = "center";
            summaryDiv.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.3)";
            summaryDiv.innerHTML = `
                <h4 style="margin: 0 0 15px 0; font-size: 1.2rem; color: #FFD700;">📊 สรุปรวม</h4>
                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
                    <div style="
                        padding: 10px;
                        background: rgba(255, 215, 0, 0.1);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 215, 0, 0.2);
                    ">
                        <div style="font-size: 2rem; font-weight: bold; color: #FFD700;">${totalSites}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">หน้างาน</div>
                    </div>
                    <div style="
                        padding: 10px;
                        background: rgba(255, 215, 0, 0.1);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 215, 0, 0.2);
                    ">
                        <div style="font-size: 2rem; font-weight: bold; color: #FFD700;">${totalTools}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">รายการอุปกรณ์</div>
                    </div>
                    <div style="
                        padding: 10px;
                        background: rgba(255, 215, 0, 0.1);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 215, 0, 0.2);
                    ">
                        <div style="font-size: 2rem; font-weight: bold; color: #FFD700;">${totalQuantity}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8;">ชิ้นทั้งหมด</div>
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
                                        // ✅ อัปเดตสถิติรวมหลังจากลบแถวแล้ว
                                        updateSummaryStats();
                                    }, 500);
                                }
                            }
                        }
                        
                        // ✅ อัปเดตสถิติรวมทันที
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
                                // ✅ อัปเดตสถิติรวมหลังจากลบแถวแล้ว
                                updateSummaryStats();
                            }, 500);
                        }
                        
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
                <h4 style="margin: 0 0 15px 0; font-size: 1.2rem; color: #FFD700;">📊 สรุปรวม</h4>
                <div style="display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px;">
                    <div class="pulse" style="
                        padding: 10px;
                        background: rgba(255, 215, 0, 0.1);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 215, 0, 0.2);
                    ">
                        <div style="font-size: 2rem; font-weight: bold; color: #FFD700;">${allSections.length}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8; color: #E2E8F0;">หน้างาน</div>
                    </div>
                    <div class="pulse" style="
                        padding: 10px;
                        background: rgba(255, 215, 0, 0.1);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 215, 0, 0.2);
                    ">
                        <div style="font-size: 2rem; font-weight: bold; color: #FFD700;">${allRows.length}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8; color: #E2E8F0;">รายการอุปกรณ์</div>
                    </div>
                    <div class="pulse" style="
                        padding: 10px;
                        background: rgba(255, 215, 0, 0.1);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 215, 0, 0.2);
                    ">
                        <div style="font-size: 2rem; font-weight: bold; color: #FFD700;">${totalQuantity}</div>
                        <div style="font-size: 0.9rem; opacity: 0.8; color: #E2E8F0;">ชิ้นทั้งหมด</div>
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
} else {
    console.log("🚧 Service Worker ปิดใช้งานใน development");
}