# Database Setup Guide (Required for Permanent Storage)

Your Vercel deployment is failing to save data because the **database tables do not exist**.
The error `Could not find the table 'public.visits'` confirms this.

To fix this permanently, you must run the provided SQL script in your Supabase Dashboard.

## Step 1: Open Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project (`mediscan-ai` or similar).
3. In the left sidebar, click on the **SQL Editor** icon (it looks like a terminal `>_`).
4. Click **New Query**.

## Step 2: Run the Schema Script
1. Open the file `supabase_schema.sql` from your project folder.
2. Copy the **entire content** of that file.
3. Paste it into the Supabase SQL Editor.
4. Click **Run** (bottom right).

## Step 3: Verify Tables
1. Go to the **Table Editor** (icon looks like a grid/table) in the left sidebar.
2. You should now see the following tables:
   - `visits`
   - `symptoms`
   - `medications`
   - `documents`
   - `audit_logs`
   - `llm_tasks`
   - `differentials`

## Step 4: Test Your App
1. Go back to your deployed Vercel link.
2. Refresh the page.
3. Try creating a new visit or using the DDX tool.
4. The data should now persist!

## Troubleshooting
- If you see "RLS" errors, ensure you included the `CREATE POLICY` lines at the end of the script.
- If you still see "Demo Mode", ensure your Vercel Environment Variables are set correctly (see `DEPLOYMENT_GUIDE.md`).
