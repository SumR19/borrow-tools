document.addEventListener("DOMContentLoaded", function () {
    const API_URL = window.location.origin;
    let currentPIN = null;

    // ✅ เพิ่ม WebSocket connection
    const socket = io(API_URL);

    // DOM Elements
    const pinOverlay = document.getElementById("pin-overlay");
    const pinInput = document.getElementById("pin-input");
    const pinSubmit = document.getElementById("pin-submit");
    const adminContent = document.getElementById("admin-content");
    const adminStats = document.getElementById("admin-stats");
    const adminToolsList = document.getElementById("admin-tools-list");
    const addManualForm = document.getElementById("add-manual-tool-form");

    // ✅ เพิ่มตัวแปรสำหรับ Tool Catalog Management
    let toolsCatalogData = [];
    let editingToolId = null;

    // Toast Notification
    function showToast(icon, title, text = "") {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: icon,
            title: title,
            text: text,
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        });
    }

    // ✅ WebSocket Event Listeners
    socket.on('connect', () => {
        console.log('🔌 เชื่อมต่อ WebSocket สำเร็จ');
    });

    socket.on('toolAdded', (data) => {
        console.log('✨ มีอุปกรณ์ใหม่:', data.tool.name);
        showMessage('add-catalog-tool-message', `✅ ${data.message}`, 'success');
        loadToolsCatalog();
        loadToolOptions(); // อัปเดตรายการใน dropdown
        
        // Clear form - ใช้ ID ใหม่
        const catalogToolInput = document.getElementById('catalog-tool-name');
        if (catalogToolInput) catalogToolInput.value = '';
    });

    socket.on('toolUpdated', (data) => {
        console.log('✏️ อุปกรณ์ถูกแก้ไข:', data.tool.name);
        showMessage('edit-tool-message', `✅ ${data.message}`, 'success');
        loadToolsCatalog();
        loadToolOptions();
        closeEditModal();
    });

    socket.on('toolDeleted', (data) => {
        console.log('🗑️ อุปกรณ์ถูกลบ:', data.toolName);
        showMessage('add-catalog-tool-message', `✅ ${data.message}`, 'success');
        loadToolsCatalog();
        loadToolOptions();
    });

    // PIN Authentication
    async function authenticateAdmin(pin) {
        try {
            const response = await fetch(`${API_URL}/api/admin/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin })
            });

            if (response.ok) {
                currentPIN = pin;
                pinOverlay.style.display = 'none';
                adminContent.style.display = 'block';
                showToast('success', 'เข้าสู่ระบบสำเร็จ');
                loadAdminData();
            } else {
                showToast('error', 'PIN ไม่ถูกต้อง');
                pinInput.value = '';
                pinInput.focus();
            }
        } catch (error) {
            showToast('error', 'เกิดข้อผิดพลาด');
        }
    }

    // Load Admin Data
    async function loadAdminData() {
        try {
            const response = await fetch(`${API_URL}/api/admin/tools`, {
                headers: { 'X-Admin-PIN': currentPIN }
            });
            const tools = await response.json();
            
            displayStats(tools);
            displayTools(tools);
            loadToolOptions();
            
        } catch (error) {
            showToast('error', 'ไม่สามารถโหลดข้อมูลได้');
        }
    }

    // Display Statistics
    function displayStats(tools) {
        const totalItems = tools.length;
        const totalQuantity = tools.reduce((sum, tool) => sum + tool.quantity, 0);
        const uniqueSites = [...new Set(tools.map(tool => tool.site))].length;
        const todayBorrowed = tools.filter(tool => 
            new Date(tool.borrowedAt).toDateString() === new Date().toDateString()
        ).length;

        adminStats.innerHTML = `
            <div class="stat-card">
                <div style="font-size: 2.5rem; font-weight: 800; color: #667eea; margin-bottom: 10px;">
                    ${totalItems}
                </div>
                <div style="color: #666; font-weight: 600;">📋 รายการทั้งหมด</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 2.5rem; font-weight: 800; color: #28a745; margin-bottom: 10px;">
                    ${totalQuantity}
                </div>
                <div style="color: #666; font-weight: 600;">🔧 ชิ้นทั้งหมด</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 2.5rem; font-weight: 800; color: #fd7e14; margin-bottom: 10px;">
                    ${uniqueSites}
                </div>
                <div style="color: #666; font-weight: 600;">🏗️ หน้างาน</div>
            </div>
            <div class="stat-card">
                <div style="font-size: 2.5rem; font-weight: 800; color: #e83e8c; margin-bottom: 10px;">
                    ${todayBorrowed}
                </div>
                <div style="color: #666; font-weight: 600;">📅 ยืมวันนี้</div>
            </div>
        `;
    }

    // Display Tools
    function displayTools(tools) {
        if (tools.length === 0) {
            adminToolsList.innerHTML = `
                <div style="text-align: center; padding: 40px; grid-column: 1 / -1;">
                    <h3>ไม่มีรายการอุปกรณ์ที่ยืมอยู่</h3>
                </div>
            `;
            return;
        }

        adminToolsList.innerHTML = tools.map(tool => `
            <div class="admin-tool-card" data-tool-id="${tool._id}">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                    <span style="font-size: 1.5rem;">🛠️</span>
                    <h4 class="tool-name" style="margin: 0; flex: 1;">${tool.name}</h4>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">จำนวน</div>
                        <div style="font-size: 1.3rem; font-weight: 700; color: #856404;">${tool.quantity} ชิ้น</div>
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">หน้างาน</div>
                        <div style="font-size: 1.1rem; font-weight: 600; color: #1565c0;">${tool.site}</div>
                    </div>
                </div>

                <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                    <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">📅 วันที่ยืม</div>
                    <div style="font-weight: 600; color: #495057;">
                        ${new Date(tool.borrowedAt).toLocaleString('th-TH')}
                    </div>
                </div>

                ${tool.note ? `
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 8px; margin-bottom: 15px;">
                        <div style="font-size: 0.8rem; color: #666; margin-bottom: 5px;">📝 หมายเหตุ</div>
                        <div style="font-style: italic; color: #495057;">${tool.note}</div>
                    </div>
                ` : ''}

                <div class="admin-actions">
                    <button class="admin-btn edit" onclick="editBorrowedTool('${tool._id}')">
                        ✏️ แก้ไข
                    </button>
                    <button class="admin-btn delete" onclick="deleteBorrowedTool('${tool._id}')">
                        🗑️ ลบ
                    </button>
                </div>
            </div>
        `).join('');
    }

    // ✅ Load Tools Catalog
    async function loadToolsCatalog() {
        try {
            console.log('🔄 กำลังโหลดรายการอุปกรณ์...');
            
            // ✅ ตรวจสอบ PIN ก่อน
            if (!currentPIN) {
                console.error('❌ ไม่มี PIN สำหรับการเข้าถึง');
                return;
            }
            
            const response = await fetch(`${API_URL}/api/admin/tools/catalog`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-PIN': currentPIN
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                toolsCatalogData = result.data;
                displayToolsCatalog(toolsCatalogData);
                updateCatalogStats(result.stats);
                console.log(`✅ โหลดรายการอุปกรณ์สำเร็จ: ${result.data.length} รายการ`);
            } else {
                throw new Error(result.error || 'ไม่สามารถโหลดรายการอุปกรณ์ได้');
            }
            
        } catch (error) {
            console.error('❌ Error loading tools catalog:', error);
            
            // ✅ Fallback: แสดงข้อความแทน
            const catalogList = document.getElementById('tools-catalog-list');
            if (catalogList) {
                catalogList.innerHTML = `
                    <div class="tool-item">
                        <div class="tool-info">
                            <span class="tool-name">❌ ไม่สามารถโหลดข้อมูลได้: ${error.message}</span>
                        </div>
                    </div>
                `;
            }
            
            showMessage('add-catalog-tool-message', `❌ เกิดข้อผิดพลาด: ${error.message}`, 'error');
        }
    }

    // ✅ Display Tools Catalog
    function displayToolsCatalog(tools) {
        const catalogList = document.getElementById('tools-catalog-list');
        const toolsCount = document.getElementById('tools-count');
        
        if (!catalogList || !toolsCount) {
            console.error('❌ ไม่พบ element: tools-catalog-list หรือ tools-count');
            return;
        }
        
        toolsCount.textContent = tools.length;
        
        if (tools.length === 0) {
            catalogList.innerHTML = `
                <div class="tool-item">
                    <div class="tool-info">
                        <span class="tool-name">ไม่มีรายการอุปกรณ์</span>
                    </div>
                </div>
            `;
            return;
        }
        
        catalogList.innerHTML = tools.map(tool => {
            const badges = [];
            
            if (tool.isNew) {
                badges.push('<span class="badge badge-new">✨ ใหม่</span>');
            }
            
            if (tool.currentBorrowedCount > 0) {
                badges.push(`<span class="badge badge-borrowed">${tool.currentBorrowedCount} รายการถูกยืม</span>`);
            }
            
            const canDelete = tool.canDelete;
            const deleteButton = canDelete 
                ? `<button class="btn-small btn-delete" onclick="deleteTool('${tool._id}', '${tool.name.replace(/'/g, "\\'")}')">🗑️ ลบ</button>`
                : `<button class="btn-small btn-delete" disabled title="ไม่สามารถลบได้ มี ${tool.currentBorrowedCount} รายการที่ยืมอยู่">❌ ห้ามลบ</button>`;
            
            return `
                <div class="tool-item" data-tool-id="${tool._id}">
                    <div class="tool-info">
                        <span class="tool-name">${tool.name}</span>
                        <div class="tool-badges">
                            ${badges.join('')}
                        </div>
                    </div>
                    <div class="tool-actions">
                        <button class="btn-small btn-edit" onclick="editTool('${tool._id}', '${tool.name.replace(/'/g, "\\'")}')">✏️ แก้ไข</button>
                        ${deleteButton}
                    </div>
                </div>
            `;
        }).join('');
    }

    // ✅ Update Catalog Stats
    function updateCatalogStats(stats) {
        const totalToolsEl = document.getElementById('total-tools');
        const totalBorrowedEl = document.getElementById('total-borrowed');
        const activeToolsEl = document.getElementById('active-tools');
        
        if (totalToolsEl) totalToolsEl.textContent = stats.totalTools || 0;
        if (totalBorrowedEl) totalBorrowedEl.textContent = stats.totalBorrowed || 0;
        if (activeToolsEl) activeToolsEl.textContent = stats.activeTools || 0;
    }

    // ✅ Add New Tool
    async function addNewTool() {
        const nameInput = document.getElementById('catalog-tool-name'); // เปลี่ยน ID
        const name = nameInput.value.trim();
        
        if (!name) {
            showMessage('add-catalog-tool-message', '❌ กรุณาระบุชื่ออุปกรณ์', 'error');
            nameInput.focus();
            return;
        }
        
        try {
            console.log('➕ กำลังเพิ่มอุปกรณ์:', name);
            
            const response = await fetch(`${API_URL}/api/admin/tools/catalog`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-PIN': currentPIN
                },
                body: JSON.stringify({ name })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ เพิ่มอุปกรณ์สำเร็จ:', result.data.name);
                // WebSocket จะจัดการ update UI
            } else {
                throw new Error(result.error || 'ไม่สามารถเพิ่มอุปกรณ์ได้');
            }
            
        } catch (error) {
            console.error('❌ Error adding tool:', error);
            showMessage('add-catalog-tool-message', `❌ เกิดข้อผิดพลาด: ${error.message}`, 'error');
        }
    }

    // ✅ Edit Tool
    window.editTool = function(toolId, currentName) {
        editingToolId = toolId;
        
        // Create modal if not exists
        let modal = document.getElementById('edit-tool-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-tool-modal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>✏️ แก้ไขชื่ออุปกรณ์</h3>
                        <span class="close" onclick="closeEditModal()">&times;</span>
                    </div>
                    <div class="form-row">
                        <input type="text" id="edit-tool-name" placeholder="ชื่ออุปกรณ์" maxlength="100">
                    </div>
                    <div class="form-row">
                        <button class="btn-primary" onclick="saveEditTool()">💾 บันทึก</button>
                        <button class="btn-secondary" onclick="closeEditModal()">❌ ยกเลิก</button>
                    </div>
                    <div id="edit-tool-message" class="message"></div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        document.getElementById('edit-tool-name').value = currentName;
        modal.style.display = 'block';
        document.getElementById('edit-tool-name').focus();
    };

    // ✅ Save Edit Tool
    window.saveEditTool = async function() {
        const nameInput = document.getElementById('edit-tool-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            showMessage('edit-tool-message', '❌ กรุณาระบุชื่ออุปกรณ์', 'error');
            nameInput.focus();
            return;
        }
        
        try {
            console.log('✏️ กำลังแก้ไขอุปกรณ์:', name);
            
            const response = await fetch(`${API_URL}/api/admin/tools/catalog/${editingToolId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-PIN': currentPIN
                },
                body: JSON.stringify({ name })
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ แก้ไขอุปกรณ์สำเร็จ:', result.data.name);
                // WebSocket จะจัดการ update UI
            } else {
                throw new Error(result.error || 'ไม่สามารถแก้ไขอุปกรณ์ได้');
            }
            
        } catch (error) {
            console.error('❌ Error editing tool:', error);
            showMessage('edit-tool-message', `❌ เกิดข้อผิดพลาด: ${error.message}`, 'error');
        }
    };

    // ✅ Close Edit Modal
    window.closeEditModal = function() {
        const modal = document.getElementById('edit-tool-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        editingToolId = null;
    };

    // ✅ Delete Tool
    window.deleteTool = async function(toolId, toolName) {
        if (!confirm(`⚠️ ต้องการลบอุปกรณ์ "${toolName}" หรือไม่?\n\n⚠️ การลบจะไม่สามารถย้อนกลับได้`)) {
            return;
        }
        
        try {
            console.log('🗑️ กำลังลบอุปกรณ์:', toolName);
            
            const response = await fetch(`${API_URL}/api/admin/tools/catalog/${toolId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-PIN': currentPIN
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ ลบอุปกรณ์สำเร็จ:', toolName);
                // WebSocket จะจัดการ update UI
            } else {
                throw new Error(result.error || 'ไม่สามารถลบอุปกรณ์ได้');
            }
            
        } catch (error) {
            console.error('❌ Error deleting tool:', error);
            showMessage('add-catalog-tool-message', `❌ เกิดข้อผิดพลาด: ${error.message}`, 'error'); // เปลี่ยน ID
        }
    };

    // ✅ Setup Tool Search
    function setupToolSearch() {
        const searchInput = document.getElementById('search-catalog');
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();
                
                if (searchTerm === '') {
                    displayToolsCatalog(toolsCatalogData);
                } else {
                    const filteredTools = toolsCatalogData.filter(tool => 
                        tool.name.toLowerCase().includes(searchTerm)
                    );
                    displayToolsCatalog(filteredTools);
                }
            });
        }
    }

    // ✅ Show Message
    function showMessage(elementId, message, type) {
        const messageEl = document.getElementById(elementId);
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }

    // ✅ Show Tab Function
    window.showTab = function(tabName) {
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Remove active class from all tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => button.classList.remove('active'));
        
        // Show selected tab content
        const selectedTab = document.getElementById(tabName);
        if (selectedTab) {
            selectedTab.classList.add('active');
        }
        
        // Add active class to selected tab button
        const selectedButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
        if (selectedButton) {
            selectedButton.classList.add('active');
        }
        
        // Load data based on tab
        if (tabName === 'stats') {
            loadAdminData();
        } else if (tabName === 'borrowed-tools') {
            loadAdminData();
        } else if (tabName === 'manage-catalog') {
            loadToolsCatalog();
            setupToolSearch();
        }
    };

    // Load Tool Options for Add Form
    async function loadToolOptions() {
        try {
            console.log('🔄 กำลังโหลด Tool Options...');
            
            // ✅ เปลี่ยนมาใช้ API catalog แทน script.js  
            const response = await fetch(`${API_URL}/api/tools/catalog`);
            
            if (!response.ok) {
                console.error('❌ API Response not OK:', response.status);
                return;
            }
            
            const result = await response.json();
            console.log('📦 Tool Options Result:', result);

            if (result.success && result.data) {
                const tools = result.data.map(tool => tool.name);
                const newToolNameSelect = document.getElementById('new-tool-name');
                
                if (newToolNameSelect) {
                    newToolNameSelect.innerHTML = `
                        <option value="">เลือกอุปกรณ์...</option>
                        ${tools.map(tool => `<option value="${tool}">${tool}</option>`).join('')}
                    `;
                    console.log(`✅ โหลด Tool Options สำเร็จ: ${tools.length} รายการ`);
                } else {
                    console.error('❌ ไม่พบ element: new-tool-name');
                }
            } else {
                console.error('❌ API result ไม่ถูกต้อง:', result);
            }

        } catch (error) {
            console.error('❌ Error loading tool options:', error);
            // Fallback: ถ้า API ไม่ทำงาน ใช้ dropdown ว่าง
            const newToolNameSelect = document.getElementById('new-tool-name');
            if (newToolNameSelect) {
                newToolNameSelect.innerHTML = '<option value="">กรุณาเลือกอุปกรณ์...</option>';
            }
        }
    }

    // ✅ แยกฟังก์ชันสำหรับ Borrowed Tools เพื่อไม่ซ้ำกับ Tool Catalog
    window.editBorrowedTool = async function(toolId) {
        const toolCard = document.querySelector(`[data-tool-id="${toolId}"]`);
        const currentData = {
            name: toolCard.querySelector('.tool-name').textContent,
            quantity: parseInt(toolCard.querySelector('div:nth-child(2) div:nth-child(1) div:nth-child(2)').textContent),
            site: toolCard.querySelector('div:nth-child(2) div:nth-child(2) div:nth-child(2)').textContent,
            note: toolCard.querySelector('div:nth-child(4) div:nth-child(2)')?.textContent || ''
        };

        const { value: formValues } = await Swal.fire({
            title: '✏️ แก้ไขข้อมูล',
            html: `
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 5px; font-weight: 600;">🔧 อุปกรณ์:</label>
                    <input id="edit-name" value="${currentData.name}" disabled style="background: #f5f5f5;">
                    
                    <label style="display: block; margin: 15px 0 5px 0; font-weight: 600;">🔢 จำนวน:</label>
                    <input id="edit-quantity" type="number" min="1" max="99" value="${currentData.quantity}">
                    
                    <label style="display: block; margin: 15px 0 5px 0; font-weight: 600;">🏗️ หน้างาน:</label>
                    <input id="edit-site" value="${currentData.site}">
                    
                    <label style="display: block; margin: 15px 0 5px 0; font-weight: 600;">📝 หมายเหตุ:</label>
                    <textarea id="edit-note" rows="3">${currentData.note}</textarea>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '💾 บันทึก',
            cancelButtonText: '❌ ยกเลิก',
            preConfirm: () => {
                return {
                    quantity: parseInt(document.getElementById('edit-quantity').value),
                    site: document.getElementById('edit-site').value.trim(),
                    note: document.getElementById('edit-note').value.trim()
                };
            }
        });

        if (formValues) {
            await updateTool(toolId, formValues);
        }
    };

    window.deleteBorrowedTool = async function(toolId) {
        const result = await Swal.fire({
            title: '⚠️ ยืนยันการลบ',
            text: 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: '🗑️ ลบ',
            cancelButtonText: '❌ ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_URL}/api/admin/tools/${toolId}`, {
                    method: 'DELETE',
                    headers: { 'X-Admin-PIN': currentPIN }
                });

                if (response.ok) {
                    showToast('success', 'ลบรายการสำเร็จ');
                    loadAdminData();
                } else {
                    showToast('error', 'ไม่สามารถลบได้');
                }
            } catch (error) {
                showToast('error', 'เกิดข้อผิดพลาด');
            }
        }
    };

    // Update Tool
    async function updateTool(toolId, data) {
        try {
            const response = await fetch(`${API_URL}/api/admin/tools/${toolId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-PIN': currentPIN
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showToast('success', 'แก้ไขข้อมูลสำเร็จ');
                loadAdminData();
            } else {
                showToast('error', 'ไม่สามารถแก้ไขได้');
            }
        } catch (error) {
            showToast('error', 'เกิดข้อผิดพลาด');
        }
    }

    // Event Listeners
    pinSubmit.addEventListener('click', () => {
        const pin = pinInput.value.trim();
        if (pin) {
            authenticateAdmin(pin);
        }
    });

    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            pinSubmit.click();
        }
    });

    addManualForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('new-tool-name').value,
            quantity: parseInt(document.getElementById('new-tool-quantity').value),
            site: document.getElementById('new-tool-site').value.trim(),
            note: document.getElementById('new-tool-note').value.trim(),
            borrowedAt: document.getElementById('new-tool-date').value
        };

        if (!formData.name || !formData.site) {
            showToast('warning', 'กรุณากรอกข้อมูลให้ครบถ้วน');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/admin/tools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Admin-PIN': currentPIN
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                showToast('success', 'เพิ่มรายการสำเร็จ');
                addManualForm.reset();
                document.getElementById('new-tool-date').value = new Date().toISOString().slice(0, 16);
                loadAdminData();
            } else {
                showToast('error', 'ไม่สามารถเพิ่มได้');
            }
        } catch (error) {
            showToast('error', 'เกิดข้อผิดพลาด');
        }
    });

    // ✅ เพิ่ม Event Listeners สำหรับ Tool Catalog
    const addCatalogToolBtn = document.getElementById('add-catalog-tool-btn'); // เปลี่ยน ID
    const catalogToolInput = document.getElementById('catalog-tool-name'); // เปลี่ยน ID
    
    if (addCatalogToolBtn) {
        addCatalogToolBtn.addEventListener('click', addNewTool);
    }
    
    if (catalogToolInput) {
        catalogToolInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addNewTool();
            }
        });
    }
    
    // ✅ Close modal when clicking outside
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('edit-tool-modal');
        if (modal && e.target === modal) {
            closeEditModal();
        }
    });

    // Set default date to now
    document.getElementById('new-tool-date').value = new Date().toISOString().slice(0, 16);

    // Initialize
    pinInput.focus();
    console.log('✅ Admin Tool Catalog ready');
});