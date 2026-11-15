/**
 * Common and widely pursued academic degrees across India.
 * Used for standardized degree dropdowns across user profiles and onboarding.
 */
export const INDIAN_DEGREES = [
  "B.Tech / B.E. (Bachelor of Technology / Engineering)",
  "BCA (Bachelor of Computer Applications)",
  "B.Sc (Bachelor of Science)",
  "M.Tech / M.E. (Master of Technology / Engineering)",
  "MCA (Master of Computer Applications)",
  "M.Sc (Master of Science)",
  "MD / MS (Doctor of Medicine / Master of Surgery)",
  "Ph.D. / Doctorate",
  "Diploma / Polytechnic",
  "Other",
] as const;

export type IndianDegree = (typeof INDIAN_DEGREES)[number];
