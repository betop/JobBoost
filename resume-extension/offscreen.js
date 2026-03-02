// Offscreen document for PDF generation and download
// Runs in a real DOM context so jsPDF works without CSP issues

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "generateAndDownloadPDFs") return false;

  (async () => {
    try {
      const generator = new PDFGenerator();
      await generator.init();

      // rawData is now a JSON object (new schema: {header, summary, skills, ...})
      // or a JSON string (legacy), or a string with cover_letter inside
      const rawData         = message.rawData || "";
      const coverLetterText = message.coverLetterText || "";
      const resumeFilename  = message.resumeFilename  || "Resume.pdf";
      const coverFilename   = message.coverLetterFilename || "Cover_Letter.pdf";
      const templateId      = message.templateId || 1;

      // Normalize rawData: if object, use directly; if string, try to parse
      let resumeObj = null;
      if (rawData && typeof rawData === "object") {
        // New schema: rawData IS the resume object {header, summary, skills, ...}
        resumeObj = rawData;
      } else if (rawData && typeof rawData === "string" && rawData.trim()) {
        resumeObj = _extractJSON(rawData);
        console.log("[PDFGen] parsed object from string:", resumeObj ? Object.keys(resumeObj) : "null");
      }

      // cover_letter comes separately as coverLetterText (HTML string)
      const hasCoverLetter = coverLetterText && coverLetterText.trim().length > 0;

      if (!resumeObj) {
        throw new Error("No resume content returned from server.");
      }

      // Generate and download resume PDF — pass resume object directly
      const resumePdf = generator.generateResumePDF(resumeObj, resumeFilename, templateId);
      downloadBlob(resumePdf.dataUri, resumePdf.filename);

      // Generate and download cover letter PDF
      if (hasCoverLetter) {
        await new Promise((r) => setTimeout(r, 1500));
        // Wrap in envelope so generateCoverLetterPDF can find cover_letter + resume header
        const coverInput = { cover_letter: coverLetterText, ...resumeObj };
        const coverPdf = generator.generateCoverLetterPDF(coverInput, coverFilename);
        downloadBlob(coverPdf.dataUri, coverPdf.filename);
      }

      sendResponse({ success: true });
    } catch (err) {
      console.error("[PDFGen] error:", err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true; // keep message channel open for async response
});

function downloadBlob(dataUri, filename) {
  // Convert data URI to Blob
  const [header, base64] = dataUri.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);

  // Trigger download via hidden <a> tag
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Revoke after a short delay to allow the download to start
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
