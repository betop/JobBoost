"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, X, FileText } from "lucide-react";
import { aiProfileService } from "@/services/aiProfileService";
import type { CreateProfileInput } from "@/services/profileService";

interface Props {
  onParsed: (data: CreateProfileInput) => void | Promise<void>;
}

const ACCEPTED = ".pdf,.txt,.json,.doc,.docx";
const PDFJS_NPM_VERSION = "5.5.207";

type PdfJsModule = {
  version: string;
  GlobalWorkerOptions: {
    workerSrc?: string;
    workerPort?: Worker;
  };
  getDocument: (params: { data: ArrayBuffer }) => {
    promise: Promise<{
      numPages: number;
      getPage: (pageNumber: number) => Promise<{
        getTextContent: () => Promise<{ items: unknown[] }>;
      }>;
    }>;
  };
};

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;

async function importPdfJsFromCdn(): Promise<PdfJsModule> {
  return import(
    /* webpackIgnore: true */ `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_NPM_VERSION}/legacy/build/pdf.min.mjs`
  ) as Promise<PdfJsModule>;
}

async function loadPdfJsModule(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = (async () => {
      try {
        const localModulePath = "pdfjs-dist/webpack.mjs";
        return (await import(localModulePath)) as PdfJsModule;
      } catch (localErr) {
        console.warn("Local pdfjs import failed, using CDN fallback", localErr);
        return importPdfJsFromCdn();
      }
    })();
  }

  return pdfJsModulePromise;
}

export default function ResumeAutofill({ onParsed }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    setLoading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let extractedText = "";

      if (ext === "json") {
        extractedText = await file.text();
      }

      else if (ext === "txt") {
        extractedText = await file.text();
      }

      else if (ext === "pdf") {
        extractedText = await extractTextFromPdf(file);
      }

      else if (ext === "doc" || ext === "docx") {
        extractedText = await extractTextFromDoc(file);
      }

      else {
        setError("Unsupported file type. Please upload a PDF, TXT, JSON, DOC, or DOCX file.");
        return;
      }

      const aiProfile = await aiProfileService.parseResumeText(extractedText);
      await onParsed(aiProfile);
    } catch (e) {
      console.error(e);
      setError("Failed to parse the file. Please try a different format.");
    } finally {
      setLoading(false);
    }
  }

  async function extractTextFromPdf(file: File): Promise<string> {
    const pdfjsLib = await loadPdfJsModule();

    if (!pdfjsLib.GlobalWorkerOptions.workerPort) {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) =>
          typeof item === "object" && item !== null && "str" in item
            ? (item as { str: string }).str
            : ""
        )
        .join(" ");
      pages.push(pageText);
    }
    return pages.join("\n");
  }

  async function extractTextFromDoc(file: File): Promise<string> {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset so same file can be re-uploaded
    e.target.value = "";
  }

  function clearFile() {
    setFileName(null);
    setError(null);
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">Autofill from Resume</span>
        <span className="text-xs text-gray-400">(PDF, TXT, JSON, DOC, DOCX)</span>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !loading && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center gap-2
          border-2 border-dashed rounded-lg p-6 cursor-pointer
          transition-colors select-none
          ${loading ? "border-blue-300 bg-blue-50 cursor-not-allowed" : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={handleChange}
          disabled={loading}
        />

        {loading ? (
          <>
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-blue-600 font-medium">Extracting text and parsing with AI…</p>
          </>
        ) : fileName ? (
          <>
            <FileText className="w-8 h-8 text-green-500" />
            <div className="flex items-center gap-2">
              <p className="text-sm text-green-700 font-medium">{fileName}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); clearFile(); }}
                className="p-0.5 rounded text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Form has been autofilled — click to upload another file</p>
          </>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Click to upload</span> or drag & drop
            </p>
            <p className="text-xs text-gray-400">PDF, TXT, JSON, DOC, DOCX</p>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
          <X className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
