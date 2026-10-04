import React from "react";

export const Card = ({ title, subtitle, children, className = "" }) => (
  <section className={`surface-card ${className}`}>
    {title && <h3 className="surface-title">{title}</h3>}
    {subtitle && <p className="surface-subtitle">{subtitle}</p>}
    <div className={title ? "surface-body" : ""}>{children}</div>
  </section>
);

const tones = {
  green: "badge-green",
  red: "badge-red",
  amber: "badge-amber",
  slate: "badge-slate",
};
export const Badge = ({ tone = "slate", children }) => (
  <span className={`status-badge ${tones[tone]}`}>{children}</span>
);

const scoreColor = (v) => (v >= 75 ? "#059669" : v >= 50 ? "#d97706" : "#e11d48");

export function ScoreRing({ value }) {
  const r = 52, c = 2 * Math.PI * r;
  return (
    <div className="score-ring" role="img" aria-label={`Overall match ${value} percent`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e4e6df" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={scoreColor(value)} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * value) / 100} />
      </svg>
      <div className="score-ring-label">
        <span>{value}%</span>
        <small>overall match</small>
      </div>
    </div>
  );
}

export const ScoreBar = ({ label, value }) => (
  <div className="score-bar">
    <div className="score-bar-label"><span>{label}</span><strong>{value}%</strong></div>
    <div className="score-track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="score-fill" style={{ width: `${value}%`, background: scoreColor(value) }} />
    </div>
  </div>
);

export const Empty = ({ children }) => <p className="empty-note">{children}</p>;

export const Spinner = ({ label }) => (
  <span className="spinner-label">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="spinner-track" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>{label}
  </span>
);

export const ErrorBox = ({ message, onClose }) => (
  <div role="alert" className="error-banner">
    <span className="error-symbol" aria-hidden="true">!</span>
    <span className="error-copy"><strong>We couldn't complete that step.</strong> {message}</span>
    {onClose && <button onClick={onClose} className="error-dismiss" aria-label="Dismiss error">Dismiss</button>}
  </div>
);
