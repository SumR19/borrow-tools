require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const cron = require('node-cron'); // ✅ เพิ่มบรรทัดนี้

const app = express();

const seenIPs = new Set();

app.set('trust proxy', 1); // ✅ ตั้งค่าให้ Express เชื่อถือ proxy (เช่น Nginx) ที่อยู่ข้างหน้า

// ✅ ตรวจสอบว่า MONGO_URI ถูกต้องหรือไม่
console.log("🔍 Connecting to MongoDB:", process.env.MONGO_URI);

// ✅ CORS Configuration
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// ✅ MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    autoIndex: true,
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ Schema Definition
const toolSchema = new mongoose.Schema({
    name: String,
    site: String,
    quantity: Number,
    note: { type: String, default: "" },
    borrowedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date, default: null },
    status: { type: String, default: "borrowed" },
    returnedBy: { type: String, default: "" },
    returnNote: { type: String, default: "" }
});

// ✅ เพิ่ม TTL Index สำหรับ Auto Delete
toolSchema.index({ 
    returnedAt: 1 
}, { 
    expireAfterSeconds: 7776000, // 90 วัน = 90 * 24 * 60 * 60
    partialFilterExpression: { 
        status: "returned",
        returnedAt: { $exists: true, $ne: null }
    }
});

const Tool = mongoose.model("Tool", toolSchema);

// ✅ เพิ่มฟังก์ชัน Auto Cleanup
async function autoCleanupOldRecords() {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 180); // 180 วันที่แล้ว
        
        console.log(`🗑️ เริ่มการลบข้อมูลเก่า (เก่ากว่า ${cutoffDate.toLocaleDateString('th-TH')})`);
        
        // ลบเฉพาะข้อมูลที่คืนแล้วและเก่ากว่า 180 วัน
        const result = await Tool.deleteMany({
            status: "returned",
            returnedAt: { $lt: cutoffDate, $ne: null }
        });
        
        const thaiTime = new Date().toLocaleString('th-TH', { 
            timeZone: 'Asia/Bangkok',
            dateStyle: 'full',
            timeStyle: 'medium'
        });
        
        console.log(`✅ ลบข้อมูลเก่าเรียบร้อย: ${result.deletedCount} รายการ (${thaiTime})`);
        
        if (result.deletedCount > 0) {
            // แสดงสถิติหลังลบ
            const totalBorrowed = await Tool.countDocuments({ status: "borrowed" });
            const totalReturned = await Tool.countDocuments({ status: "returned" });
            console.log(`📊 สถิติปัจจุบัน: ยืมอยู่ ${totalBorrowed} รายการ, คืนแล้ว ${totalReturned} รายการ`);
        }
        
    } catch (error) {
        console.error('❌ Error ในการลบข้อมูลเก่า:', error);
    }
}

// ✅ ตั้งค่า Cron Job - ลบข้อมูลเก่าทุกวันเที่ยงคืน
cron.schedule('0 0 * * *', autoCleanupOldRecords, {
    timezone: "Asia/Bangkok"
});

// ✅ ตั้งค่า Cron Job - ลบข้อมูลเก่าทุกสัปดาห์ (ทางเลือก)
// cron.schedule('0 0 * * 0', autoCleanupOldRecords, {
//     timezone: "Asia/Bangkok"
// });

// ✅ เรียกใช้ครั้งแรกเมื่อ server เริ่มต้น
console.log("🔄 เริ่มการตรวจสอบข้อมูลเก่าครั้งแรก...");
setTimeout(autoCleanupOldRecords, 5000); // รอ 5 วินาที

// ✅ API: ดึงหมวดหมู่หน้างานทั้งหมด (อัตโนมัติ)
app.get("/categories", async (req, res) => {
    try {
        const categories = await Tool.distinct("site", { status: "borrowed" });
        console.log("📂 หน้างานที่พบ:", categories);
        res.json(categories.sort()); // เรียงตามตัวอักษร
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: ดึงอุปกรณ์ตามหมวดหมู่
app.get("/borrowed-tools/:category?", async (req, res) => {
    try {
        const { category } = req.params;
        let filter = { status: "borrowed" };
        
        // ถ้าระบุหมวดหมู่ ให้ filter เฉพาะหมวดหมู่นั้น
        if (category && category !== 'all') {
            filter.site = decodeURIComponent(category);
        }
        
        const tools = await Tool.find(filter);
        console.log(`📋 ดึงข้อมูลจากหน้างาน: ${category || 'ทั้งหมด'} จำนวน: ${tools.length} รายการ`);
        
        // จัดกลุ่มตามหน้างาน
        const groupedBySite = tools.reduce((acc, tool) => {
            if (!acc[tool.site]) acc[tool.site] = [];
            acc[tool.site].push(tool);
            return acc;
        }, {});
        
        res.json(groupedBySite);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: ดึงเฉพาะอุปกรณ์ที่ยังไม่คืน (เดิม - เพื่อ backward compatibility)
app.get("/borrowed-tools", async (req, res) => {
    try {
        const tools = await Tool.find({ status: "borrowed" });
        
        // จัดกลุ่มตามหน้างาน
        const groupedBySite = tools.reduce((acc, tool) => {
            if (!acc[tool.site]) acc[tool.site] = [];
            acc[tool.site].push(tool);
            return acc;
        }, {});
        
        res.json(groupedBySite);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/// ✅ แก้ไข API: สถิติตามหน้างาน (ปรับ console.log ให้สวย)
app.get("/api/category-stats", async (req, res) => {
    try {
        const stats = await Tool.aggregate([
            { $match: { status: "borrowed" } },
            {
                $group: {
                    _id: "$site",
                    totalItems: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" },
                    tools: { $push: { name: "$name", quantity: "$quantity" } }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);
        
        // ✅ จัดรูปแบบข้อมูลให้แสดงผลได้
        const formattedStats = stats.map(stat => ({
            _id: stat._id,
            totalItems: stat.totalItems,
            totalQuantity: stat.totalQuantity,
            tools: stat.tools,
            toolsList: stat.tools.map(tool => `${tool.name} (${tool.quantity})`).join(', '),
            uniqueTools: stat.tools.reduce((acc, tool) => {
                const existing = acc.find(t => t.name === tool.name);
                if (existing) {
                    existing.quantity += tool.quantity;
                } else {
                    acc.push({ name: tool.name, quantity: tool.quantity });
                }
                return acc;
            }, [])
        }));
        
        // ✅ Version สวยพิเศษ
        console.log('\n' + '═'.repeat(60));
        console.log('║' + ' '.repeat(18) + '📊 สถิติอุปกรณ์ตามหน้างาน' + ' '.repeat(17) + '║');
        console.log('═'.repeat(60));
        
        formattedStats.forEach((stat, index) => {
            console.log(`\n┌─ 🏗️  หน้างาน: ${stat._id}`);
            console.log(`├─ 📦 รายการ: ${stat.totalItems} รายการ | 🔢 จำนวน: ${stat.totalQuantity} ชิ้น`);
            console.log(`└─ 🔧 อุปกรณ์:`);
            
            stat.tools.forEach((tool, toolIndex) => {
                const isLast = toolIndex === stat.tools.length - 1;
                const prefix = isLast ? '   └─' : '   ├─';
                console.log(`${prefix} ${toolIndex + 1}. ${tool.name} (${tool.quantity} ชิ้น)`);
            });
            
            if (index < formattedStats.length - 1) {
                console.log('\n' + '─'.repeat(60));
            }
        });
        
        console.log('\n' + '═'.repeat(60));
        console.log(`║ 📈 สรุปรวม: ${formattedStats.length} หน้างาน | 🔧 ทั้งหมด: ${formattedStats.reduce((sum, stat) => sum + stat.totalQuantity, 0)} ชิ้น${' '.repeat(20)}║`);
        console.log('═'.repeat(60));
        
        res.json(formattedStats);
    } catch (err) {
        console.error("❌ Error category stats:", err);
        res.status(500).json({ error: err.message });
    }
});
// ✅ API: บันทึกอุปกรณ์ที่ยืม
app.post("/borrow", async (req, res) => {
    // แจ้งเตือนการยืมอุปกรณ์
    const realIP = req.get('cf-connecting-ip') || req.get('x-forwarded-for') || req.ip;
    console.log('\n' + '🎯'.repeat(15));
    console.log('🔧 การยืมอุปกรณ์ใหม่!');
    console.log('🎯'.repeat(15));
    console.log(`📍 IP: ${realIP}`);
    console.log(`🏗️ หน้างาน: ${req.body.site}`);
    console.log(`📊 จำนวนรายการ: ${req.body.tools?.length || 0}`);
    
    try {
        const { site, tools, note } = req.body;
        if (!site) return res.status(400).json({ error: "ต้องระบุชื่อหน้างาน!" });

        const currentTime = new Date();
        const thaiTime = currentTime.toLocaleString('th-TH', { 
            timeZone: 'Asia/Bangkok',
            dateStyle: 'full',
            timeStyle: 'medium'
        });

        console.log("📌 ข้อมูลที่ได้รับ:");
        console.log("🕐 เวลาที่ยืม:", thaiTime);
        console.log("🏗️ หน้างาน:", site);
        console.log("📝 หมายเหตุ:", note || "ไม่มี");
        console.log("🔧 รายการอุปกรณ์:");
        
        tools.forEach((tool, index) => {
            console.log(`   ${index + 1}. ${tool.name} - จำนวน: ${tool.quantity || 1} ชิ้น`);
        });

        console.log("📊 สรุป: ยืมอุปกรณ์ทั้งหมด", tools.length, "รายการ");

        await Tool.insertMany(tools.map(tool => ({
            name: tool.name,
            site,
            quantity: Number(tool.quantity) || 1,
            note: note || "",
            borrowedAt: currentTime,
            status: "borrowed"
        })));

        res.json({ message: `บันทึกสำเร็จ! สร้างหมวดหมู่ "${site}" แล้ว` });
    } catch (err) {
        console.error("❌ Error บันทึกอุปกรณ์:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: คืนอุปกรณ์เฉพาะชิ้น (ใช้ status)
app.post("/return-item", async (req, res) => {
    const realIP = req.get('cf-connecting-ip') || req.get('x-forwarded-for') || req.ip;
    console.log('\n' + '↩️'.repeat(15));
    console.log('↩️ การคืนอุปกรณ์!');
    console.log('↩️'.repeat(15));
    console.log(`📍 IP: ${realIP}`);
    console.log(`🔧 อุปกรณ์: ${req.body.name}`);
    console.log(`🏗️ หน้างาน: ${req.body.site}`);
    
    try {
        const { site, name, returnedBy = "ไม่ระบุ", returnNote = "" } = req.body;
        if (!site || !name) return res.status(400).json({ error: "ต้องระบุหน้างานและชื่ออุปกรณ์!" });

        const tool = await Tool.findOne({ site, name, status: "borrowed" });
        const currentTime = new Date();
        const thaiTime = currentTime.toLocaleString('th-TH', { 
            timeZone: 'Asia/Bangkok',
            dateStyle: 'full',
            timeStyle: 'medium'
        });

        if (!tool) {
            console.log(`❌ ไม่พบอุปกรณ์: "${name}" ในหมวดหมู่: "${site}" ที่ยังไม่คืน`);
            return res.status(404).json({ error: `ไม่พบอุปกรณ์ "${name}" ในหมวดหมู่ "${site}" ที่ยังไม่คืน` });
        }

        if (tool.quantity > 1) {
            // ลดจำนวน และสร้างรายการใหม่สำหรับที่คืน
            await Tool.updateOne({ _id: tool._id }, { $inc: { quantity: -1 } });
            
            // สร้างบันทึกการคืน
            await Tool.create({
                name: tool.name,
                site: tool.site,
                quantity: 1,
                note: tool.note,
                borrowedAt: tool.borrowedAt,
                returnedAt: currentTime,
                status: "returned",
                returnedBy,
                returnNote
            });
            
            console.log(`✅ คืนอุปกรณ์: "${name}" 1 ชิ้น จากหน้างาน: "${site}" (เหลือ: ${tool.quantity - 1} ชิ้น)`);
            console.log(`🕐 เวลาที่คืน: ${thaiTime}`);
            
            res.json({ message: `คืน ${name} 1 ชิ้นจากหน้างาน ${site} สำเร็จ!` });
        } else {
            // เปลี่ยนสถานะเป็น "returned" แทนการลบ
            await Tool.updateOne(
                { _id: tool._id }, 
                { 
                    status: "returned",
                    returnedAt: currentTime,
                    returnedBy,
                    returnNote
                }
            );
            
            console.log(`✅ คืนอุปกรณ์: "${name}" ทั้งหมด จากหน้างาน: "${site}"`);
            console.log(`🕐 เวลาที่คืน: ${thaiTime}`);;
            
            res.json({ message: `คืน ${name} สำเร็จจากหมวดหมู่ ${site}` });
        }
    } catch (err) {
        console.error("❌ Error คืนอุปกรณ์:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: คืนอุปกรณ์ทั้งหมด (ใช้ status)
app.post("/return-all", async (req, res) => {
    try {
        const { site, name, returnedBy = "ไม่ระบุ", returnNote = "" } = req.body;
        if (!site || !name) return res.status(400).json({ error: "ต้องระบุหน้างานและชื่ออุปกรณ์!" });

        const tool = await Tool.findOne({ site, name, status: "borrowed" });
        const currentTime = new Date();
        const thaiTime = currentTime.toLocaleString('th-TH', { 
            timeZone: 'Asia/Bangkok',
            dateStyle: 'full',
            timeStyle: 'medium'
        });

        if (!tool) {
            console.log(`❌ ไม่พบอุปกรณ์: "${name}" ในหมวดหมู่: "${site}" ที่ยังไม่คืน`);
            return res.status(404).json({ error: `ไม่พบอุปกรณ์ "${name}" ในหมวดหมู่ "${site}" ที่ยังไม่คืน` });
        }

        // เปลี่ยนสถานะเป็น "returned"
        await Tool.updateOne(
            { _id: tool._id }, 
            { 
                status: "returned",
                returnedAt: currentTime,
                returnedBy,
                returnNote
            }
        );
        
        console.log(`✅ คืนอุปกรณ์: "${name}" ทั้งหหมด ${tool.quantity} ชิ้น จากหน้างาน: "${site}"`);
        console.log(`🕐 เวลาที่คืน: ${thaiTime}`);

        res.json({ message: `คืน ${name} ทั้งหมดสำเร็จจากหมวดหมู่ ${site}` });
    } catch (err) {
        console.error("❌ Error คืนอุปกรณ์ทั้งหมด:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: สถิติตามหมวดหมู่สำหรับ Dashboard
app.get("/api/stats", async (req, res) => {
    try {
        const totalTools = await Tool.countDocuments({ status: "borrowed" });
        const totalSites = await Tool.distinct("site", { status: "borrowed" }).then(sites => sites.length);
        const toolsByCategory = await Tool.aggregate([
            { $match: { status: "borrowed" } },
            { $group: { _id: "$name", count: { $sum: "$quantity" } } },
            { $sort: { count: -1 } }
        ]);
        const recentBorrows = await Tool.find({ status: "borrowed" }).sort({ borrowedAt: -1 }).limit(5);
        
        // ✅ เพิ่มสถิติตามหมวดหมู่
        const categoriesStats = await Tool.aggregate([
            { $match: { status: "borrowed" } },
            {
                $group: {
                    _id: "$site",
                    count: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" }
                }
            },
            { $sort: { totalQuantity: -1 } }
        ]);
        
        res.json({
            totalTools,
            totalSites,
            toolsByCategory,
            recentBorrows,
            categoriesStats // ✅ เพิ่มข้อมูลใหม่
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: ข้อมูลกราฟสำหรับ Dashboard
app.get("/api/chart-data", async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push({
                date: date.toISOString().split('T')[0],
                displayDate: date.toLocaleDateString('th-TH', { 
                    month: 'short', 
                    day: 'numeric' 
                }),
                count: 0
            });
        }
        
        const dailyBorrows = await Tool.aggregate([
            { $match: { borrowedAt: { $gte: sevenDaysAgo }, status: "borrowed" } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$borrowedAt" } },
                    count: { $sum: 1 },
                    totalQuantity: { $sum: "$quantity" }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        
        dailyBorrows.forEach(borrow => {
            const dayIndex = last7Days.findIndex(day => day.date === borrow._id);
            if (dayIndex !== -1) {
                last7Days[dayIndex].count = borrow.count;
                last7Days[dayIndex].totalQuantity = borrow.totalQuantity;
            }
        });
        
        const topTools = await Tool.aggregate([
            { $match: { status: "borrowed" } },
            { $group: { _id: "$name", totalQuantity: { $sum: "$quantity" } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);
        
        // ✅ แก้ไขให้แสดงหมวดหมู่แทนหน้างาน
        const siteStats = await Tool.aggregate([
            { $match: { status: "borrowed" } },
            { $group: { _id: "$site", count: { $sum: 1 }, totalQuantity: { $sum: "$quantity" } } },
            { $sort: { totalQuantity: -1 } },
            { $limit: 5 }
        ]);
        
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        
        const lastWeekBorrows = await Tool.countDocuments({
            borrowedAt: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo },
            status: "borrowed"
        });
        
        const thisWeekBorrows = await Tool.countDocuments({
            borrowedAt: { $gte: sevenDaysAgo },
            status: "borrowed"
        });
        
        const weeklyChange = lastWeekBorrows > 0 
            ? ((thisWeekBorrows - lastWeekBorrows) / lastWeekBorrows * 100).toFixed(1)
            : 0;
        
        res.json({ 
            dailyBorrows: last7Days,
            topTools,
            siteStats, // จะแสดงเป็นหมวดหมู่
            weeklyComparison: {
                thisWeek: thisWeekBorrows,
                lastWeek: lastWeekBorrows,
                change: weeklyChange
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: ประวัติการยืม-คืน
app.get("/history", async (req, res) => {
    try {
        const { days = 30, status = "all", category = "all" } = req.query;
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(days));
        
        let filter = { borrowedAt: { $gte: daysAgo } };
        if (status !== "all") filter.status = status;
        if (category !== "all") filter.site = decodeURIComponent(category);
        
        const history = await Tool.find(filter)
            .sort({ borrowedAt: -1 })
            .limit(100);
            
        res.json(history);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: สถิติการคืนอุปกรณ์
app.get("/api/return-stats", async (req, res) => {
    try {
        const totalBorrowed = await Tool.countDocuments({ status: "borrowed" });
        const totalReturned = await Tool.countDocuments({ status: "returned" });
        const returnRate = totalBorrowed + totalReturned > 0 
            ? ((totalReturned / (totalBorrowed + totalReturned)) * 100).toFixed(1)
            : 0;
            
        const overdueTools = await Tool.find({ status: "borrowed" })
            .sort({ borrowedAt: 1 })
            .limit(5);
            
        res.json({
            totalBorrowed,
            totalReturned,
            returnRate,
            overdueTools
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ Static Files
app.use(express.static(path.join(__dirname, "public")));

// ✅ Routes
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/api-ui", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "api-ui.html"));
});

app.get("/history-page", (req, res) => {                                
    res.sendFile(path.join(__dirname, "public", "history.html"));
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🗑️ Auto Cleanup: เปิดใช้งาน (ลบข้อมูลเก่ากว่า 90 วันทุกวันเที่ยงคืน)`);
    console.log(`📊 Manual Cleanup: GET /api/data-stats, DELETE /api/cleanup`);
});