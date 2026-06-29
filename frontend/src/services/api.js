import axios from "axios";

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const reportsAPI = {
  getAll: () => api.get("/api/reports.php/reports"),
  generate: (data) => api.post("/api/reports.php/reports", data),
  generateFromAccount: (accountId, startDate, endDate) =>
    api.post("/api/generate_report.php", { accountId, startDate, endDate }),
  getComparison: (params) => api.get("/api/reports.php/comparison", { params }),
  delete: (id) => api.delete(`/api/reports.php?id=${id}`),
  getUnifiedOrganic: (accountId, startDate, endDate, options = {}) =>
    api.post("/api/organic_report.php", {
      accountId,
      startDate,
      endDate,
      includePosts: options.includePosts !== false,
      includeStories: options.includeStories !== false,
      postsLimit: options.postsLimit || 25,
    }),
  getFrequencyComparison: (
    accountId,
    periodType,
    startDate = null,
    endDate = null,
  ) =>
    api.post("/api/organic_report_comparison.php", {
      accountId,
      periodType,
      startDate,
      endDate,
    }),
};

export const accountsAPI = {
  getAll: () => api.get("/api/accounts.php"),
  add: (data) => api.post("/api/accounts.php", data),
  update: (id, data) => api.put(`/api/accounts.php?id=${id}`, data),
  delete: (id) => api.delete(`/api/accounts.php?id=${id}`),
};

export default api;
