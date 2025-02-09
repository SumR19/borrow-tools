require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
app.use(cors({
    origin: "*",  // อนุญาตทุกโดเมน
    methods: ["GET", "POST", "DELETE"]
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

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

        // ✅ ตรวจสอบค่าของ tools ก่อนบันทึก
        console.log("📌 ข้อมูลที่ได้รับ:", tools);

        await Tool.insertMany(tools.map(tool => ({
            name: tool.name,
            site,
            quantity: Number(tool.quantity) || 1,  // ✅ บังคับให้เป็นตัวเลข
            note: note || ""
        })));

        res.json({ message: "บันทึกสำเร็จ!" });
    } catch (err) {
        console.error("❌ Error บันทึกอุปกรณ์:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.post("/return-item", async (req, res) => {
    try {
        const { site, name } = req.body;
        if (!site || !name) return res.status(400).json({ error: "ต้องระบุหน้างานและชื่ออุปกรณ์!" });

        // ✅ ตรวจสอบว่ามีอุปกรณ์นี้ในฐานข้อมูลไหม
        const tool = await Tool.findOne({ site, name });

        if (!tool) {
            return res.status(404).json({ error: `ไม่พบอุปกรณ์ "${name}" ในหน้างาน "${site}"` });
        }

        if (tool.quantity > 1) {
            // ✅ ถ้ามีมากกว่า 1 ให้ลดจำนวนลง
            await Tool.updateOne({ site, name }, { $inc: { quantity: -1 } });
            res.json({ message: `คืน ${name} 1 ชิ้นจากหน้างาน ${site} สำเร็จ!` });
        } else {
            // ✅ ถ้ามีแค่ 1 ให้ลบออก
            await Tool.deleteOne({ site, name });
            res.json({ message: `คืน ${name} สำเร็จจากหน้างาน ${site}` });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = 3000;
const path = require("path");

// ✅ ให้ Express โหลดไฟล์ในโฟลเดอร์ public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
