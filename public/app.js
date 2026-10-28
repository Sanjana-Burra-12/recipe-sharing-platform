const API_URL = "/api/recipes";
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80";
const grid = document.getElementById("recipe-grid");
const searchInput = document.getElementById("search-input");
const resultsCount = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const recipeDialog = document.getElementById("recipe-dialog");
const detailDialog = document.getElementById("detail-dialog");
const recipeForm = document.getElementById("recipe-form");
const formError = document.getElementById("form-error");
let recipes = [];
let activeCategory = "All";
let searchTimer;

const favoriteIds = new Set(JSON.parse(localStorage.getItem("recipeHavenFavorites") || "[]").map(String));

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[ch]);
}
function safeImageUrl(url) {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch { return ""; }
}
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("show"), 2800);
}
function setLoading(message = "Gathering something delicious…") {
  grid.innerHTML = `<div class="loading-state">${escapeHTML(message)}</div>`;
}
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  let payload;
  try { payload = await response.json(); } catch { payload = {}; }
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}
async function loadRecipes() {
  setLoading();
  const params = new URLSearchParams();
  if (searchInput.value.trim()) params.set("search", searchInput.value.trim());
  if (activeCategory !== "All") params.set("category", activeCategory);
  try {
    recipes = await request(`${API_URL}?${params.toString()}`);
    renderRecipes();
  } catch (error) {
    grid.innerHTML = `<div class="loading-state">Could not load recipes. ${escapeHTML(error.message)}<br><br><button class="btn btn-outline" onclick="loadRecipes()">Try again</button></div>`;
    resultsCount.textContent = "Connection issue";
    emptyState.classList.add("hidden");
  }
}
function renderRecipes() {
  resultsCount.textContent = `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"} to inspire you`;
  emptyState.classList.toggle("hidden", recipes.length !== 0);
  grid.classList.toggle("hidden", recipes.length === 0);
  if (!recipes.length) { grid.innerHTML = ""; return; }
  grid.innerHTML = recipes.map(recipe => {
    const image = safeImageUrl(recipe.image_url);
    const isFav = favoriteIds.has(String(recipe.id));
    return `<article class="recipe-card">
      <div class="card-image-wrap">
        ${image ? `<img class="card-image" src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">` : ""}
        <div class="card-placeholder" style="display:${image ? "none" : "grid"}">🍲</div>
        <span class="category-tag">${escapeHTML(recipe.category || "Other")}</span>
        <button class="favorite-btn ${isFav ? "is-favorite" : ""}" data-favorite="${recipe.id}" aria-label="${isFav ? "Remove from" : "Add to"} favorites" title="Save favorite">${isFav ? "♥" : "♡"}</button>
      </div>
      <div class="card-content">
        <div class="card-meta"><span>◷ ${Number(recipe.prep_time || 0) + Number(recipe.cook_time || 0)} min</span><span>♧ ${Number(recipe.servings || 1)} servings</span></div>
        <h3>${escapeHTML(recipe.title)}</h3><p>${escapeHTML(recipe.description)}</p>
        <div class="card-footer"><span class="author">By <strong>${escapeHTML(recipe.author || "Guest")}</strong></span>
          <div class="card-actions"><button class="text-action" data-view="${recipe.id}">View recipe ↗</button><button class="text-action" data-edit="${recipe.id}" aria-label="Edit recipe">Edit</button><button class="text-action delete" data-delete="${recipe.id}" aria-label="Delete recipe">Delete</button></div>
        </div>
      </div>
    </article>`;
  }).join("");
}
function openForm(recipe = null) {
  recipeForm.reset();
  document.getElementById("recipe-id").value = recipe ? recipe.id : "";
  document.getElementById("dialog-title").textContent = recipe ? "Edit your recipe" : "Share a recipe";
  document.getElementById("save-recipe").textContent = recipe ? "Save changes ↗" : "Publish recipe ↗";
  document.getElementById("title").value = recipe?.title || "";
  document.getElementById("description").value = recipe?.description || "";
  document.getElementById("ingredients").value = Array.isArray(recipe?.ingredients) ? recipe.ingredients.join("\n") : "";
  document.getElementById("instructions").value = recipe?.instructions || "";
  document.getElementById("category").value = recipe?.category || "Breakfast";
  document.getElementById("author").value = recipe?.author || "";
  document.getElementById("prep-time").value = recipe?.prep_time ?? 10;
  document.getElementById("cook-time").value = recipe?.cook_time ?? 20;
  document.getElementById("servings").value = recipe?.servings ?? 2;
  document.getElementById("image-url").value = recipe?.image_url || "";
  formError.classList.add("hidden");
  recipeDialog.showModal();
}
function closeForm() { recipeDialog.close(); }
function findRecipe(id) { return recipes.find(recipe => String(recipe.id) === String(id)); }

grid.addEventListener("click", async event => {
  const fav = event.target.closest("[data-favorite]");
  const view = event.target.closest("[data-view]");
  const edit = event.target.closest("[data-edit]");
  const del = event.target.closest("[data-delete]");
  if (fav) {
    const id = String(fav.dataset.favorite);
    favoriteIds.has(id) ? favoriteIds.delete(id) : favoriteIds.add(id);
    localStorage.setItem("recipeHavenFavorites", JSON.stringify([...favoriteIds]));
    renderRecipes();
  } else if (view) {
    const recipe = findRecipe(view.dataset.view);
    if (recipe) showDetails(recipe);
  } else if (edit) {
    const recipe = findRecipe(edit.dataset.edit);
    if (recipe) openForm(recipe);
  } else if (del) {
    const recipe = findRecipe(del.dataset.delete);
    if (!recipe || !confirm(`Delete "${recipe.title}"? This cannot be undone.`)) return;
    try {
      await request(`${API_URL}/${recipe.id}`, { method: "DELETE" });
      favoriteIds.delete(String(recipe.id));
      localStorage.setItem("recipeHavenFavorites", JSON.stringify([...favoriteIds]));
      toast("Recipe deleted.");
      await loadRecipes();
    } catch (error) { toast(error.message); }
  }
});
function showDetails(recipe) {
  const image = safeImageUrl(recipe.image_url);
  const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
  const steps = String(recipe.instructions || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  document.getElementById("detail-content").innerHTML = `
    <div class="detail-hero">${image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(recipe.title)}">` : `<div class="card-placeholder">🍲</div>`}</div>
    <div class="detail-body"><span class="eyebrow">${escapeHTML(recipe.category || "RECIPE")}</span><h2>${escapeHTML(recipe.title)}</h2><p>${escapeHTML(recipe.description)}</p>
      <div class="detail-stats"><span>◷ Prep: ${Number(recipe.prep_time || 0)} min</span><span>♨ Cook: ${Number(recipe.cook_time || 0)} min</span><span>♧ Serves: ${Number(recipe.servings || 1)}</span><span>By ${escapeHTML(recipe.author || "Guest")}</span></div>
      <h3>Ingredients</h3><ul>${ingredients.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
      <h3>How to make it</h3><ol>${steps.map(step => `<li>${escapeHTML(step)}</li>`).join("")}</ol>
      <button class="btn btn-primary" id="detail-edit" data-id="${recipe.id}">Edit this recipe</button>
    </div>`;
  detailDialog.showModal();
}
document.getElementById("detail-content").addEventListener("click", event => {
  const button = event.target.closest("#detail-edit");
  if (button) {
    const recipe = findRecipe(button.dataset.id);
    detailDialog.close();
    if (recipe) openForm(recipe);
  }
});

recipeForm.addEventListener("submit", async event => {
  event.preventDefault();
  formError.classList.add("hidden");
  const id = document.getElementById("recipe-id").value;
  const ingredients = document.getElementById("ingredients").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const imageValue = document.getElementById("image-url").value.trim();
  if (!ingredients.length) {
    formError.textContent = "Please enter at least one ingredient.";
    formError.classList.remove("hidden"); return;
  }
  if (imageValue && !safeImageUrl(imageValue)) {
    formError.textContent = "Please enter a valid image URL starting with http:// or https://.";
    formError.classList.remove("hidden"); return;
  }
  const payload = {
    title: document.getElementById("title").value.trim(),
    description: document.getElementById("description").value.trim(),
    ingredients,
    instructions: document.getElementById("instructions").value.trim(),
    category: document.getElementById("category").value,
    author: document.getElementById("author").value.trim(),
    prep_time: Number(document.getElementById("prep-time").value || 0),
    cook_time: Number(document.getElementById("cook-time").value || 0),
    servings: Number(document.getElementById("servings").value || 1),
    image_url: imageValue || null
  };
  const saveButton = document.getElementById("save-recipe");
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  try {
    await request(id ? `${API_URL}/${id}` : API_URL, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    closeForm();
    toast(id ? "Recipe updated successfully!" : "Your recipe has been shared!");
    await loadRecipes();
  } catch (error) {
    formError.textContent = error.message;
    formError.classList.remove("hidden");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = id ? "Save changes ↗" : "Publish recipe ↗";
  }
});

document.getElementById("category-filters").addEventListener("click", event => {
  const chip = event.target.closest("[data-category]");
  if (!chip) return;
  activeCategory = chip.dataset.category;
  document.querySelectorAll(".filter-chip").forEach(button => button.classList.toggle("active", button === chip));
  loadRecipes();
});
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadRecipes, 250);
});
["open-add", "open-add-secondary", "banner-add", "empty-add"].forEach(id => document.getElementById(id).addEventListener("click", () => openForm()));
document.getElementById("close-dialog").addEventListener("click", closeForm);
document.getElementById("cancel-dialog").addEventListener("click", closeForm);
document.getElementById("close-detail").addEventListener("click", () => detailDialog.close());
recipeDialog.addEventListener("click", event => { if (event.target === recipeDialog) closeForm(); });
detailDialog.addEventListener("click", event => { if (event.target === detailDialog) detailDialog.close(); });

loadRecipes();
