export type PlanSettings = {
  goal: "general" | "strength" | "endurance";
  level: "beginner" | "intermediate";
  days: 2 | 3 | 4 | 5;
  venue: "gym" | "home";
  diet: "omnivore" | "vegetarian";
};

export const DEFAULT_PLAN_SETTINGS: PlanSettings = {
  goal: "general",
  level: "beginner",
  days: 3,
  venue: "gym",
  diet: "omnivore",
};

export type PlanSession = {
  id: string;
  day: string;
  title: string;
  duration: string;
  exercises: string[];
  note: string;
};

export type PlanWeek = { week: number; theme: string; sessions: PlanSession[] };
export type MealDay = { day: string; breakfast: string; lunch: string; dinner: string; snack: string };

const GYM_A = ["Goblet squat", "Machine chest press", "Seated cable row", "Dead bug"];
const GYM_B = ["Romanian deadlift", "Lat pulldown", "Step-up", "Dumbbell overhead press"];
const HOME_A = ["Chair squat", "Wall or incline push-up", "Glute bridge", "Dead bug"];
const HOME_B = ["Supported split squat", "Hip hinge", "Bird dog", "Side plank"];
const DAY_SLOTS: Record<PlanSettings["days"], string[]> = {
  2: ["Monday", "Thursday"],
  3: ["Monday", "Wednesday", "Friday"],
  4: ["Monday", "Tuesday", "Thursday", "Saturday"],
  5: ["Monday", "Tuesday", "Thursday", "Saturday", "Sunday"],
};

function sessionKinds(settings: PlanSettings, week: number): ("A" | "B" | "cardio" | "mobility")[] {
  const first = week % 2 === 0 ? "B" : "A";
  const second = first === "A" ? "B" : "A";
  if (settings.days === 2) return [first, second];
  if (settings.days === 3) return settings.goal === "strength"
    ? [first, second, first]
    : [first, "cardio", second];
  if (settings.days === 4) return [first, "cardio", second, "cardio"];
  return settings.goal === "strength"
    ? [first, "cardio", second, "mobility", first]
    : [first, "cardio", second, "cardio", "mobility"];
}

export function buildTrainingPlan(settings: PlanSettings): PlanWeek[] {
  const themes = ["Find your baseline", "Build consistency", "Add a little", "Consolidate"];
  return themes.map((theme, index) => {
    const week = index + 1;
    const sets = week === 1 && settings.level === "beginner" ? 2 : 3;
    const reps = week < 3 ? "8–10" : "10–12";
    const sessions = sessionKinds(settings, week).map((kind, slot): PlanSession => {
      const day = DAY_SLOTS[settings.days][slot];
      const id = `${week}-${slot}`;
      if (kind === "cardio") return {
        id, day, title: "Steady cardio", duration: "25–35 min",
        exercises: ["Brisk walk, cycle or swim at a pace where you can still talk", "Finish with 5 minutes easy movement"],
        note: "Start at 25 minutes. Add a few minutes only if recovery feels good.",
      };
      if (kind === "mobility") return {
        id, day, title: "Mobility & recovery", duration: "20–30 min",
        exercises: ["Easy walk for 10 minutes", "Gentle hip, shoulder and ankle mobility", "Relaxed breathing for 3 minutes"],
        note: "Move comfortably; stretching should not hurt.",
      };
      const moves = settings.venue === "gym" ? (kind === "A" ? GYM_A : GYM_B) :
        (kind === "A" ? HOME_A : HOME_B);
      return {
        id, day, title: `Full body ${kind}`, duration: "35–50 min",
        exercises: ["Warm up with 5 minutes easy movement", ...moves.map((move) =>
          `${move} · ${sets} sets of ${reps} comfortable reps`)],
        note: week === 4
          ? "Repeat with better control; only increase resistance if every rep feels solid."
          : "Leave about two comfortable reps in reserve. Rest 60–90 seconds between sets.",
      };
    });
    return { week, theme, sessions };
  });
}

const OMNIVORE: MealDay[] = [
  { day: "Monday", breakfast: "Porridge, milk and banana", lunch: "Githeri with sukuma wiki and tomato", dinner: "Grilled chicken, ugali and mixed vegetables", snack: "Orange or seasonal fruit" },
  { day: "Tuesday", breakfast: "Eggs, whole-wheat toast and fruit", lunch: "Rice, ndengu and cabbage", dinner: "Tilapia, sweet potato and sukuma wiki", snack: "Plain yoghurt" },
  { day: "Wednesday", breakfast: "Oats, milk and mango", lunch: "Bean stew, chapati and salad", dinner: "Chicken, matoke and greens", snack: "Banana" },
  { day: "Thursday", breakfast: "Boiled eggs, sweet potato and tea", lunch: "Githeri and avocado salad", dinner: "Lentil stew, rice and spinach", snack: "Seasonal fruit" },
  { day: "Friday", breakfast: "Plain yoghurt, oats and pawpaw", lunch: "Tilapia, ugali and sukuma wiki", dinner: "Beans, sweet potato and cabbage", snack: "Carrot sticks" },
  { day: "Saturday", breakfast: "Millet porridge and banana", lunch: "Chicken, rice and mixed vegetables", dinner: "Ndengu, chapati and salad", snack: "Seasonal fruit" },
  { day: "Sunday", breakfast: "Eggs, toast and tomato", lunch: "Bean stew, ugali and greens", dinner: "Fish, matoke and vegetables", snack: "Plain yoghurt or fruit" },
];

const VEGETARIAN: MealDay[] = OMNIVORE.map((meal) => ({
  ...meal,
  lunch: meal.lunch.replace(/Tilapia/g, "Beans").replace(/Chicken/g, "Lentils"),
  dinner: meal.dinner.replace(/Grilled chicken/g, "Grilled tofu or beans")
    .replace(/Chicken/g, "Lentils").replace(/Tilapia|Fish/g, "Ndengu"),
}));

export function buildMealPlan(settings: PlanSettings): MealDay[] {
  return settings.diet === "vegetarian" ? VEGETARIAN : OMNIVORE;
}

export function plateGuidance(goal: PlanSettings["goal"]): string {
  if (goal === "strength") return "Include a protein food at each meal; add a starch serving around training if you need energy.";
  if (goal === "endurance") return "Eat regular meals and bring water for longer sessions; add a starch serving as activity rises.";
  return "Build meals around vegetables, a protein food and a starch; adjust portions to your appetite and needs.";
}
