# Deployment Guide & Troubleshooting

## Why is my data not saving?
If you are seeing "Demo Mode Active" or your data disappears after refreshing the page on the deployed link, it is because your application is running in **Serverless Mode** without a database connection.

In Serverless environments (like Vercel), the backend shuts down when not in use. If you are storing data in variables (in-memory), that data is **lost** every time the server restarts.

## The Permanent Solution
To fix this permanently, you must connect a real database (Supabase) to your Vercel deployment.

### Step 1: Get Supabase Credentials
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. Go to **Project Settings** -> **API**.
4. Copy the `Project URL` and `anon` / `public` Key.
5. Also, you will need your `service_role` key (keep this secret!).

### Step 2: Configure Vercel Environment Variables
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your `mediscan-ai` project.
3. Go to **Settings** -> **Environment Variables**.
4. Add the following variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase Anon/Public Key |
| `SUPABASE_URL` | Same as VITE_SUPABASE_URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase Service Role Key |

> **Note:** We add both `VITE_` prefixed variables (for Frontend) and standard variables (for Backend) to be safe.

### Step 3: Redeploy
1. Go to the **Deployments** tab in Vercel.
2. Click the three dots on the latest deployment -> **Redeploy**.
3. Once finished, your app will now save data to Supabase, and it will persist forever!

## Troubleshooting Search
If Search is not working:
1. Ensure you have followed the steps above. Search relies on the database.
2. If you are in "Demo Mode", search will only find the fake demo patients.

## API Configuration
Your code is already configured to automatically detect the correct API URL:
- **Localhost**: Uses `http://localhost:3000`
- **Production**: Uses `/api` (relative path)

You do **not** need to change any code for deployment. Just set the Environment Variables.
