/* ---------------------------------------------------------------
   DATA
--------------------------------------------------------------- */

export const SPLITS = {
  "Full Body": ["Chest", "Back", "Front Delts", "Side Delts", "Quads", "Hamstrings", "Glutes", "Biceps", "Triceps", "Core", "Calves"],
  "Upper": ["Chest", "Back", "Front Delts", "Side Delts", "Rear Delts", "Biceps", "Triceps", "Traps", "Forearms"],
  "Lower": ["Quads", "Hamstrings", "Glutes", "Calves", "Lower Back", "Shins"],
  // Deadlifts are a Lower Back exercise now rather than a Back one, so the
  // group has to appear on the days that used to programme them or they
  // vanish from every generated session.
  "Push": ["Chest", "Front Delts", "Side Delts", "Triceps"],
  "Pull": ["Back", "Lower Back", "Biceps", "Rear Delts", "Traps", "Forearms"],
  "Legs": ["Quads", "Hamstrings", "Glutes", "Calves", "Shins", "Core"],
};
