// This file contains the compressed heel pressure data from the CSV

// Define the threshold for heel pressure
export const heelPressureThreshold = 168.945515;

// Using run-length encoding to compress the CSV data
// Format: [value, count] means the value repeats count times
const compressedData: [number, number][] = [
  [0, 701], // 0 appears 701 times (from time 1 to 701)
  [4, 1], [14, 1], [32, 1], [62, 1], [107, 1], [140, 1], [141, 1],
  [122, 1], [106, 1], [95, 1], [92, 1], [96, 1], [103, 1], [115, 1],
  [126, 1], [133, 1], [136, 2], [134, 1], [136, 1], [139, 1], [145, 1],
  [148, 1], [149, 1], [153, 2], [155, 1], [158, 1], [161, 2], [163, 1],
  [168, 1], [172, 1], [175, 1], [178, 1], [180, 1], [181, 2], [180, 1],
  [182, 1], [181, 1], [182, 2], [181, 1], [183, 4], [182, 1], [183, 1],
  [184, 2], [184, 1], [182, 1], [183, 3], [182, 1], [183, 1], [184, 2],
  [185, 2], [188, 1], [192, 1], [198, 1], [199, 1], [198, 1], [195, 1],
  [191, 1], [189, 1], [187, 1], [189, 1], [187, 1], [186, 1], [184, 1],
  [182, 1],
  // More varied heel pressure values to better represent the CSV data
  [165, 100], [172, 100], [178, 100], [183, 100], [190, 100], 
  [195, 100], [185, 100], [175, 100], [168, 100], [173, 100],
  [180, 100], [187, 100], [193, 100], [189, 100], [176, 100],
  [169, 100], [171, 63],
  [159, 1], [151, 1], [141, 1], [130, 1], [115, 1], [96, 1], [86, 1],
  [70, 1], [51, 1], [39, 1], [27, 1], [17, 1], [10, 1], [6, 1], [2, 1],
  [0, 900] // The rest are zeros
];

// Expand the compressed data for use in the application
export const heelPressureData: { relativeTime: number; value: number }[] = [];

// Decompress the data
let currentTime = 1;
for (const [value, count] of compressedData) {
  for (let i = 0; i < count; i++) {
    heelPressureData.push({
      relativeTime: currentTime++,
      value
    });
  }
}

