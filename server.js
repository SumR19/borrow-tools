require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const cron = require('node-cron'); // ✅ เพิ่มบรรทัดนี้
const { Server } = require('socket.io');
const http = require('http');

// ✅ Override console methods first
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// ✅ Custom Log Functions with Timestamp
function logWithTime(message, ...args) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    originalLog(`[${timeStr}] ${message}`, ...args);
}

function errorWithTime(message, ...args) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    originalError(`[${timeStr}] ${message}`, ...args);
}

function warnWithTime(message, ...args) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('th-TH', { 
        timeZone: 'Asia/Bangkok',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    originalWarn(`[${timeStr}] ${message}`, ...args);
}

// ✅ Apply override
console.log = logWithTime;
console.error = errorWithTime;
console.warn = warnWithTime;

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


// เพิ่มใน server.js หลัง cron job

// ✅ จัดการ unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
    console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ✅ จัดการ uncaught exception
process.on('uncaughtException', (error) => {
    console.log('❌ Uncaught Exception:', error);
});

// ✅ API: ดึงหมวดหมู่หน้างานทั้งหมด (อัตโนมัติ)
process.on('unhandledRejection', (reason, promise) => {
    console.log('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// ✅ จัดการ uncaught exception
process.on('uncaughtException', (error) => {
    console.log('❌ Uncaught Exception:', error);
});

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

// ✅ เพิ่มหลังบรรทัด app.use(express.static(path.join(__dirname, "public")));

// Admin Authentication - เพิ่มการ debug
const ADMIN_PIN = process.env.ADMIN_PIN || "1234"; // ✅ ใช้ค่า default สำหรับการทดสอบ
console.log("🔐 Admin PIN ที่ตั้งไว้:", ADMIN_PIN); // ✅ เพิ่มบรรทัดนี้เพื่อ debug

// Admin Auth Middleware
function requireAdminAuth(req, res, next) {
    const pin = req.headers['x-admin-pin'] || req.query.pin;
    console.log("📝 PIN ที่ได้รับ:", pin); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
    console.log("🔍 PIN ที่ตั้งไว้:", ADMIN_PIN); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
    
    if (pin !== ADMIN_PIN) {
        console.log("❌ PIN ไม่ตรงกัน"); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
        return res.status(401).json({ error: "ไม่ได้รับอนุญาต" });
    }
    console.log("✅ PIN ถูกต้อง"); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
    next();
}

// ✅ เพิ่ม Missing API Routes

app.get('/api/tools/catalog', async (req, res) => {
    try {
        const tools = await ToolCatalog.find({}).sort({ name: 1 });
        res.json({ success: true, data: tools });
    } catch (error) {
        console.error('Error fetching catalog:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: ตรวจสอบ PIN
app.post("/api/admin/auth", (req, res) => {
    const { pin } = req.body;
    console.log("🔐 ตรวจสอบ PIN:", pin, "vs", ADMIN_PIN); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
    
    if (pin === ADMIN_PIN) {
        console.log("✅ PIN ถูกต้อง - อนุญาตเข้าใช้งาน"); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
        res.json({ success: true });
    } else {
        console.log("❌ PIN ผิด"); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
        res.status(401).json({ error: "PIN ไม่ถูกต้อง" });
    }
});

// ✅ Debug Route - ดู routes ทั้งหมด
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    app._router.stack.forEach(function(r){
        if (r.route && r.route.path){
            routes.push({
                method: Object.keys(r.route.methods)[0].toUpperCase(),
                path: r.route.path
            });
        }
    });
    res.json({ routes: routes });
});
// API: ตรวจสอบ PIN
app.post("/api/admin/auth", (req, res) => {
    const { pin } = req.body;
    console.log("🔐 ตรวจสอบ PIN:", pin, "vs", ADMIN_PIN); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
    
    if (pin === ADMIN_PIN) {
        console.log("✅ PIN ถูกต้อง - อนุญาตเข้าใช้งาน"); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
        res.json({ success: true });
    } else {
        console.log("❌ PIN ผิด"); // ✅ เพิ่มบรรทัดนี้เพื่อ debug
        res.status(401).json({ error: "PIN ไม่ถูกต้อง" });
    }
});

// API: ดึงข้อมูลทั้งหมดสำหรับ Admin
app.get("/api/admin/tools", requireAdminAuth, async (req, res) => {
    try {
        const borrowedTools = await Tool.find({ status: "borrowed" }).sort({ borrowedAt: -1 });
        res.json(borrowedTools);
    } catch (error) {
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลได้" });
    }
});
// ...existing code...

// ✅ เพิ่ม API endpoint ที่หายไป
app.get("/api/admin/tools/catalog", requireAdminAuth, async (req, res) => {
    try {
        console.log('🔄 Admin: กำลังดึงรายการอุปกรณ์ catalog...');
        
        const tools = await ToolCatalog.find().sort({ createdAt: -1 });
        
        // นับจำนวนที่ยืมอยู่แต่ละอุปกรณ์
        const toolsWithStats = await Promise.all(
            tools.map(async (tool) => {
                const borrowedCount = await Tool.countDocuments({
                    name: tool.name,
                    status: "borrowed"
                });
                
                return {
                    ...tool.toObject(),
                    currentBorrowedCount: borrowedCount,
                    canDelete: borrowedCount === 0
                };
            })
        );
        
        const totalTools = tools.length;
        const totalBorrowed = await Tool.countDocuments({ status: "borrowed" });
        
        console.log(`✅ ส่งข้อมูล catalog: ${tools.length} รายการ`);
        
        res.json({
            success: true,
            data: toolsWithStats,
            stats: {
                totalTools,
                totalBorrowed,
                activeTools: tools.filter(t => t.isActive).length
            }
        });
        
    } catch (error) {
        console.error("❌ Error fetching admin tool catalog:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ เพิ่ม API endpoints อื่นๆ ที่หายไป
app.post("/api/admin/tools/catalog", requireAdminAuth, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "กรุณาระบุชื่ออุปกรณ์" 
            });
        }
        
        const newTool = new ToolCatalog({
            name: name.trim(),
            isNewTool: true,
            usageCount: 0,
            isActive: true
        });
        
        await newTool.save();
        
        console.log(`✨ เพิ่มอุปกรณ์ใหม่: ${name}`);
        
        res.json({
            success: true,
            data: newTool,
            message: "เพิ่มอุปกรณ์ใหม่สำเร็จ"
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                error: "อุปกรณ์นี้มีอยู่แล้ว" 
            });
        }
        
        console.error("❌ Error adding tool:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put("/api/admin/tools/catalog/:id", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "กรุณาระบุชื่ออุปกรณ์" 
            });
        }
        
        const updatedTool = await ToolCatalog.findByIdAndUpdate(
            id,
            { name: name.trim() },
            { new: true }
        );
        
        if (!updatedTool) {
            return res.status(404).json({ 
                success: false, 
                error: "ไม่พบอุปกรณ์ที่ต้องการแก้ไข" 
            });
        }
        
        console.log(`✏️ แก้ไขอุปกรณ์: ${updatedTool.name}`);
        
        res.json({
            success: true,
            data: updatedTool,
            message: "แก้ไขอุปกรณ์สำเร็จ"
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                error: "ชื่ออุปกรณ์นี้มีอยู่แล้ว" 
            });
        }
        
        console.error("❌ Error updating tool:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete("/api/admin/tools/catalog/:id", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const toolToDelete = await ToolCatalog.findById(id);
        if (!toolToDelete) {
            return res.status(404).json({ success: false, error: 'ไม่พบอุปกรณ์ที่ต้องการลบ' });
        }
        
        // ตรวจสอบว่ายังมีคนยืมอุปกรณ์นี้อยู่หรือไม่
        const borrowedCount = await Tool.countDocuments({
            name: toolToDelete.name,
            status: "borrowed"
        });
        
        if (borrowedCount > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `ไม่สามารถลบได้ มี ${borrowedCount} รายการที่ยืมอยู่`,
                borrowedCount
            });
        }
        
        await ToolCatalog.findByIdAndDelete(id);
        
        console.log(`🗑️ ลบอุปกรณ์: ${toolToDelete.name}`);
        
        res.json({
            success: true,
            message: "ลบอุปกรณ์สำเร็จ"
        });
    } catch (error) {
        console.error("❌ Error deleting tool:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ...existing code...
// API: แก้ไขข้อมูลการยืม
app.put("/api/admin/tools/:id", requireAdminAuth, async (req, res) => {
    try {
        const { quantity, site, note } = req.body;
        const updatedTool = await Tool.findByIdAndUpdate(
            req.params.id,
            { quantity, site, note },
            { new: true }
        );
        if (!updatedTool) {
            return res.status(404).json({ error: "ไม่พบข้อมูล" });
        }
        res.json(updatedTool);
    } catch (error) {
        res.status(500).json({ error: "ไม่สามารถแก้ไขได้" });
    }
});

// API: ลบรายการการยืม
app.delete("/api/admin/tools/:id", requireAdminAuth, async (req, res) => {
    try {
        const deletedTool = await Tool.findByIdAndDelete(req.params.id);
        if (!deletedTool) {
            return res.status(404).json({ error: "ไม่พบข้อมูล" });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "ไม่สามารถลบได้" });
    }
});

// API: เพิ่มรายการการยืมแบบ Manual
app.post("/api/admin/tools", requireAdminAuth, async (req, res) => {
    try {
        const { name, quantity, site, note, borrowedAt } = req.body;
        const newTool = new Tool({
            name,
            quantity: parseInt(quantity),
            site,
            note: note || "",
            status: "borrowed",
            borrowedAt: borrowedAt ? new Date(borrowedAt) : new Date()
        });
        await newTool.save();
        res.status(201).json(newTool);
    } catch (error) {
        res.status(500).json({ error: "ไม่สามารถเพิ่มได้" });
    }
});

// API: จัดการรายชื่อหน้างาน
app.get("/api/admin/sites", requireAdminAuth, async (req, res) => {
    try {
        const sites = await Tool.distinct("site");
        res.json(sites);
    } catch (error) {
        res.status(500).json({ error: "ไม่สามารถดึงข้อมูลหน้างานได้" });
    }
});

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

// ✅ สร้าง HTTP Server สำหรับ WebSocket
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ✅ เพิ่ม Schema สำหรับรายการอุปกรณ์
const toolCatalogSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    isNewTool: { type: Boolean, default: true }, // เปลี่ยนจาก isNew เป็น isNewTool
    usageCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
}, {
    suppressReservedKeysWarning: true // ป้องกัน warning
});

const ToolCatalog = mongoose.model("ToolCatalog", toolCatalogSchema);

// ✅ Migration ข้อมูลเดิมจาก script.js (รันครั้งเดียว) - อัปเดตให้ครบถ้วน
const defaultTools = [
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

async function migrateDefaultTools() {
    try {
        const existingCount = await ToolCatalog.countDocuments();
        if (existingCount === 0) {
            console.log("🔄 Migration: เริ่มโอนย้ายรายการอุปกรณ์เดิม...");
            
            const toolsToMigrate = defaultTools.map(name => ({
                name,
                isNewTool: false, // อุปกรณ์เดิมไม่ต้องแสดง "ใหม่"
                usageCount: 0,
                isActive: true
            }));
            
            await ToolCatalog.insertMany(toolsToMigrate);
            console.log(`✅ Migration สำเร็จ: โอนย้าย ${defaultTools.length} รายการ`);
        } else {
            console.log(`ℹ️ พบข้อมูลอุปกรณ์ ${existingCount} รายการ - ข้าม Migration`);
        }
    } catch (error) {
        console.error("❌ Migration Error:", error);
    }
}

// ✅ รัน Migration หลัง MongoDB Connect
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    autoIndex: true,
})
.then(async () => {
    console.log("✅ MongoDB Connected");
    await migrateDefaultTools(); // รัน Migration
})
.catch(err => console.error("❌ MongoDB Connection Error:", err));

// ✅ WebSocket Connection
io.on('connection', (socket) => {
    console.log('👤 Client เชื่อมต่อ WebSocket:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('👋 Client ตัดการเชื่อมต่อ:', socket.id);
    });
});

// ✅ API: ดึงรายการอุปกรณ์ทั้งหมด (สำหรับหน้าหลัก)
app.get("/api/tools/catalog", async (req, res) => {
    try {
        const tools = await ToolCatalog.find({ isActive: true })
            .sort({ 
                isNewTool: -1,    // ใหม่ขึ้นก่อน
                usageCount: -1,   // ยืมบ่อยขึ้นก่อน  
            });
        
        res.json({
            success: true,
            data: tools,
            total: tools.length
        });
    } catch (error) {
        console.error("❌ Error fetching tool catalog:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ API: ดึงรายการอุปกรณ์สำหรับ Admin (พร้อมสถิติ)
app.get("/api/admin/tools/catalog", requireAdminAuth, async (req, res) => {
    try {
        const tools = await ToolCatalog.find().sort({ createdAt: -1 });
        
        // นับจำนวนที่ยืมอยู่แต่ละอุปกรณ์
        const toolsWithStats = await Promise.all(
            tools.map(async (tool) => {
                const borrowedCount = await Tool.countDocuments({
                    name: tool.name,
                    status: "borrowed"
                });
                
                return {
                    ...tool.toObject(),
                    currentBorrowedCount: borrowedCount,
                    canDelete: borrowedCount === 0
                };
            })
        );
        
        const totalTools = tools.length;
        const totalBorrowed = await Tool.countDocuments({ status: "borrowed" });
        
        res.json({
            success: true,
            data: toolsWithStats,
            stats: {
                totalTools,
                totalBorrowed,
                activeTools: tools.filter(t => t.isActive).length
            }
        });
        
    } catch (error) {
        console.error("❌ Error fetching admin tool catalog:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ API: เพิ่มอุปกรณ์ใหม่ (Admin)
app.post("/api/admin/tools/catalog", requireAdminAuth, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "กรุณาระบุชื่ออุปกรณ์" 
            });
        }
        
        const newTool = new ToolCatalog({
            name: name.trim(),
            isNewTool: true,
            usageCount: 0,
            isActive: true
        });
        
        await newTool.save();
        
        console.log(`✨ เพิ่มอุปกรณ์ใหม่: ${name}`);
        
        // ✅ ส่งข้อมูลผ่าน WebSocket ไปยัง clients ทั้งหมด
        io.emit('toolAdded', {
            tool: newTool,
            message: `เพิ่มอุปกรณ์ใหม่: ${name}`
        });
        
        res.json({
            success: true,
            data: newTool,
            message: "เพิ่มอุปกรณ์ใหม่สำเร็จ"
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                error: "อุปกรณ์นี้มีอยู่แล้ว" 
            });
        }
        
        console.error("❌ Error adding tool:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ API: แก้ไขชื่ออุปกรณ์ (Admin)
app.put("/api/admin/tools/catalog/:id", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        if (!name || name.trim().length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: "กรุณาระบุชื่ออุปกรณ์" 
            });
        }
        
        const updatedTool = await ToolCatalog.findByIdAndUpdate(
            id,
            { name: name.trim() },
            { new: true }
        );
        
        if (!updatedTool) {
            return res.status(404).json({ 
                success: false, 
                error: "ไม่พบอุปกรณ์ที่ต้องการแก้ไข" 
            });
        }
        
        console.log(`✏️ แก้ไขอุปกรณ์: ${updatedTool.name}`);
        
        // ✅ ส่งข้อมูลผ่าน WebSocket
        io.emit('toolUpdated', {
            tool: updatedTool,
            message: `แก้ไขอุปกรณ์: ${updatedTool.name}`
        });
        
        res.json({
            success: true,
            data: updatedTool,
            message: "แก้ไขอุปกรณ์สำเร็จ"
        });
        
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ 
                success: false, 
                error: "ชื่ออุปกรณ์นี้มีอยู่แล้ว" 
            });
        }
        
        console.error("❌ Error updating tool:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ API: ลบอุปกรณ์ (Admin) - ตรวจสอบว่ายังมีคนยืมอยู่หรือไม่
app.delete("/api/admin/tools/catalog/:id", requireAdminAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        const toolToDelete = await ToolCatalog.findById(id);
        if (!toolToDelete) {
            return res.status(404).json({ success: false, error: 'ไม่พบอุปกรณ์ที่ต้องการลบ' });
        }
        
        // ✅ ตรวจสอบว่ายังมีคนยืมอุปกรณ์นี้อยู่หรือไม่
        const borrowedCount = await Tool.countDocuments({
            name: toolToDelete.name,
            status: "borrowed"
        });
        
        if (borrowedCount > 0) {
            return res.status(400).json({ 
                success: false, 
                error: `ไม่สามารถลบได้ มี ${borrowedCount} รายการที่ยืมอยู่`,
                borrowedCount
            });
        }
        
        await ToolCatalog.findByIdAndDelete(id);
        
        console.log(`🗑️ ลบอุปกรณ์: ${toolToDelete.name}`);
        
        // ✅ ส่งข้อมูลผ่าน WebSocket
        io.emit('toolDeleted', {
            toolId: id,
            toolName: toolToDelete.name,
            message: `ลบอุปกรณ์: ${toolToDelete.name}`
        });
        
        res.json({
            success: true,
            message: "ลบอุปกรณ์สำเร็จ"
        });
    } catch (error) {
        console.error("❌ Error deleting tool:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ✅ 404 Handler สำหรับ debug
app.use('*', (req, res) => {
    console.log('❌ 404 Not Found:', req.method, req.originalUrl);
    res.status(404).json({ 
        success: false, 
        error: 'Route not found',
        method: req.method,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// ✅ แก้ไข app.listen ให้ใช้ server.listen แทน
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready for real-time updates`);
    console.log(`🗑️ Auto Cleanup: เปิดใช้งาน (ลบข้อมูลเก่ากว่า 90 วันทุกวันเที่ยงคืน)`);
    console.log(`📊 Manual Cleanup: GET /api/data-stats, DELETE /api/cleanup`);
});