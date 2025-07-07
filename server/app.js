import express from "express";
import cors from "cors";
import axios from "axios";
import fs from "fs";
import path from "path";
import { Groq } from "groq-sdk";
import { SarvamAIClient } from "sarvamai";
import { fileURLToPath } from "url";
import multer from "multer";
import wavConcat from "wav-concat";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import fetch from "node-fetch";
import FormData from "form-data";
import dotenv from "dotenv";
dotenv.config(); // ✅ Loads .env variables
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

globalThis.fetch = fetch;
globalThis.FormData = FormData;

ffmpeg.setFfmpegPath(ffmpegPath);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // ⚠️ Don't hardcode in production
});
const GROQ_API_KEY = process.env.GROQ_API_KEY; // ⚠️ WARNING: For demo only!

const sarvamClient = new SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY, // ✅ Replace this with your real key
});
app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    const inputPath = req.file.path;
    const outputPath = `${inputPath}.wav`;

    // 🎯 Convert uploaded audio to WAV using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("wav")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    console.log("✅ Converted to WAV:", outputPath);

    // 🧠 Use raw fetch instead of broken SDK
    const form = new FormData();
    form.append("file", fs.createReadStream(outputPath), {
      filename: "converted.wav",
      contentType: "audio/wav",
    });
    form.append("language_code", "en-IN");
    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ STT failed:", response.status, errText);
      return res.status(500).json({ error: "STT failed", detail: errText });
    }

    const result = await response.json();
    console.log("✅ Full STT Response:", result);

    const transcription = result?.transcript || "Transcription not found";
    console.log("✅ Transcription:", transcription);

    res.json({ transcription });

    // 🧹 Cleanup
    fs.unlink(inputPath, () => {});
    fs.unlink(outputPath, () => {});
  } catch (err) {
    console.error("❌ Transcription Error:", err.message);
    res
      .status(500)
      .json({ error: "Transcription failed", detail: err.message });
  }
});
app.post("/tts", async (req, res) => {
  const { text } = req.body;

  if (!text || text.trim() === "") {
    return res.status(400).json({ error: "Text is required for TTS." });
  }

  const CHUNK_SIZE = 300;
  const splitText = (str) => {
    const chunks = [];
    let remaining = str.trim();
    while (remaining.length > 0) {
      let chunk = remaining.slice(0, CHUNK_SIZE);
      const lastPeriod = chunk.lastIndexOf(".");
      if (lastPeriod > 100) chunk = chunk.slice(0, lastPeriod + 1);
      chunks.push(chunk.trim());
      remaining = remaining.slice(chunk.length).trim();
    }
    return chunks;
  };

  try {
    const chunks = splitText(text);
    const audioPaths = [];

    for (let i = 0; i < chunks.length; i++) {
      const response = await sarvamClient.textToSpeech.convert({
        text: chunks[i],
        model: "bulbul:v2",
        speaker: "vidya",
        target_language_code: "en-IN",
        pace: "0.7",
      });

      const audioData = response.audios?.[0];
      if (!audioData) throw new Error("No audio returned for chunk");

      const buffer = Buffer.from(audioData, "base64");
      const audioDir = path.join(__dirname, "audios");
      fs.mkdirSync(audioDir, { recursive: true });

      const filePath = path.join(audioDir, `chunk_${i}_${Date.now()}.wav`);
      fs.writeFileSync(filePath, buffer);
      audioPaths.push(filePath);
    }

    // Create concat list file
    const concatListPath = path.join(
      __dirname,
      "audios",
      `list_${Date.now()}.txt`
    );
    const concatListContent = audioPaths.map((p) => `file '${p}'`).join("\n");
    fs.writeFileSync(concatListPath, concatListContent);

    // Merge using ffmpeg
    const outputPath = path.join(
      __dirname,
      "audios",
      `merged_${Date.now()}.wav`
    );
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(concatListPath)
        .inputOptions("-f", "concat", "-safe", "0")
        .outputOptions("-c", "copy")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    // Cleanup
    setTimeout(() => {
      for (const file of [...audioPaths, concatListPath]) {
        fs.unlink(file, () => {});
      }
    }, 15000);

    res.sendFile(outputPath, () => {
      setTimeout(() => fs.unlink(outputPath, () => {}), 60000);
    });
  } catch (error) {
    console.error("TTS backend error:", error.message);
    res.status(500).json({ error: "TTS failed to process long input." });
  }
});

const TABLE_LIST = [
  "Groceries",
  "cloth_accessories",
  "Electronics",
  "body_care_diet",
  "pet",
  "Household",
  "school_utensils",
];
async function fetchAllSubCategories(tableName) {
  const PAGE_SIZE = 1000;
  let from = 0;
  let to = PAGE_SIZE - 1;
  let allRows = [];
  let finished = false;

  while (!finished) {
    const { data, error } = await supabase
      .from(tableName)
      .select("sub_category", { head: false })
      .neq("sub_category", null)
      .range(from, to);

    if (error) {
      console.error("❌ Pagination Fetch Error:", error.message);
      break;
    }

    if (data.length === 0) {
      finished = true;
    } else {
      allRows.push(...data);
      from += PAGE_SIZE;
      to += PAGE_SIZE;
    }
  }

  return allRows;
}

app.post("/product-suggest", async (req, res) => {
  const userPrompt = req.body.prompt;
  if (!userPrompt)
    return res.status(400).json({ error: "No prompt provided." });
  console.log("📩 User Prompt:", userPrompt);

  // Step 1: Choose Table
  const tablePrompt = `
You are a product assistant. Choose the best matching table from:
${TABLE_LIST.join(", ")}
User said: "${userPrompt}"
Strictly Return only exact table name or "Unknown".
Return only exact table name from the list above (case-sensitive). Do not add punctuation.`;

  let chosenTable = "Unknown";
  try {
    const tableRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{ role: "system", content: tablePrompt }],
    });

    chosenTable = tableRes.choices[0].message.content.trim();
    console.log("🔍 Chosen Table:", chosenTable);
  } catch (err) {
    console.error("❌ Groq Table Selection Error:", err.message);
    return res
      .status(500)
      .json({ error: "Table selection failed", detail: err.message });
  }

  if (!TABLE_LIST.includes(chosenTable)) {
    console.warn("⚠️ Table not in list. Received:", chosenTable);
    return res.status(400).json({ error: "No valid table match." });
  }

  // Step 2: Get Categories
  console.log("📥 Fetching categories from table:", chosenTable);
  const categoriesData = await fetchAllSubCategories(chosenTable);
  console.log("📊 Total Fetched Subcategories:", categoriesData.length);
  if (!categoriesData || categoriesData.length === 0) {
    console.error("❌ No categories fetched.");
    return res.status(500).json({ error: "No categories found" });
  }

  const categoryList = [
    ...new Set(
      categoriesData
        .map((row) => row.sub_category?.trim().toLowerCase())
        .filter((val) => !!val)
    ),
  ];
  console.log("📦 Available Categories:", categoryList);

  // Step 3: Extract JSON
  const includeSize = chosenTable === "cloth_accessories";
  const extractPrompt = `
You are a smart product filter extractor.
User query: "${userPrompt}"
Available categories:
${categoryList.map((c) => `- ${c}`).join("\n")}

Return this JSON:
{
  "source_table": "${chosenTable}",
  "sub_category": "exact match from list above or null",
  "color": "if mentioned, else null",
  "brand": "if mentioned, else null",
  "budget": "if mentioned (numeric), else null",
  "min_rating": "if mentioned (numeric) or implied (e.g., 'very good' = 4, 'excellent' or 'best' = 4.5+), else null"${
    includeSize ? ',\n  "size": "if mentioned, else null"' : ""
  }
}
  Do not guess similar categories (e.g., "men's clothing"). Match exactly.
  Respond ONLY with clean JSON. Do not add explanations or markdown.`;

  try {
    const extractRes = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{ role: "system", content: extractPrompt }],
    });

    let content = extractRes.choices[0].message.content.trim();
    console.log("🧾 Groq Raw Extract:", content);

    content = content.replace(/```json|```/g, "");
    const firstClosingBrace = content.indexOf("}") + 1;
    const jsonString = content.slice(0, firstClosingBrace);
    const parsed = JSON.parse(jsonString);
    parsed.table = chosenTable;

    if (!parsed.sub_category || !categoryList.includes(parsed.sub_category)) {
      console.warn("⚠️ Groq returned unknown category. Applying fallback.");
      parsed.sub_category = categoryList[0] || null;
    }

    console.log("✅ Final Parsed JSON:", parsed);
    return res.json({ parsed });
  } catch (err) {
    console.error("❌ JSON Parse Error:", err.message);
    return res
      .status(500)
      .json({ error: "Parsing failed", detail: err.message });
  }
});

app.post("/api/product-search", async (req, res) => {
  const {
    table: table_name,
    sub_category,
    budget,
    color,
    brand,
    min_rating,
    size,
  } = req.body;

  console.log("📥 Product Search Input:", {
    table_name,
    sub_category,
    budget,
    color,
    brand,
  });

  if (!table_name || !sub_category) {
    console.warn("⚠️ Missing table or category.");
    return res.status(400).json({ error: "Missing table or category" });
  }

  const TABLE_SCHEMAS = {
    Groceries: ["sub_category"],
    cloth_accessories: ["sub_category", "color", "size"],
    Electronics: ["sub_category"],
    body_care_diet: ["sub_category", "color"],
    pet: ["sub_category"],
    Household: ["sub_category"],
    school_utensils: ["sub_category"],
  };

  const allowed = TABLE_SCHEMAS[table_name] || [];

  try {
    console.log("🧪 Executing Supabase Query with:");
    console.log("➡️ Subcategory:", sub_category);
    console.log("➡️ Budget:", budget);
    console.log("➡️ Color:", color);
    console.log("➡️ Brand:", brand);
    console.log("➡️ rating:", min_rating);
    console.log("➡️ size:", size);

    let query = supabase
      .from(table_name)
      .select("*")
      .ilike("sub_category", `%${sub_category.trim().toLowerCase()}%`);
    if (budget) {
      query = query.lte("price", budget); // ✅ UPDATED: price is double precision
    }
    if (color && allowed.includes("color")) {
      query = query.ilike("color", `%${color.trim().toLowerCase()}%`); // ✅ UPDATED
    }
    if (min_rating !== null && !isNaN(min_rating)) {
      query = query.gte("rating", parseFloat(min_rating));
    }

    if (size && allowed.includes("size")) {
      query = query.ilike("size", `%${size.trim().toLowerCase()}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("❌ Supabase Fetch Error:", error.message);
      return res.status(500).json({ error: "Supabase fetch error" }); // ✅ UPDATED
    }

    const filtered = (data || []).filter((item) =>
      brand ? item.name.toLowerCase().includes(brand.toLowerCase()) : true
    );
    const results = filtered.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image_url,
      sub_category: item.sub_category,
    }));
    console.log(
      "🆔 Product IDs:",
      results.map((item) => item.id)
    );
    console.log("✅ Fetched Products:", results.length);
    res.json({ results });
  } catch (err) {
    console.error("❌ Supabase Fetch Error:", err.message);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
