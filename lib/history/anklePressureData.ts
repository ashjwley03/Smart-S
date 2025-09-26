// This file contains the compressed left ankle pressure data from the CSV

// Define the threshold for ankle pressure
export const anklePressureThreshold = 643;

// Using run-length encoding to compress the CSV data
// Format: [value, count] means the value repeats count times
const compressedAnkleData: [number, number][] = [
  // When heel pressure > 0 (patient standing), ankle pressure is 0
  [0, 800],
  
  // First lying down period - ankle pressure > 0 (including some high values)
  [420, 30], [545, 30], [652, 30], [680, 30], [595, 30], [540, 30],
  
  // Second standing period - ankle pressure = 0
  [0, 300],
  
  // Second lying down period - ankle pressure > 0 (including some high values)
  [530, 30], [547, 30], [662, 30], [675, 30], [655, 30], [538, 30],
  
  // Third standing period - ankle pressure = 0
  [0, 300],
  
  // After heel transitions to zero (final lying down) - ankle pressure > 0 (including some high values)
  [542, 20], [557, 20], [648, 20], [639, 20], [685, 20], [670, 20], [700, 20], [660, 20]
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
