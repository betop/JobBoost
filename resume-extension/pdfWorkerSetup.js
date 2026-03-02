// Polyfill window for jsPDF in a service worker context
// Must be imported BEFORE jspdf.umd.min.js
if (typeof window === "undefined") {
  self.window = self;
}
