export const heelHigh = 300
export const ankleHigh = 350

export const getThreshold = (region: "heel" | "leftAnkle" | "rightAnkle"): number => {
  return region === "heel" ? heelHigh : ankleHigh
}
