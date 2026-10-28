# Recipe Sharing Platform

A beginner-friendly full-stack web project using:
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js + Express
- **Database:** Supabase PostgreSQL

Features: create, view, edit, and delete recipes; search by title/description; category filters; favorite recipes saved in the browser; responsive layout; recipe detail view.

## 1. Install these tools

1. **Node.js LTS** (includes npm): https://nodejs.org/
2. **Visual Studio Code** (recommended): https://code.visualstudio.com/
3. A free **Supabase** account: https://supabase.com/

After installing Node.js, open Command Prompt / Terminal and check:

```bash
node -v
npm -v
```

Both commands should print version numbers. If not, close and reopen the terminal or reinstall Node.js LTS.

## 2. Create the Supabase database

1. Sign in at https://supabase.com/ and create a new project.
2. Save your database password somewhere private.
3. Open **SQL Editor** in the Supabase dashboard.
4. Choose **New query**.
5. Open `supabase/schema.sql` from this project, copy all of it into the SQL Editor, and click **Run**.
6. Open **Project Settings → API** (the label/location may vary). Copy the Project URL and the **service_role** key. If the dashboard uses the newer key interface, use the server-side secret/service-role key, not a publishable/anon key.

**Important security rule:** The service-role key can bypass database Row Level Security. It belongs only in the backend `.env` file. Never place it in `public/app.js`, HTML, screenshots, GitHub, or any public repository. Do not share it with classmates. For a public production site, add authentication and authorization before allowing users to edit/delete data.

## 3. Configure the project

1. Extract the ZIP to a folder, for example `Desktop/recipe-sharing-platform`.
2. Open that folder in VS Code: **File → Open Folder**.
3. Copy `.env.example` and rename the copy to `.env` (the filename must be exactly `.env`, not `.env.txt`).
4. Open `.env` and replace the sample values:

```env
PORT=3000
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SIDE_SECRET_KEY
```

Do not add quotation marks around the values. Do not commit `.env` to GitHub.

## 4. Install dependencies and start the server

In VS Code, open **Terminal → New Terminal**. Make sure the terminal is inside the project folder (the same folder containing `package.json`) and run:

```bash
npm install
npm run dev
```

For normal running without auto-restart, use `npm start`.

You should see:

```text
Recipe Sharing Platform running at http://localhost:3000
```

Open **http://localhost:3000** in Chrome. Keep the terminal running while using the website.

Test the backend by opening **http://localhost:3000/api/health**. It should show a small JSON message saying the API is running.

## 5. How to use it

- Click **Share a recipe** to add a recipe.
- Search by recipe title or description.
- Choose a category chip to filter.
- Click **View recipe** to see ingredients and instructions.
- Click **Edit** to update a recipe.
- Click **Delete** to remove a recipe (you will be asked to confirm).
- Click the heart to save/remove a browser-local favorite. Favorites are saved in that browser's localStorage, not in the database.

## 6. Common errors

### `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`
You have not created `.env`, or the variable names/values are incorrect. Restart the server after correcting it.

### `Invalid API key` / `JWT` error
Check the Project URL and server-side service-role/secret key. Do not use the public anon/publishable key for this setup.

### `Could not load recipes` or database request failed
- Make sure `supabase/schema.sql` ran successfully in the correct Supabase project.
- Check the `recipes` table exists in **Table Editor**.
- Check `.env` values and restart the server (`Ctrl+C`, then `npm run dev`).
- Look at the terminal for the full database error.

### `npm is not recognized`
Install Node.js LTS, then fully close and reopen Command Prompt/VS Code.

### Port 3000 is already in use
Change `PORT=3001` in `.env`, restart the server, and open `http://localhost:3001`.

### Recipe image does not appear
The image URL must be a direct, publicly accessible `http://` or `https://` image URL. Try another image URL or leave it blank; the site will show a food placeholder.

## Project structure

```text
recipe-sharing-platform/
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── supabase/
│   └── schema.sql
├── .env.example
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server |
| GET | `/api/recipes` | List recipes; optional `?search=pasta&category=Dinner` |
| GET | `/api/recipes/:id` | Get one recipe |
| POST | `/api/recipes` | Create recipe |
| PUT | `/api/recipes/:id` | Update recipe |
| DELETE | `/api/recipes/:id` | Delete recipe |

## Notes

- The backend uses the Supabase server-side key; frontend code calls only your Express API.
- This is a learning/demo project. It does not include accounts or ownership permissions, so anyone who can access the running server can edit/delete recipes. Add login and authorization before deploying publicly.
- No dependency or database secret is bundled in the ZIP. You must configure your own Supabase project.
