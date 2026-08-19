# FitAI Meal Logging & Log Counter Architecture Specification

This document serves as the canonical source of truth for **Meal Logging**, **Recipe Deduplication**, **Portion Scaling**, and **Log Counter Behaviors** across FitAI. It is designed for developers, designers, and future user-facing help documentation.

---

## 1. Core Definitions: Recipes vs. Meal Logs

| Concept | Nature | Database Location | Purpose |
| :--- | :--- | :--- | :--- |
| **Saved Recipe** | **The 1x Standard Reference (Template)** | `public.recipes` | Reusable cookbook standard (1 serving). Stores base nutrients, tags, ingredients, and lifetime `log_count`. |
| **Meal Log** | **A Snapshot in Time (Receipt)** | `public.meals` | What the user actually ate on a specific date & time. Scaled by portion multipliers or custom ingredient tweaks. |

---

## 2. Exhaustive Scenario Guide (15+ Real-World Use Cases)

### Scenario 1: 1-Tap Quick Add from Food Library
* **Action:** User taps "Quick Add" on an existing recipe (e.g. *Mom's Chicken Biryani*).
* **Behavior:**
  * Creates a new row in `meals` for today with base calories & dynamic nutrients.
  * Increments `recipes.log_count` by **+1** in the database.
  * The Food Library immediately reflects the updated log count.

---

### Scenario 2: Multi-Recipe Combo Mentions (`@BreakfastBurrito + @MangoSmoothie`)
* **Action:** User types into AI entry: `"@Breakfast Burrito + @Mango Smoothie for morning breakfast"`.
* **Question:** Do both recipes get +1, or does a new combo recipe get created?
* **Behavior:**
  * **Both referenced recipes receive +1 to their respective log counts.**
    * `Breakfast Burrito` `log_count` += 1
    * `Mango Smoothie` `log_count` += 1
  * **Today's log:** Creates **1 composite meal** for today containing the sum of both dishes' nutrients.
  * **No automatic phantom recipes:** It does **NOT** automatically pollute the library with a 3rd recipe called *"Breakfast Burrito + Mango Smoothie"*, unless the user explicitly taps *"Convert to Recipe"*.

---

### Scenario 3: User Deletes a Logged Meal from Today
* **Action:** User logs a meal by accident (or double-taps Quick Add) and taps "Delete Meal Entry".
* **Behavior:**
  * Removes the row from `meals`.
  * **Decrements the associated recipe's `log_count` by -1** (down to a minimum of 0).
  * **Rationale:** Accidental or deleted logs must never artificially inflate popularity stats.

---

### Scenario 4: User Logs with a 2.00x Portion Multiplier
* **Action:** User is starving and logs *Paneer Tikka* at **`2.00x portion`** (800 kcal instead of 400 kcal).
* **Behavior:**
  * Today's meal log records **800 kcal** and doubled nutrients.
  * `recipes.log_count` increments by **+1** (not +2).
  * **Rationale:** Portion scaling represents the *amount* eaten in 1 sitting, not 2 separate cooking/eating events.

---

### Scenario 5: User Modifies Nutrients / Ingredients Inside Meal Editor
* **Action:** User opens *Grilled Salmon*, adds extra olive oil (+15g Fat) in the editor, and taps Save.
* **Behavior:**
  * Today's log saves the custom macros and extra calories.
  * Increments `recipes.log_count` by **+1**.
  * Base recipe template remains pristine at 1x in the library.

---

### Scenario 6: AI Refine on an Adjusted Portion
* **Action:** User sets portion to `2.00x`, then opens AI Assist and types: *"replace salmon with tofu"*.
* **Behavior:**
  * AI modifies the **1x base recipe** (replacing salmon with tofu).
  * **Portion multiplier resets cleanly to `1.00x`** to prevent double-scaling math loops.
  * New dish is presented as the fresh 1x baseline.

---

### Scenario 7: Camera / AI Photo Match against Existing Recipe
* **Action:** User snaps a photo of their lunch. Gemini identifies it as *"Chicken Rice Bowl"*.
* **Behavior:**
  * If the name matches an existing library recipe (case-insensitive & trimmed), it automatically associates with that recipe.
  * Saving the log increments the existing recipe's `log_count` (+1).
  * If AI returned a slightly different name (e.g. *"Grilled Chicken & Rice"*), the user can tap the suggested library card or type `@` to bind it to the master recipe.

---

### Scenario 8: Eating Leftovers Later the Same Day (Lunch & Dinner)
* **Action:** User logs *Chicken Biryani* at 1:00 PM (Lunch), and logs it again at 8:30 PM (Dinner).
* **Behavior:**
  * Two separate rows created in `meals`.
  * Total `recipes.log_count` increases by **+2** (+1 for each meal event).

---

### Scenario 9: Converting a Past Log to a Saved Recipe
* **Action:** User has logged *"Protein Oats"* 7 times over the past 2 weeks as recent logs, then taps **"Convert to Recipe"**.
* **Behavior:**
  * Creates a permanent row in `recipes`.
  * **Inherits `log_count = 7`** (instead of starting at 0).
  * **Rationale:** Reflects true lifetime cooking and eating habits.

---

### Scenario 10: Renaming or Editing a Saved Recipe in Profile
* **Action:** User edits a recipe template from *"Mom's Biryani"* to *"Hyderabadi Sunday Biryani"*.
* **Behavior:**
  * Updates the recipe row in `recipes`.
  * Lifetime `log_count` is **100% preserved** (e.g. 24 logs).
  * Past calendar entries maintain their snapshot history.

---

### Scenario 11: Deleting a Recipe from the Saved Recipes Library
* **Action:** User deletes a recipe card from their Food Library.
* **Behavior:**
  * Reusable recipe template is deleted from `recipes`.
  * **All historical logs on past calendar days remain 100% intact.**
  * **Rationale:** Historical nutritional receipts must never be deleted retroactively when cleaning up templates.

---

### Scenario 12: Multiple Items Selected in Food Library Drawer
* **Case A (Quick Add):** User selects 3 items (`Rice`, `Dal`, `Salad`) and taps **Quick Add (3)**.
  * Logs all 3 items as separate entries for today.
  * Each item's individual `log_count` += 1.
* **Case B (Combine & Edit with AI):** User selects 3 items and taps **Combine with AI (3)**.
  * Opens AI text prompt pre-filled with `@Rice @Dal @Salad`.
  * AI creates 1 combined plate log.
  * Each referenced item's `log_count` += 1.

---

### Scenario 13: Offline Logging & Sync
* **Action:** User logs a recipe without internet connectivity.
* **Behavior:**
  * Client optimistically updates local `meals` and increments local `log_count`.
  * When connection resumes, Supabase syncs both the meal row and the incremented counter.

---

### Scenario 14: Importing a Shared Recipe from a Friend (Deep Link)
* **Action:** User clicks a friend's share card link and taps "Save to My Recipes".
* **Behavior:**
  * Recipe is cloned into user's own `recipes` table with initial `log_count = 0`.
  * If the user taps "Log for Today" directly from the shared link, it logs it and sets `log_count = 1`.

---

### Scenario 15: Non-Food Photo Guardrail
* **Action:** User accidentally photos a pen or keyboard.
* **Behavior:**
  * Low confidence / non-food guardrail triggers clarification modal.
  * No meal is logged, and zero recipe counters are incremented.

---

### Scenario 16: Renaming a Meal on Today's Log (Re-binding)
* **Action:** User logged *"Chicken Curry"* earlier today. Later in the afternoon, user edits the meal and renames it to *"Paneer Butter Masala"*.
* **Behavior:**
  * Old recipe (*Chicken Curry*) is unlinked: `log_count` **-1**.
  * New recipe (*Paneer Butter Masala*) is linked: `log_count` **+1**.
  * **Rationale:** Guarantees popularity stats accurately reflect what you actually ended up logging.

---

## 3. Log Counter Summary Table

| Action / Event | Recipe `log_count` Change | Today's `meals` Entry |
| :--- | :---: | :--- |
| **Quick Add Single Item** | **+1** | 1 meal created |
| **Multi-Item Quick Add (3 items)** | **+1 to each item** | 3 meals created |
| **Combo AI Mention (`@A + @B`)** | **+1 to @A, +1 to @B** | 1 composite meal created |
| **Delete Meal Log** | **-1** | 1 meal removed |
| **Rename Meal on Today's Log** | **-1 (Old) / +1 (New)** | 1 meal updated |
| **Import Shared Recipe** | **Starts at 0 logs** | Cloned to Recipes |
| **2.00x Portion Multiplier** | **+1** | 1 scaled meal created |
| **Convert Recent Meal to Recipe** | **Inherits past log count** | N/A (Creates template) |
| **Delete Recipe from Library** | Removed from Library | Past calendar records preserved |
