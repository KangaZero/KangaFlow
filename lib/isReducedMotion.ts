//Helper function for reducedMotion as taking from motion's useReducedMotiononly takes from user's browser pref
export const isReducedMotion = (
  animationPref: "off" | "on" | "system",
  reducedMotion: boolean | null
) =>
  animationPref === "on"
    ? false
    : animationPref === "off"
      ? true
      : reducedMotion
        ? reducedMotion
        : false
