const API_BASE = "https://allure-telephony.onrender.com";

export const fetchRunResults = async (runId) => {
  const res = await fetch(`${API_BASE}/api/run/reports/${runId}/results`);
  if (!res.ok) throw new Error(`Failed to fetch results: ${res.status}`);
  return res.json();
};

export const downloadAllTestLogs = async (runId) => {
  const res = await fetch(`${API_BASE}/api/run/reports/${runId}/logs`);
  if (res.status === 404) {
    throw new Error("No log files found for this test run.");
  }
  if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${runId}-logs.zip`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
};

export const applyFilters = (results, filters) => {
  if (!results || results.length === 0) return [];

  let filtered = [...results];

  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((r) => r.status === filters.status);
  }

  if (filters.search && filters.search.trim()) {
    const term = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.name?.toLowerCase().includes(term) ||
        r.fullName?.toLowerCase().includes(term) ||
        r.description?.toLowerCase().includes(term)
    );
  }

  return filtered;
};

export const getStatusBadgeStyle = (status) => {
  const styles = {
    passed:  { bg: "bg-green-100",  text: "text-green-800",  icon: "✅" },
    failed:  { bg: "bg-red-100",    text: "text-red-800",    icon: "❌" },
    broken:  { bg: "bg-yellow-100", text: "text-yellow-800", icon: "⚠️" },
    skipped: { bg: "bg-gray-100",   text: "text-gray-800",   icon: "⏭️" },
    unknown: { bg: "bg-purple-100", text: "text-purple-800", icon: "❓" },
  };
  return styles[status] || styles.unknown;
};

export const formatDuration = (duration) => {
  if (!duration || duration < 0) return "0ms";
  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};
