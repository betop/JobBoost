import { renderOg, OG_SIZE } from "./og";

export const alt = "HHQ - AI resume generation for teams";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg("AI resume generation for teams", "Tailored resumes and cover letters from any job description");
}
