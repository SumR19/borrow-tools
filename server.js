require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

// ✅ ตรวจสอบว่า MONGO_URI ถูกต้องหรือไม่
console.log("🔍 Connecting to MongoDB:", process.env.MONGO_URI);

// ✅ แก้ไข: ใช้ CORS แค่ครั้งเดียว
app.use(cors({
    origin: "*",  // ✅ อนุญาตให้ทุกโดเมนเข้าถึง API
    methods: ["GET", "POST", "DELETE"], // ✅ อนุญาตเฉพาะบาง Method
    allowedHeaders: ["Content-Type"] // ✅ อนุญาตเฉพาะ Header ที่จำเป็น
}));

app.use(express.json());

// ✅ เชื่อมต่อ MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    autoIndex: true, // ✅ ลดความล่าช้าในการค้นหา
})
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB Connection Error:", err))

const toolSchema = new mongoose.Schema({
    name: String,
    site: String,
    quantity: Number,  // ✅ เพิ่มจำนวนอุปกรณ์ที่ยืม
    note: { type: String, default: "" }
});
const Tool = mongoose.model("Tool", toolSchema);

// ✅ API: ดึงรายการอุปกรณ์ที่ถูกยืม แยกตามหน้างาน
app.get("/borrowed-tools", async (req, res) => {
    try {
        const tools = await Tool.find();
        res.json(tools);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: บันทึกอุปกรณ์ที่ยืม พร้อมจำนวน
app.post("/borrow", async (req, res) => {
    try {
        const { site, tools, note } = req.body;
        if (!site) return res.status(400).json({ error: "ต้องระบุชื่อหน้างาน!" });

        console.log("📌 ข้อมูลที่ได้รับ:", tools);

        await Tool.insertMany(tools.map(tool => ({
            name: tool.name,
            site,
            quantity: Number(tool.quantity) || 1,
            note: note || ""
        })));

        res.json({ message: "บันทึกสำเร็จ!" });
    } catch (err) {
        console.error("❌ Error บันทึกอุปกรณ์:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ✅ API: คืนอุปกรณ์เฉพาะชิ้นในหน้างาน
app.post("/return-item", async (req, res) => {
    try {
        const { site, name } = req.body;
        if (!site || !name) return res.status(400).json({ error: "ต้องระบุหน้างานและชื่ออุปกรณ์!" });

        const tool = await Tool.findOne({ site, name });

        if (!tool) {
            return res.status(404).json({ error: `ไม่พบอุปกรณ์ "${name}" ในหน้างาน "${site}"` });
        }

        if (tool.quantity > 1) {
            await Tool.updateOne({ site, name }, { $inc: { quantity: -1 } });
            res.json({ message: `คืน ${name} 1 ชิ้นจากหน้างาน ${site} สำเร็จ!` });
        } else {
            await Tool.deleteOne({ site, name });
            res.json({ message: `คืน ${name} สำเร็จจากหน้างาน ${site}` });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ✅ ตั้งค่า Static Files
const path = require("path");

// ✅ ให้ Express โหลดไฟล์ในโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ✅ เพิ่มเส้นทางสำหรับ api-ui.html
app.get("/api-ui", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "api-ui.html"));
});

// ✅ เปิดเซิร์ฟเวอร์
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
