require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.static(path.join(__dirname, "..", "public")));
const PORT = Number(process.env.PORT) || 3000;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill it in.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
// Serve website files from the public folder
app.use(express.static(path.join(__dirname, "..", "public")));

const allowedFields = [
  "title", "description", "ingredients", "instructions",
  "prep_time", "cook_time", "servings", "category", "image_url", "author"
];

function cleanRecipe(body) {
  const recipe = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) recipe[field] = body[field];
  }
  for (const field of ["title", "description", "ingredients", "instructions", "category", "image_url", "author"]) {
    if (typeof recipe[field] === "string") recipe[field] = recipe[field].trim();
  }
  if (Array.isArray(recipe.ingredients)) {
    recipe.ingredients = recipe.ingredients.map(x => String(x).trim()).filter(Boolean);
  } else if (typeof recipe.ingredients === "string") {
    recipe.ingredients = recipe.ingredients.split(/\r?\n|,/).map(x => x.trim()).filter(Boolean);
  }
  if (recipe.prep_time !== undefined) recipe.prep_time = Number(recipe.prep_time);
  if (recipe.cook_time !== undefined) recipe.cook_time = Number(recipe.cook_time);
  if (recipe.servings !== undefined) recipe.servings = Number(recipe.servings);
  return recipe;
}

function validateRecipe(recipe, partial = false) {
  const required = ["title", "description", "ingredients", "instructions", "category", "author"];
  for (const field of required) {
    if (!partial && (recipe[field] === undefined || recipe[field] === "" ||
      (Array.isArray(recipe[field]) && recipe[field].length === 0))) {
      return `${field.replace("_", " ")} is required.`;
    }
    if (partial && recipe[field] !== undefined && (recipe[field] === "" ||
      (Array.isArray(recipe[field]) && recipe[field].length === 0))) {
      return `${field.replace("_", " ")} cannot be empty.`;
    }
  }
  if (recipe.title && recipe.title.length > 120) return "Title must be 120 characters or fewer.";
  if (recipe.prep_time !== undefined && (!Number.isInteger(recipe.prep_time) || recipe.prep_time < 0)) return "Prep time must be a non-negative whole number.";
  if (recipe.cook_time !== undefined && (!Number.isInteger(recipe.cook_time) || recipe.cook_time < 0)) return "Cook time must be a non-negative whole number.";
  if (recipe.servings !== undefined && (!Number.isInteger(recipe.servings) || recipe.servings < 1)) return "Servings must be a positive whole number.";
  if (recipe.ingredients !== undefined && !Array.isArray(recipe.ingredients)) return "Ingredients must be a list.";
  if (recipe.image_url && !/^https?:\/\/.+/i.test(recipe.image_url)) return "Image URL must start with http:// or https://.";
  return null;
}

function sendDbError(res, error) {
  console.error("Database error:", error.message);
  return res.status(500).json({ error: "Database request failed. Check your Supabase table and environment settings." });
}

app.get("/api/health", (_req, res) => res.json({ status: "ok", message: "Recipe Sharing Platform API is running." }));

app.get("/api/recipes", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const category = String(req.query.category || "").trim();
    let query = supabase.from("recipes").select("*").order("created_at", { ascending: false });
    if (category && category !== "All") query = query.eq("category", category);
    if (search) query = query.or(`title.ilike.%${search.replace(/[%(),]/g, " ")}%,description.ilike.%${search.replace(/[%(),]/g, " ")}%`);
    const { data, error } = await query;
    if (error) return sendDbError(res, error);
    res.json(data);
  } catch (error) { sendDbError(res, error); }
});

app.get("/api/recipes/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("recipes").select("*").eq("id", req.params.id).single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Recipe not found." });
      return sendDbError(res, error);
    }
    res.json(data);
  } catch (error) { sendDbError(res, error); }
});

app.post("/api/recipes", async (req, res) => {
  const recipe = cleanRecipe(req.body || {});
  const validationError = validateRecipe(recipe);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const { data, error } = await supabase.from("recipes").insert([{
      ...recipe,
      prep_time: recipe.prep_time ?? 0,
      cook_time: recipe.cook_time ?? 0,
      servings: recipe.servings ?? 1,
      image_url: recipe.image_url || null
    }]).select("*").single();
    if (error) return sendDbError(res, error);
    res.status(201).json(data);
  } catch (error) { sendDbError(res, error); }
});

app.put("/api/recipes/:id", async (req, res) => {
  const recipe = cleanRecipe(req.body || {});
  if (!Object.keys(recipe).length) return res.status(400).json({ error: "Provide at least one field to update." });
  const validationError = validateRecipe(recipe, true);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const { data, error } = await supabase.from("recipes").update(recipe).eq("id", req.params.id).select("*").single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Recipe not found." });
      return sendDbError(res, error);
    }
    res.json(data);
  } catch (error) { sendDbError(res, error); }
});

app.delete("/api/recipes/:id", async (req, res) => {
  try {
    const { data, error } = await supabase.from("recipes").delete().eq("id", req.params.id).select("id").single();
    if (error) {
      if (error.code === "PGRST116") return res.status(404).json({ error: "Recipe not found." });
      return sendDbError(res, error);
    }
    res.json({ message: "Recipe deleted successfully.", id: data.id });
  } catch (error) { sendDbError(res, error); }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "API route not found." });
  }

  res.sendFile(path.join(__dirname, "..", "public", "index.html"), err => {
    if (err) next(err);
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error." });
});

app.listen(PORT, () => console.log(`Recipe Sharing Platform running at http://localhost:${PORT}`));
