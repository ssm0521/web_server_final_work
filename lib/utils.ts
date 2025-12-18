import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import path from "path";
import fs from "fs";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getUploadDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}


