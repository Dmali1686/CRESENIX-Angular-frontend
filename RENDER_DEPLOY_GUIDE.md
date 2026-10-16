# Deploying CRESENIX Solutions on Render

This guide outlines two quick methods to deploy **CRESENIX Solutions** (Go Backend, Angular Frontend, and PostgreSQL Database) to [Render](https://render.com).

---

## Method 1: Instant Blueprint Deployment (Recommended)

Render Blueprints allow you to provision the database, backend web service, and frontend static site automatically from the included [`render.yaml`](./render.yaml).

### Steps:
1. Push your repository to GitHub or GitLab.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** in the top navigation bar and select **Blueprint**.
4. Connect your GitHub/GitLab repository.
5. Render will detect [`render.yaml`](./render.yaml) and automatically configure:
   * **`cresenix-db`**: Free managed PostgreSQL database.
   * **`cresenix-backend`**: Go API Web Service connected to `cresenix-db`.
   * **`cresenix-frontend`**: Angular Static Site with SPA rewrites and API proxying.
6. Under **Environment Variables**, provide your SMTP credentials (if you want live email notifications via Gmail):
   * `SMTP_USERNAME`: `your-email@gmail.com`
   * `SMTP_PASSWORD`: `your-16-letter-google-app-password`
   * `SMTP_FROM`: `your-email@gmail.com`
7. Click **Apply**.
8. Render will provision the database, build the backend, run migrations, auto-seed sample accounts, and compile the Angular frontend!

---

## Method 2: Manual Dashboard Setup

If you prefer creating each service manually in the Render UI:

### Step 1: Create PostgreSQL Database
1. Click **New +** → **PostgreSQL**.
2. **Name:** `cresenix-db`
3. **Database:** `cresenix_db`
4. **User:** `postgres`
5. **Plan:** Free
6. Click **Create Database**.
7. Copy the **Internal Database URL** (e.g. `postgres://postgres:...@dpg-...-a/cresenix_db`).

---

### Step 2: Deploy Go API Web Service
1. Click **New +** → **Web Service**.
2. Connect your repository.
3. Configure the service:
   * **Name:** `cresenix-backend`
   * **Region:** Same region as your database (e.g. Oregon or Frankfurt)
   * **Root Directory:** `backend`
   * **Runtime:** `Go`
   * **Build Command:** `go build -o bin/api ./cmd/api`
   * **Start Command:** `./bin/api`
   * **Plan:** Free
4. Add **Environment Variables**:
   * `PORT`: `8080` (or let Render assign automatically)
   * `DATABASE_URL`: *(Paste the Internal Database URL from Step 1)*
   * `JWT_SECRET`: *(Click Generate or enter a random 32-character string)*
   * `CORS_ALLOWED_ORIGINS`: `https://*.onrender.com,http://localhost:4200,http://localhost:8765`
   * `APP_NAME`: `CRESENIX Solutions`
   * `SMTP_HOST`: `smtp.gmail.com`
   * `SMTP_PORT`: `587`
   * `SMTP_USERNAME`: `cresenixs@gmail.com`
   * `SMTP_PASSWORD`: `kpayoegemprxgcoi`
   * `SMTP_FROM`: `cresenixs@gmail.com`
5. Click **Create Web Service**.
6. Wait for the deploy to complete. Note your backend URL (e.g. `https://cresenix-backend.onrender.com`).

---

### Step 3: Deploy Angular Static Site
1. Click **New +** → **Static Site**.
2. Connect your repository.
3. Configure the site:
   * **Name:** `cresenix-frontend`
   * **Root Directory:** *(leave blank / repo root)*
   * **Build Command:** `npm install && npm run build`
   * **Publish Directory:** `dist/cresenix-solutions/browser`
4. Configure **Redirects / Rewrites** (in Site Settings → Redirects/Rewrites):
   * **Rule 1 (API Proxy to Backend):**
     * **Type:** `Rewrite`
     * **Source:** `/api/*`
     * **Destination:** `https://cresenix-backend.onrender.com/api/*` *(replace with your backend URL)*
   * **Rule 2 (SPA Client-side Routing):**
     * **Type:** `Rewrite`
     * **Source:** `/*`
     * **Destination:** `/index.html`
5. Click **Create Static Site**.

---

## Default Login Credentials

Once deployed, the database automatically initializes with standard accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Super Admin (CEO)** | `superadmin@cresenix.com` | `SuperAdmin@123` |
| **System Admin** | `admin@cresenix.com` | `Admin@123` |
| **Project Manager** | `priya@cresenix.com` | `Admin@123` |
| **Sales Executive** | `arjun@cresenix.com` | `Admin@123` |
| **UI/UX Designer** | `kavita@cresenix.com` | `Admin@123` |

> [!TIP]
> You can change any password or personal profile details at any time by going to **Settings → My Profile** after logging in.
