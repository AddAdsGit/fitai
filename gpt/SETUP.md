# FitAI Custom GPT — Setup Guide

This folder contains everything you need to create and configure the FitAI Custom GPT in ChatGPT.

---

## 📁 Files in this folder

| File | Purpose |
|---|---|
| `instructions.md` | The system prompt to paste into your Custom GPT's "Instructions" box |
| `openapi.yaml` | The Action schema to paste into the "Schema" box in ChatGPT Actions |
| `SETUP.md` | This file — step-by-step setup guide |

---

## 🚀 Step-by-Step Setup

### Step 1 — Create or Edit your Custom GPT
1. Go to **https://chatgpt.com**
2. Click your profile icon → **My GPTs** → **Create a GPT** (or edit an existing one)
3. Click the **Configure** tab

---

### Step 2 — Paste the Instructions
1. Open [instructions.md](./instructions.md)
2. Copy everything inside it
3. Paste it into the **"Instructions"** text box in ChatGPT

> ⚠️ **ChatGPT's Instructions box has an 8,000-character limit.** `instructions.md` is kept under that (currently ~7,000 chars) — check `wc -c gpt/instructions.md` after any edit and trim if it exceeds 8,000, or ChatGPT will truncate/reject it.

---

### Step 3 — Add the Action
1. Scroll down and click **"Create new action"**
2. Open [openapi.yaml](./openapi.yaml) and copy the full contents
3. Paste it into the **"Schema"** editor box

---

### Step 4 — Configure OAuth Authentication
In the Actions editor, click **Authentication** and configure:

| Setting | Value |
|---|---|
| Authentication Type | `OAuth` |
| Client ID | `fitai-chatgpt-client` |
| Client Secret | `fitai-secret-key` |
| Authorization URL | `https://fitpush.vercel.app/api/oauth/authorize` |
| Token URL | `https://fitpush.vercel.app/api/oauth/token` |
| Scope | *(leave blank)* |
| Token Format | `Bearer` |

> ⚠️ **IMPORTANT**: The OAuth consent page always redirects to **https://fitpush.vercel.app** (production). Never use localhost for OAuth — it 

---

### Google OAuth Setup (Supabase Auth)

To allow users to log in via Google on the FitAI consent page:

1. Go to **Supabase Dashboard** → `twrjigbbgioqdpwvkblo` → **Auth** → **Providers** → **Google**
2. Enable Google provider and add your Google OAuth Client ID + Secret
3. Set the **Authorized redirect URI** in your Google Cloud Console to:
   ```
   https://twrjigbbgioqdpwvkblo.supabase.co/auth/v1/callback
   ```
4. In Supabase Auth settings, set the **Site URL** to:
   ```
   https://fitpush.vercel.app
   ```
5. Add to **Redirect URLs** allowlist:
   ```
   https://fitpush.vercel.app/*
   ```

> This ensures Google OAuth always lands back on `fitpush.vercel.app`, not localhost.

---

### Step 5 — Save and Test
1. Click **Save** in the top-right
2. Open a new chat with your GPT
3. Type anything (e.g. *"hi"*) — it should immediately ask you to **Sign in to FitAI**
4. Click "Sign in" → login with your FitAI account → approve access
5. You're connected! Try: *"I just ate 2 boiled eggs"*

---

## 🔑 Why Users Must Login First

The GPT instructions are written so that the **very first thing the GPT does on every conversation** is call `getProfile` from the API. Since this is an authenticated API call, ChatGPT will prompt the user to connect their FitAI account **before** it can respond with anything useful. There is no way to skip this.
