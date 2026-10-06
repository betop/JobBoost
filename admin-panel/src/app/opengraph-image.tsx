import { renderOg, OG_SIZE } from "./og";

export const alt = "HHQ - AI Resume Generator & ATS Resume Builder for Teams";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg("AI Resume Generator & ATS Resume Builder", "Tailored resume and cover letter from any job description");
}
