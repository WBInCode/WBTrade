// Explicit entry point for pnpm monorepo compatibility.
// Without this, Metro falls back to expo/AppEntry.js which looks for ../../App.
import "expo-router/entry";
