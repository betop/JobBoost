import { renderOg, OG_SIZE } from "../og";

export const alt = "Download the Resume Generator Chrome Extension and Gmail Job Tracker";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOg("Resume Generator Chrome Extension", "Plus a Gmail job tracker. Download SwiftCV and Mail Triage");
}
