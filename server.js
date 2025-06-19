require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

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
    status: { type: String, default: "borrowed" }, // "borrowed" หรือ "returned"
    returnedBy: { type: String, default: "" },
    returnNote: { type: String, default: "" }
});

const Tool = mongoose.model("Tool", toolSchema);

// ✅ API: ดึงหมวดหมู่หน้างานทั้งหมด (อัตโนมัติ)
app.get("/categories", async (req, res) => {
    try {
        const categories = await Tool.distinct("site", { status: "borrowed" });
        console.log("📂 หมวดหมู่ที่พบ:", categories);
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
        console.log(`📋 ดึงข้อมูลหมวดหมู่: ${category || 'ทั้งหมด'} จำนวน: ${tools.length} รายการ`);
        
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

// ✅ API: สถิติตามหมวดหมู่
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
        
        console.log("📊 สถิติตามหมวดหมู่:", stats);
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: บันทึกอุปกรณ์ที่ยืม
app.post("/borrow", async (req, res) => {
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
        console.log("📂 หมวดหมู่: ระบบจะจัดหมวดหมู่อัตโนมัติ");
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
            
            console.log(`✅ คืนอุปกรณ์: "${name}" 1 ชิ้น จากหมวดหมู่: "${site}" (เหลือ: ${tool.quantity - 1} ชิ้น)`);
            console.log(`🕐 เวลาที่คืน: ${thaiTime}`);
            console.log(`👤 คืนโดย: ${returnedBy}`);
            
            res.json({ message: `คืน ${name} 1 ชิ้นจากหมวดหมู่ ${site} สำเร็จ!` });
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
            
            console.log(`✅ คืนอุปกรณ์: "${name}" ทั้งหมด จากหมวดหมู่: "${site}"`);
            console.log(`🕐 เวลาที่คืน: ${thaiTime}`);
            console.log(`👤 คืนโดย: ${returnedBy}`);
            
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
        
        console.log(`✅ คืนอุปกรณ์: "${name}" ทั้งหমด ${tool.quantity} ชิ้น จากหมวดหมู่: "${site}"`);
        console.log(`🕐 เวลาที่คืน: ${thaiTime}`);
        console.log(`👤 คืนโดย: ${returnedBy}`);

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

// ✅ Start Server
const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));