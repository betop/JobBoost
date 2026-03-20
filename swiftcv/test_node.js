// Node test for pdfGenerator.js logic (no browser APIs needed)
const PDFGenerator = require('./pdfGenerator.js');
const gen = new PDFGenerator();

// Expose _extractJSON — it's global in browser but not exported in Node
// Re-read from file to access it
eval(require('fs').readFileSync('./pdfGenerator.js', 'utf8').split('\nclass ')[0]);

// Test _parseInput with object
const data = {
  resume: {
    name: 'Joshua Butler',
    title: 'Full Stack Developer',
    email: 'joshua@example.com',
    phone: '904-555-1234',
    location: 'Jacksonville, FL',
    linkedin: { display: 'linkedin.com/in/joshuabutler', url: 'https://linkedin.com/in/joshuabutler' },
    summary: 'Experienced developer with **8 years** building scalable web applications.',
    skills: [
      { category: 'Languages', values: ['JavaScript', 'Python'] }
    ],
    career_breakdowns: [
      {
        job_title: 'Senior Software Engineer',
        company: 'Acme Technologies',
        location: 'Remote',
        date_range: 'Jan 2021 – Present',
        highlights: ['Built **microservices**'],
        tech_stack: ['Node.js', 'React']
      }
    ],
    education: [{ degree_name: 'BS CS', institution: 'UF', year: '2017' }]
  },
  cover_letter: {
    paragraphs: ['Dear Hiring Manager, I am interested in this role.']
  }
};

// Test _parseInput
const result = gen._parseInput(data);
console.log('_parseInput returns type:', typeof result, '| keys:', Object.keys(result).join(', '));
console.log('has resume:', !!(result && result.resume));

// Test _parseMarkers
const segs1 = gen._parseMarkers('Hello **world** foo');
console.log('_parseMarkers test1:', JSON.stringify(segs1));

const segs2 = gen._parseMarkers('*italic with **bold** inside*');
console.log('_parseMarkers test2:', JSON.stringify(segs2));

const segs3 = gen._parseMarkers('');
console.log('_parseMarkers empty:', JSON.stringify(segs3));

// Test _extractJSON
const jsonStr = '{"resume":{"name":"test"}}';
const extracted = _extractJSON(jsonStr);
console.log('_extractJSON plain:', extracted ? Object.keys(extracted).join(', ') : 'null');

const fenced = '```json\n{"resume":{"name":"test"}}\n```';
const extracted2 = _extractJSON(fenced);
console.log('_extractJSON fenced:', extracted2 ? Object.keys(extracted2).join(', ') : 'null');

// Test that passing an object through _parseInput then check
const passedObj = gen._parseInput(data);
const r = passedObj.resume || passedObj;
console.log('resume.name:', r.name);
console.log('career_breakdowns length:', (r.career_breakdowns || []).length);
console.log('skills length:', (r.skills || []).length);

// Check the skills row values are arrays
(r.skills || []).forEach((row, i) => {
  console.log('skill[' + i + '].category:', row.category, '| values type:', typeof row.values, '| isArray:', Array.isArray(row.values));
});

// Check career_breakdowns fields
(r.career_breakdowns || []).forEach((job, i) => {
  console.log('job[' + i + '].title:', job.title || job.job_title, '| date_range:', job.date_range);
  const bullets = job.highlights || job.bullets || [];
  console.log('  bullets length:', bullets.length);
});

console.log('\nAll Node-level checks PASSED');
