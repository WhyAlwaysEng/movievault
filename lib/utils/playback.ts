"use client";

import { RESUME_KEY } from "@/lib/constants";

export interface ResumePosition {
  time: number; // seconds
  duration: number; // seconds
  updatedAt: number;
}

type ResumeMap = Record<string, ResumePosition>;

function loadMap(): ResumeMap {
  try {
    return JSON.parse(localStorage.getItem(RESUME_KEY) ?? "{}") as ResumeMap;
  } catch {
    return {};
  }
}

function saveMap(map: ResumeMap) {
  localStorage.setItem(RESUME_KEY, JSON.stringify(map));
}

export function loadResume(mediaId: string): ResumePosition | null {
  return loadMap()[mediaId] ?? null;
}

export function getResumeMap(): ResumeMap {
  return loadMap();
}

/** Throttled from the player (~every 5s). */
export function saveResume(mediaId: string, time: number, duration: number) {
  const map = loadMap();
  map[mediaId] = { time, duration, updatedAt: Date.now() };
  saveMap(map);
}

/** ≥95% watched → mark finished and drop the resume point (§6.3). */
export function isFinished(time: number, duration: number): boolean {
  return duration > 0 && time / duration >= 0.95;
}

export function clearResume(mediaId: string) {
  const map = loadMap();
  delete map[mediaId];
  saveMap(map);
}