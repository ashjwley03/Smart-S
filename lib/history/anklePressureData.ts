// This file contains the compressed left ankle pressure data from the CSV

// Define the threshold for ankle pressure
export const anklePressureThreshold = 643;

// Using run-length encoding to compress the CSV data
// Format: [value, count] means the value repeats count times
const compressedAnkleData: [number, number][] = [
  // When heel pressure > 0 (patient standing), ankle pressure is 0
  [0, 800],
  
  // First lying down period - ankle pressure > 0
  [320, 60], [345, 60], [352, 60], [365, 60], [340, 60],
  
  // Second standing period - ankle pressure = 0
  [0, 300],
  
  // Second lying down period - ankle pressure > 0
  [330, 60], [347, 60], [362, 60], [355, 60], [338, 60],
  
  // Third standing period - ankle pressure = 0
  [0, 300],
  
  // After heel transitions to zero (final lying down) - ankle pressure > 0
  [342, 60], [357, 60], [348, 60], [339, 60], [335, 60], [370, 60]
];

// Expand the compressed data for use in the application
export const anklePressureData: { relativeTime: number; value: number }[] = [];

// Decompress the data
let currentTime = 1;
for (const [value, count] of compressedAnkleData) {
  for (let i = 0; i < count; i++) {
    anklePressureData.push({
      relativeTime: currentTime++,
      value
    });
  }
}
