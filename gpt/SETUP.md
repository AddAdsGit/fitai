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
| Authorization URL | `https://twrjigbbgioqdpwvkblo.supabase.co/functions/v1/gpt-action/oauth/authorize` |
| Token URL | `https://twrjigbbgioqdpwvkblo.supabase.co/functions/v1/gpt-action/oauth/token` |
| Scope | *(leave blank)* |
| Token Format | `Bearer` |

> ⚠️ **IMPORTANT**: With OAuth configured, ChatGPT will automatically ask every user to "Connect their account" the first time they try to use FitAI. They log in via the FitAI app and approve access — no manual token copying needed.

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
