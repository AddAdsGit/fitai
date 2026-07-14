interface MicroNutrient {
  name: string;
  value: number;
  unit: string;
}

export function calculateNutritionFromIngredients(name: string, ingredients: string[]): {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  tags: string[];
  micros: MicroNutrient[];
} {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFats = 0;
  
  const microMap: Record<string, { value: number; unit: string }> = {
    'Vitamin C': { value: 0, unit: 'mg' },
    'Vitamin D': { value: 0, unit: 'mcg' },
    'Vitamin B12': { value: 0, unit: 'mcg' },
    'Iron': { value: 0, unit: 'mg' },
    'Zinc': { value: 0, unit: 'mg' },
    'Selenium': { value: 0, unit: 'mcg' },
    'Vitamin A': { value: 0, unit: 'mcg' },
    'Calcium': { value: 0, unit: 'mg' },
    'Magnesium': { value: 0, unit: 'mg' },
    'Potassium': { value: 0, unit: 'mg' }
  };

  ingredients.forEach(item => {
    const text = item.toLowerCase();
    let quantity = 1.0;
    
    const gramsMatch = text.match(/(\d+)\s*(g|grams)/);
    const tbspMatch = text.match(/(\d+)\s*(tbsp|tablespoon)/);
    const cupMatch = text.match(/(\d+)\s*cup/);
    const pieceMatch = text.match(/^(\d+)\s+/);

    if (gramsMatch) {
      quantity = parseFloat(gramsMatch[1]) / 100;
    } else if (tbspMatch) {
      quantity = parseFloat(tbspMatch[1]) * 0.15;
    } else if (cupMatch) {
      quantity = parseFloat(cupMatch[1]) * 1.5;
    } else if (pieceMatch) {
      quantity = parseFloat(pieceMatch[1]) * 0.5;
    }

    if (text.includes('salmon') || text.includes('fish') || text.includes('tuna')) {
      totalCalories += 180 * quantity;
      totalProtein += 22 * quantity;
      totalFats += 10 * quantity;
      microMap['Vitamin D'].value += 12 * quantity;
      microMap['Selenium'].value += 35 * quantity;
      microMap['Potassium'].value += 350 * quantity;
      microMap['Zinc'].value += 0.8 * quantity;
    } else if (text.includes('chicken') || text.includes('turkey') || text.includes('poultry')) {
      totalCalories += 165 * quantity;
      totalProtein += 30 * quantity;
      totalFats += 3.5 * quantity;
      microMap['Iron'].value += 1 * quantity;
      microMap['Zinc'].value += 1.5 * quantity;
      microMap['Selenium'].value += 24 * quantity;
    } else if (text.includes('beef') || text.includes('steak') || text.includes('pork') || text.includes('meat')) {
      totalCalories += 250 * quantity;
      totalProtein += 26 * quantity;
      totalFats += 15 * quantity;
      microMap['Iron'].value += 2.6 * quantity;
      microMap['Zinc'].value += 4.5 * quantity;
      microMap['Vitamin B12'].value += 2.5 * quantity;
    } else if (text.includes('egg')) {
      const numEggs = pieceMatch ? parseFloat(pieceMatch[1]) : 2;
      totalCalories += 70 * numEggs;
      totalProtein += 6 * numEggs;
      totalFats += 5 * numEggs;
      microMap['Vitamin D'].value += 1 * numEggs;
      microMap['Vitamin A'].value += 80 * numEggs;
      microMap['Vitamin B12'].value += 0.5 * numEggs;
      microMap['Selenium'].value += 15 * numEggs;
    } else if (text.includes('avocado')) {
      totalCalories += 160 * quantity;
      totalFats += 15 * quantity;
      totalCarbs += 8 * quantity;
      microMap['Potassium'].value += 485 * quantity;
      microMap['Vitamin A'].value += 10 * quantity;
      microMap['Magnesium'].value += 29 * quantity;
    } else if (text.includes('spinach') || text.includes('kale') || text.includes('salad') || text.includes('greens') || text.includes('lettuce')) {
      totalCalories += 20 * quantity;
      totalCarbs += 3 * quantity;
      totalProtein += 2 * quantity;
      microMap['Vitamin C'].value += 28 * quantity;
      microMap['Iron'].value += 2.7 * quantity;
      microMap['Calcium'].value += 99 * quantity;
      microMap['Vitamin A'].value += 469 * quantity;
    } else if (text.includes('oat') || text.includes('oatmeal')) {
      totalCalories += 300 * quantity;
      totalCarbs += 54 * quantity;
      totalProtein += 10 * quantity;
      totalFats += 5 * quantity;
      microMap['Iron'].value += 3 * quantity;
      microMap['Magnesium'].value += 100 * quantity;
      microMap['Zinc'].value += 2 * quantity;
    } else if (text.includes('milk') || text.includes('dairy') || text.includes('yogurt') || text.includes('cheese')) {
      totalCalories += 120 * quantity;
      totalProtein += 8 * quantity;
      totalCarbs += 10 * quantity;
      totalFats += 5 * quantity;
      microMap['Calcium'].value += 300 * quantity;
      microMap['Vitamin D'].value += 2.5 * quantity;
      microMap['Vitamin B12'].value += 1 * quantity;
    } else if (text.includes('almond') || text.includes('nuts') || text.includes('peanut') || text.includes('cashew') || text.includes('seed') || text.includes('chia')) {
      totalCalories += 150 * quantity;
      totalFats += 14 * quantity;
      totalProtein += 6 * quantity;
      totalCarbs += 6 * quantity;
      microMap['Magnesium'].value += 75 * quantity;
      microMap['Calcium'].value += 50 * quantity;
      microMap['Zinc'].value += 1 * quantity;
    } else if (text.includes('banana') || text.includes('apple') || text.includes('orange') || text.includes('lemon') || text.includes('berry') || text.includes('berries') || text.includes('fruit')) {
      totalCalories += 80 * quantity;
      totalCarbs += 20 * quantity;
      microMap['Vitamin C'].value += 45 * quantity;
      microMap['Potassium'].value += 300 * quantity;
    } else if (text.includes('rice') || text.includes('grain') || text.includes('quinoa') || text.includes('bread')) {
      totalCalories += 200 * quantity;
      totalCarbs += 40 * quantity;
      totalProtein += 4 * quantity;
      microMap['Magnesium'].value += 30 * quantity;
    } else if (text.includes('oil') || text.includes('butter') || text.includes('margarine')) {
      totalCalories += 120 * quantity;
      totalFats += 14 * quantity;
    } else {
      totalCalories += 45;
      totalProtein += 1.5;
      totalCarbs += 7;
      totalFats += 0.8;
    }
  });

  const protein = Math.round(Math.max(2, totalProtein));
  const carbs = Math.round(Math.max(0, totalCarbs));
  const fats = Math.round(Math.max(0, totalFats));
  const calories = Math.round(totalCalories > 0 ? totalCalories : (protein * 4 + carbs * 4 + fats * 9));

  // Estimate fiber based on ingredients
  let totalFiber = 0;
  const fiberText = (name + ' ' + ingredients.join(' ')).toLowerCase();
  if (fiberText.includes('oat') || fiberText.includes('oatmeal')) totalFiber += 4;
  if (fiberText.includes('avocado')) totalFiber += 5;
  if (fiberText.includes('spinach') || fiberText.includes('kale') || fiberText.includes('greens')) totalFiber += 3;
  if (fiberText.includes('bean') || fiberText.includes('lentil') || fiberText.includes('chickpea')) totalFiber += 8;
  if (fiberText.includes('chia') || fiberText.includes('flax')) totalFiber += 5;
  if (fiberText.includes('banana') || fiberText.includes('apple') || fiberText.includes('berry') || fiberText.includes('berries')) totalFiber += 3;
  if (fiberText.includes('quinoa') || fiberText.includes('brown rice')) totalFiber += 3;
  if (fiberText.includes('almond') || fiberText.includes('nuts') || fiberText.includes('peanut')) totalFiber += 2;
  if (fiberText.includes('bread') && fiberText.includes('whole')) totalFiber += 3;
  const fiber = Math.round(totalFiber);

  const tags: string[] = [];
  const fullText = (name + ' ' + ingredients.join(' ')).toLowerCase();
  
  // Macro-based tags
  if (protein >= 25) tags.push('High Protein');
  if (fiber >= 8) tags.push('High Fiber');

  if (!fullText.includes('bread') && !fullText.includes('oat') && !fullText.includes('wheat') && !fullText.includes('flour') && !fullText.includes('pasta')) {
    tags.push('Gluten Free');
  }
  if (!fullText.includes('milk') && !fullText.includes('butter') && !fullText.includes('cheese') && !fullText.includes('cream') && !fullText.includes('dairy')) {
    tags.push('Dairy Free');
  }
  if (fullText.includes('avocado') || fullText.includes('egg') || fullText.includes('salmon') || (fats > 15 && carbs < 15)) {
    tags.push('Keto');
  }
  if (!fullText.includes('chicken') && !fullText.includes('beef') && !fullText.includes('meat') && !fullText.includes('egg') && !fullText.includes('salmon') && !fullText.includes('milk') && !fullText.includes('cheese') && !fullText.includes('fish')) {
    tags.push('Vegan');
    tags.push('Vegetarian');
  } else if (!fullText.includes('chicken') && !fullText.includes('beef') && !fullText.includes('meat') && !fullText.includes('salmon') && !fullText.includes('fish')) {
    tags.push('Vegetarian');
  }
  if (carbs < 15 && protein > 15) {
    tags.push('Low Carb');
  }

  const micros = Object.entries(microMap)
    .map(([mName, data]) => ({
      name: mName,
      value: parseFloat(data.value.toFixed(1)),
      unit: data.unit
    }))
    .filter(m => m.value > 0);

  return {
    calories: calories || 150,
    protein: protein || 10,
    carbs: carbs || 15,
    fats: fats || 5,
    fiber,
    tags: Array.from(new Set(tags)).slice(0, 5),
    micros
  };
}
