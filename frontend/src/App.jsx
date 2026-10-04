import React, { useRef, useState } from "react";
import { analyze, tailor } from "./api.js";
import { Badge, Card, Empty, ErrorBox, ScoreBar, ScoreRing, Spinner } from "./components.jsx";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;

function MatchIllustration() {
  return (
    <div className="match-visual" aria-label="Resume and job requirements being matched">
      <div className="visual-orbit orbit-one" />
      <div className="visual-orbit orbit-two" />
      <div className="mini-document resume-mini">
        <div className="mini-avatar" />
        <span className="mini-line long" /><span className="mini-line" />
        <span className="mini-rule" /><span className="mini-line long" />
        <span className="mini-line" /><span className="mini-line short" />
        <span className="mini-rule" /><span className="mini-line long" />
        <span className="mini-line short" />
      </div>
      <div className="match-connector"><span>↗</span></div>
      <div className="role-note">
        <span className="role-kicker">ROLE SIGNALS</span>
        <span className="role-tag"><i /> Research</span>
        <span className="role-tag"><i /> Python</span>
        <span className="role-tag"><i /> Collaboration</span>
      </div>
      <div className="visual-caption"><span className="caption-dot" /> Find the story your experience already tells</div>
    </div>
  );
}

function UploadIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" /></svg>;
}

export default function App() {
  const [resume, setResume] = useState(null);
  const [jd, setJd] = useState("");
  const [jdFile, setJdFile] = useState(null);
  const [result, setResult] = useState(null);
  const [tailored, setTailored] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [error, setError] = useState("");
  const tailorRef = useRef(null);
  const resumeInputRef = useRef(null);

  const canAnalyze = resume && (jd.trim().length > 0 || jdFile) && !loading;

  const acceptResume = (file) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Invalid PDF. Choose a resume saved as a PDF file.");
      return;
    }
    if (file.size > MAX_RESUME_SIZE) {
      setError("This PDF is larger than 5 MB. Choose a smaller resume file.");
      return;
    }
    setError("");
    setResume(file);
  };

  const loadSample = async () => {
    try {
      const [pdf, text] = await Promise.all([fetch("/sample_resume.pdf"), fetch("/sample_job_description.txt")]);
      if (!pdf.ok || !text.ok) throw new Error();
      setResume(new File([await pdf.blob()], "sample_resume.pdf", { type: "application/pdf" }));
      setJd(await text.text());
    } catch { setError("Sample files not found. Run the sample PDF script (see README) or upload your own."); }
  };

  const onAnalyze = async () => {
    setLoading(true); setError(""); setResult(null); setTailored(null);
    try { setResult(await analyze(resume, jd, jdFile)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const onTailor = async () => {
    setTailoring(true); setError("");
    try {
      setTailored(await tailor({ resume_text: result.resume_text, jd_text: result.jd_text, recommendations: result.analysis.recommendations }));
      setTimeout(() => tailorRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e) { setError(e.message); }
    finally { setTailoring(false); }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([tailored.tailored_resume], { type: "text/plain" }));
    const anchor = Object.assign(document.createElement("a"), { href: url, download: "tailored_resume.txt" });
    anchor.click(); URL.revokeObjectURL(url);
  };

  const printPdf = () => {
    const windowRef = window.open("", "_blank");
    if (!windowRef) return setError("Pop-up blocked. Allow pop-ups or use the TXT download.");
    const escaped = tailored.tailored_resume.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    windowRef.document.write(`<title>Tailored Resume</title><pre style="font:13px/1.5 Helvetica,Arial,sans-serif;white-space:pre-wrap;max-width:720px;margin:32px auto">${escaped}</pre>`);
    windowRef.document.close(); windowRef.focus(); windowRef.print();
  };

  const a = result?.analysis;

  return (
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-inner">
            <a className="brand" href="#top" aria-label="ResumePilot home"><span className="brand-mark">r<span>.</span></span><span>ResumePilot</span></a>
            <div className="topbar-meta"><span className="status-dot" /> A clearer next step in your job search</div>
          </div>
        </header>

        <main id="top" className="page-wrap">
          <section className="intro" aria-labelledby="hero-title">
            <div className="intro-copy">
              <p className="eyebrow"><span /> YOUR NEXT APPLICATION, WITH INTENTION</p>
              <h1 id="hero-title">Tailor your resume for the job you <em>actually</em> want.</h1>
              <p className="intro-text">Bring your experience and a role you care about. Get a thoughtful read on the match, practical ways to strengthen it, and a tailored draft to make your own.</p>
              <div className="workflow-line" aria-label="Workflow: Add your materials, understand your fit, make it yours">
                <span><b>01</b> Add your materials</span><i />
                <span><b>02</b> Understand your fit</span><i />
                <span><b>03</b> Make it yours</span>
              </div>
            </div>
            <MatchIllustration />
          </section>

          {error && <ErrorBox message={error} onClose={() => setError("")} />}

          <section className="input-workspace" aria-label="Add application materials">
            <div className="workspace-heading">
              <div><p className="section-kicker">START WITH THE DETAILS</p><h2>Build your application brief</h2></div>
              <button className="text-button" onClick={loadSample} disabled={loading}>Try with sample files <span aria-hidden="true">↗</span></button>
            </div>

            <div className="input-grid">
              <section className="input-panel resume-panel" aria-labelledby="resume-title">
                <div className="panel-heading"><span className="step-number">01</span><div><h3 id="resume-title">Your resume</h3><p>Start with the experience you already have.</p></div></div>
                <input ref={resumeInputRef} id="resume" type="file" accept="application/pdf,.pdf" className="visually-hidden" onChange={(event) => { acceptResume(event.target.files[0]); event.target.value = ""; }} />
                <div className={`dropzone ${resume ? "has-file" : ""}`} role="button" tabIndex={0} onClick={() => resumeInputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); resumeInputRef.current?.click(); } }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); acceptResume(event.dataTransfer.files[0]); }}>
                  {resume ? <>
                    <span className="file-icon"><span>PDF</span></span>
                    <span className="upload-main">{resume.name}</span>
                    <span className="upload-detail">{(resume.size / 1024).toFixed(0)} KB · Ready to analyze</span>
                    <span className="replace-file">Choose a different file</span>
                  </> : <>
                    <span className="upload-icon"><UploadIcon /></span>
                    <span className="upload-main">Drop your resume here</span>
                    <span className="upload-detail">or <span className="inline-link">browse files</span> · PDF, up to 5 MB</span>
                  </>}
                </div>
                <p className="panel-footnote">A text-based PDF gives the clearest results.</p>
              </section>

              <section className="input-panel jd-panel" aria-labelledby="jd-title">
                <div className="panel-heading"><span className="step-number">02</span><div><h3 id="jd-title">The job description</h3><p>Give us the role you have in mind.</p></div></div>
                <label htmlFor="jd" className="visually-hidden">Job description</label>
                <textarea id="jd" rows={9} value={jd} onChange={(event) => setJd(event.target.value)} placeholder="Paste the job description here. Include the responsibilities and qualifications so we can compare the full picture…" />
                <div className="jd-tools">
                  <label className="attach-button" htmlFor="jdfile">{jdFile ? <><span className="attachment-check">✓</span> {jdFile.name}</> : <><span aria-hidden="true">＋</span> Attach PDF or TXT</>}</label>
                  <input id="jdfile" type="file" accept=".pdf,.txt,text/plain,application/pdf" className="visually-hidden" onChange={(event) => setJdFile(event.target.files[0] || null)} />
                  <span>{jd.trim().length ? `${jd.trim().length.toLocaleString()} characters` : "Long descriptions welcome"}</span>
                </div>
                {!jd.trim() && !jdFile && <p className="field-hint">Add a description or attach a file to continue.</p>}
              </section>
            </div>

            <div className="workspace-actions">
              <button className="primary-button" disabled={!canAnalyze} onClick={onAnalyze}>
                {loading ? <Spinner label="Reading your match…" /> : <>Analyze Match <span aria-hidden="true">→</span></>}
              </button>
              <p className="action-hint">{loading ? "Comparing your experience with the role. This usually takes 15–60 seconds." : "Your analysis includes fit, keyword coverage, and specific next steps."}</p>
            </div>
            {loading && <div className="loading-strip" role="status"><span className="loading-track"><i /></span><span>Reading the role, mapping your experience, and looking for the strongest story.</span></div>}
            <p className="privacy-note"><span aria-hidden="true">◈</span> Your resume is processed through Gemma 4 via the configured API. Don't upload confidential information you're not comfortable sending to the provider.</p>
          </section>

          {a && <section className="results-workspace" aria-labelledby="results-title">
            <div className="results-heading"><div><p className="section-kicker">YOUR APPLICATION BRIEF</p><h2 id="results-title">A clearer picture of your fit</h2><p>{result.disclaimer}</p></div><span className="analysis-complete"><i /> Analysis complete</span></div>

            <div className="score-overview">
              <div className="overall-score"><ScoreRing value={a.overall_score} /><div><span className="score-label">OVERALL COMPATIBILITY</span><h3>{a.overall_score >= 75 ? "A strong foundation" : a.overall_score >= 50 ? "A promising starting point" : "Room to make your case"}</h3><p>Use this as a guide, not a verdict. The right story can make a difference.</p></div></div>
              <div className="score-breakdown">
                <ScoreBar label="Skills match" value={a.skills_score} />
                <ScoreBar label="Experience match" value={a.experience_score} />
                <ScoreBar label="Projects match" value={a.projects_score} />
                <ScoreBar label="Education match" value={a.education_score} />
              </div>
            </div>

            <div className="evidence-grid">
              <Card title="Where you already align" subtitle="Relevant strengths to bring forward." className="evidence-panel">
                {a.strong_matches.length ? <ul className="evidence-list">{a.strong_matches.map((match, index) => <li key={index}><span className="evidence-mark positive">✓</span><div><strong>{match.name}</strong>{match.detail && <p>{match.detail}</p>}</div></li>)}</ul> : <Empty>No clear strengths were identified for this role yet.</Empty>}
              </Card>
              <Card title="Opportunities to address" subtitle="Gaps or details that may need more context." className="evidence-panel">
                {a.missing_skills.length || a.weak_or_underrepresented_skills.length ? <ul className="evidence-list">{a.missing_skills.map((match, index) => <li key={`m${index}`}><span className="evidence-mark missing">−</span><div><strong>{match.name} <Badge tone="red">Missing</Badge></strong>{match.detail && <p>{match.detail}</p>}</div></li>)}{a.weak_or_underrepresented_skills.map((match, index) => <li key={`w${index}`}><span className="evidence-mark caution">~</span><div><strong>{match.name} <Badge tone="amber">Underrepresented</Badge></strong>{match.detail && <p>{match.detail}</p>}</div></li>)}</ul> : <Empty>No notable gaps identified in this comparison.</Empty>}
              </Card>
            </div>

            <Card title="Keyword coverage" subtitle="A quick view of how the role's language shows up in your resume. Use only terms that reflect your real experience." className="keyword-panel">
              <div className="keyword-groups">{[["Matched", "green", result.keyword_coverage.matched], ["Missing", "red", result.keyword_coverage.missing], ["Needs more context", "amber", result.keyword_coverage.weak]].map(([label, tone, list]) => <div className="keyword-row" key={label}><span className="keyword-label">{label}<small>{list.length} {list.length === 1 ? "term" : "terms"}</small></span><div className="keyword-list">{list.length ? list.map((keyword, index) => <Badge key={index} tone={tone}>{keyword}</Badge>) : <span className="no-keywords">None found</span>}</div></div>)}</div>
            </Card>

            <section className="recommendations-section" aria-labelledby="recommendations-title">
              <div className="recommendations-heading"><div><p className="section-kicker">SMALL, SPECIFIC IMPROVEMENTS</p><h2 id="recommendations-title">Make the most of your experience</h2><p>{a.explanation}</p></div><span className="recommend-count">{a.recommendations.length} suggestions</span></div>
              {a.recommendations.length ? <ol className="recommendation-list">{a.recommendations.map((recommendation, index) => <li key={index} className="recommendation-item"><span className="recommend-index">{String(index + 1).padStart(2, "0")}</span><div className="recommend-content"><div className="recommend-title"><h3>{recommendation.title}</h3>{recommendation.verify_before_adding && <Badge tone="amber">Verify before adding</Badge>}</div>{recommendation.why && <p><strong>Why it matters</strong>{recommendation.why}</p>}{recommendation.action && <p><strong>Try this</strong>{recommendation.action}</p>}</div></li>)}</ol> : <Empty>No recommendations returned for this analysis.</Empty>}
              <div className="tailor-cta"><div><span className="section-kicker">READY FOR THE NEXT STEP?</span><h3>Turn the insights into a tailored draft.</h3><p>Review every detail before you use it. Your experience stays yours.</p></div><button className="primary-button" onClick={onTailor} disabled={tailoring}>{tailoring ? <Spinner label="Building your draft…" /> : <>Generate Tailored Resume <span aria-hidden="true">→</span></>}</button></div>
              {tailoring && <div className="tailoring-state" role="status"><span className="loading-track"><i /></span><span>Drafting a version around this role and your verified experience.</span></div>}
            </section>

            {tailored && <div ref={tailorRef} className="tailored-workspace"><div className="results-heading"><div><p className="section-kicker">YOUR NEXT DRAFT</p><h2>Tailored resume</h2><p>A working document to review, refine, and make your own.</p></div><span className="analysis-complete"><i /> Draft ready</span></div>
              <div role="alert" className="draft-warning"><span aria-hidden="true">!</span><p>{tailored.warning}</p></div>
              <div className="document-layout"><article className="resume-document" aria-label="Tailored resume preview"><div className="document-topline"><span>RESUME · WORKING DRAFT</span><span>REVIEW BEFORE SENDING</span></div><pre>{tailored.tailored_resume}</pre><div className="document-endmark">END OF DRAFT</div></article>
                <aside className="document-sidebar"><div className="document-actions"><h3>Take it with you</h3><button className="secondary-button" onClick={download}><span aria-hidden="true">↓</span> Download TXT</button><button className="secondary-button" onClick={printPdf}><span aria-hidden="true">▤</span> Print / Save as PDF</button></div><div className="review-list"><h3>What changed</h3>{tailored.changes_made.length ? <ul>{tailored.changes_made.map((change, index) => <li key={index}>{change}</li>)}</ul> : <Empty>Not listed.</Empty>}</div><div className="review-list verify-list"><h3>Verify before using</h3>{tailored.verify_items.length ? <ul>{tailored.verify_items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <Empty>Nothing flagged. Review everything before sending.</Empty>}</div></aside>
              </div>
            </div>}
          </section>}
        </main>
        <footer className="site-footer"><span className="brand-mark small">r<span>.</span></span><span>ResumePilot · Made for people finding their next opportunity.</span><span>Gemma 4 · open-weight model via hosted API</span></footer>
      </div>
  );
}
