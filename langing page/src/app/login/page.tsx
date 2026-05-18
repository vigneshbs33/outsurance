"use client";
import { useEffect } from "react";

export default function LoginPage() {
  useEffect(() => {
    alert("Please download the repository from https://github.com/vigneshbs33/fidsurance/");
    window.location.href = "https://github.com/vigneshbs33/fidsurance/";
  }, []);
  return null;
}
