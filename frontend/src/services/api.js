/**
 * API Service - Simple for 1 year MERN dev
 *
 * This file creates an axios instance to talk to backend.
 * Base URL is /api (vite proxy sends it to backend 5000)
 *
 * E2B Token Logic:
 * - In this sandbox preview, requests need a special token to pass security
 * - We read token from URL ?e2b-traffic-access-token=... and save to localStorage
 * - Then send it in header for every request
 * - In real production, you would remove this and use JWT auth
 */

import axios from "axios";

// Read E2B preview token from URL or localStorage (only for sandbox)
const getTrafficToken = () => {
  try {
    // Check URL first: ?e2b-traffic-access-token=xxx
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("e2b-traffic-access-token");
    if (fromUrl) {
      localStorage.setItem("e2b-traffic-access-token", fromUrl);
      return fromUrl;
    }
    // Check saved token
    return localStorage.getItem("e2b-traffic-access-token") || null;
  } catch {
    return null;
  }
};

// Save token from URL on page load
try {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("e2b-traffic-access-token");
  if (token) localStorage.setItem("e2b-traffic-access-token", token);
} catch (error) {
  void error;
}

// Create axios instance
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api", // /api goes to backend via vite proxy
  headers: { "Content-Type": "application/json" },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const trafficToken = getTrafficToken();
  if (trafficToken) {
    config.headers["e2b-traffic-access-token"] = trafficToken;
  }
  return config;
});

// Handle errors globally
API.interceptors.response.use(
  (response) => response, // success
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem("token")) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/") window.location.assign("/");
    }
    return Promise.reject(error);
  },
);

export default API;
