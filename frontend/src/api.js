async function request(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error("Cannot reach the backend. Is it running on http://127.0.0.1:8000?");
  }
  let data = null;
  try { data = await res.json(); } catch { /* non-JSON error body */ }
  if (!res.ok) {
    const d = data?.detail;
    throw new Error(typeof d === "string" ? d : Array.isArray(d) ? "Invalid input. Check the resume and job description." : `Request failed (${res.status}).`);
  }
  return data;
}

export const analyze = (resumeFile, jdText, jdFile) => {
  const fd = new FormData();
  fd.append("resume", resumeFile);
  fd.append("jd_text", jdText);
  if (jdFile) fd.append("jd_file", jdFile);
  return request("/api/analyze", { method: "POST", body: fd });
};

export const tailor = (payload) =>
  request("/api/tailor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
