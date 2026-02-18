import { useState, useEffect, useRef } from 'react';
import { profile as profileAPI } from '../../../api';
import { useToast } from '../../../components/Toast';
import {
  FileText, Download, Eye, EyeOff, Layout, Plus, X, Trash2,
  Info, ChevronDown, ChevronUp, Lightbulb, Star, Globe, Award,
  Users, Briefcase, GraduationCap, Phone, Mail, MapPin, Linkedin,
  Github
} from 'lucide-react';

/* ─── Tips per section ─── */
const TIPS = {
  summary: 'Keep your summary under 3 sentences. Focus on your value proposition.',
  experience: 'Use action verbs and quantify achievements (e.g., "Increased sales by 30%").',
  education: 'List your most recent or relevant education first.',
  skills: 'Include a mix of technical and soft skills relevant to the job.',
  languages: 'List languages with honest proficiency levels.',
  certifications: 'Include relevant certifications even if expired — note the dates.',
  references: 'Always ask permission before listing someone as a reference.',
};

const Tip = ({ section }) => {
  const [show, setShow] = useState(false);
  if (!TIPS[section]) return null;
  return (
    <span className="relative inline-block ml-2">
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="text-amber-500 hover:text-amber-600"
        title="Tips"
      >
        <Lightbulb size={16} />
      </button>
      {show && (
        <span className="absolute z-50 left-6 top-0 w-64 p-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 shadow-lg">
          {TIPS[section]}
          <button onClick={() => setShow(false)} className="ml-2 text-amber-600 font-bold">×</button>
        </span>
      )}
    </span>
  );
};

/* ─── Proficiency bar for skills ─── */
const proficiencyLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const proficiencyWidth = { Beginner: '25%', Intermediate: '50%', Advanced: '75%', Expert: '100%' };
const proficiencyColor = { Beginner: 'bg-blue-300', Intermediate: 'bg-blue-400', Advanced: 'bg-blue-500', Expert: 'bg-blue-600' };

/* ─── Default resume data ─── */
const defaultData = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  headline: '',
  summary: '',
  linkedin: '',
  github: '',
  website: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  references: [],
};

/* ─── Template renderers ─── */
function ClassicTemplate({ data }) {
  return (
    <div className="font-serif text-gray-900 p-8 bg-white" style={{ fontFamily: 'Georgia, serif' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
        <h1 className="text-3xl font-bold uppercase tracking-wide">{data.fullName || 'Your Name'}</h1>
        {data.headline && <p className="text-lg text-gray-600 mt-1 italic">{data.headline}</p>}
        <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm text-gray-600">
          {data.email && <span>✉ {data.email}</span>}
          {data.phone && <span>☎ {data.phone}</span>}
          {data.location && <span>⌂ {data.location}</span>}
        </div>
        <div className="flex flex-wrap justify-center gap-4 mt-1 text-sm text-gray-500">
          {data.linkedin && <span>LinkedIn: {data.linkedin}</span>}
          {data.github && <span>GitHub: {data.github}</span>}
          {data.website && <span>Web: {data.website}</span>}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">Professional Summary</h2>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </div>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">Experience</h2>
          {data.experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <strong>{exp.title}</strong>
                <span className="text-sm text-gray-500">{exp.startDate} – {exp.endDate || 'Present'}</span>
              </div>
              <p className="text-sm italic text-gray-600">{exp.company}{exp.location ? `, ${exp.location}` : ''}</p>
              {exp.description && <p className="text-sm mt-1">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">Education</h2>
          {data.education.map((edu, i) => (
            <div key={i} className="mb-2">
              <div className="flex justify-between">
                <strong>{edu.degree}</strong>
                <span className="text-sm text-gray-500">{edu.year}</span>
              </div>
              <p className="text-sm text-gray-600">{edu.institution}</p>
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">Skills</h2>
          <div className="grid grid-cols-2 gap-2">
            {data.skills.map((s, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{s.name}</span>
                <span className="text-gray-500 ml-2">— {s.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {data.languages.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">Languages</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {data.languages.map((l, i) => (
              <span key={i}>{l.language} ({l.proficiency})</span>
            ))}
          </div>
        </div>
      )}

      {/* Certifications */}
      {data.certifications.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">Certifications</h2>
          {data.certifications.map((c, i) => (
            <div key={i} className="text-sm mb-1">
              <strong>{c.name}</strong> — {c.issuer} {c.year && `(${c.year})`}
            </div>
          ))}
        </div>
      )}

      {/* References */}
      {data.references.length > 0 && (
        <div className="mb-5">
          <h2 className="text-lg font-bold uppercase border-b border-gray-400 pb-1 mb-2">References</h2>
          <div className="grid grid-cols-2 gap-4">
            {data.references.map((r, i) => (
              <div key={i} className="text-sm">
                <strong>{r.name}</strong>
                <p className="text-gray-600">{r.title}{r.company ? `, ${r.company}` : ''}</p>
                {r.email && <p className="text-gray-500">{r.email}</p>}
                {r.phone && <p className="text-gray-500">{r.phone}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModernTemplate({ data }) {
  return (
    <div className="flex bg-white text-gray-800 min-h-[800px]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Sidebar */}
      <div className="w-1/3 bg-gradient-to-b from-blue-700 to-blue-900 text-white p-6">
        <div className="mb-6">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-3xl font-bold mx-auto mb-3">
            {(data.fullName || 'Y')[0]}
          </div>
          <h1 className="text-xl font-bold text-center">{data.fullName || 'Your Name'}</h1>
          {data.headline && <p className="text-blue-200 text-center text-sm mt-1">{data.headline}</p>}
        </div>

        {/* Contact */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Contact</h3>
          {data.email && <p className="text-sm mb-1 break-all">✉ {data.email}</p>}
          {data.phone && <p className="text-sm mb-1">☎ {data.phone}</p>}
          {data.location && <p className="text-sm mb-1">📍 {data.location}</p>}
          {data.linkedin && <p className="text-sm mb-1 break-all">🔗 {data.linkedin}</p>}
          {data.github && <p className="text-sm mb-1 break-all">💻 {data.github}</p>}
        </div>

        {/* Skills with bars */}
        {data.skills.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Skills</h3>
            {data.skills.map((s, i) => (
              <div key={i} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>{s.name}</span>
                  <span className="text-blue-200 text-xs">{s.level}</span>
                </div>
                <div className="w-full bg-blue-950/40 rounded-full h-2">
                  <div className="bg-blue-300 h-2 rounded-full" style={{ width: proficiencyWidth[s.level] || '50%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Languages */}
        {data.languages.length > 0 && (
          <div className="mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-200 mb-2">Languages</h3>
            {data.languages.map((l, i) => (
              <p key={i} className="text-sm mb-1">{l.language} <span className="text-blue-200">• {l.proficiency}</span></p>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="w-2/3 p-6">
        {data.summary && (
          <div className="mb-5">
            <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-1 mb-2">About Me</h2>
            <p className="text-sm leading-relaxed">{data.summary}</p>
          </div>
        )}

        {data.experience.length > 0 && (
          <div className="mb-5">
            <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-1 mb-2">Experience</h2>
            {data.experience.map((exp, i) => (
              <div key={i} className="mb-3 pl-3 border-l-2 border-blue-200">
                <div className="flex justify-between items-start">
                  <strong className="text-sm">{exp.title}</strong>
                  <span className="text-xs text-gray-400 whitespace-nowrap ml-2">{exp.startDate} – {exp.endDate || 'Present'}</span>
                </div>
                <p className="text-sm text-blue-600">{exp.company}</p>
                {exp.description && <p className="text-xs text-gray-600 mt-1">{exp.description}</p>}
              </div>
            ))}
          </div>
        )}

        {data.education.length > 0 && (
          <div className="mb-5">
            <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-1 mb-2">Education</h2>
            {data.education.map((edu, i) => (
              <div key={i} className="mb-2 pl-3 border-l-2 border-blue-200">
                <strong className="text-sm">{edu.degree}</strong>
                <p className="text-sm text-gray-600">{edu.institution} {edu.year && `• ${edu.year}`}</p>
              </div>
            ))}
          </div>
        )}

        {data.certifications.length > 0 && (
          <div className="mb-5">
            <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-1 mb-2">Certifications</h2>
            {data.certifications.map((c, i) => (
              <div key={i} className="text-sm mb-1">
                <strong>{c.name}</strong> — {c.issuer} {c.year && `(${c.year})`}
              </div>
            ))}
          </div>
        )}

        {data.references.length > 0 && (
          <div className="mb-5">
            <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-200 pb-1 mb-2">References</h2>
            <div className="grid grid-cols-2 gap-3">
              {data.references.map((r, i) => (
                <div key={i} className="text-sm bg-gray-50 p-2 rounded">
                  <strong>{r.name}</strong>
                  <p className="text-gray-600 text-xs">{r.title}{r.company ? `, ${r.company}` : ''}</p>
                  {r.email && <p className="text-gray-500 text-xs">{r.email}</p>}
                  {r.phone && <p className="text-gray-500 text-xs">{r.phone}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SimpleTemplate({ data }) {
  return (
    <div className="p-8 bg-white text-gray-800 max-w-[700px] mx-auto" style={{ fontFamily: 'system-ui, sans-serif' }}>
      <h1 className="text-2xl font-bold">{data.fullName || 'Your Name'}</h1>
      {data.headline && <p className="text-gray-500 mt-0.5">{data.headline}</p>}
      <div className="flex flex-wrap gap-3 text-sm text-gray-500 mt-2 mb-4">
        {data.email && <span>{data.email}</span>}
        {data.phone && <span>• {data.phone}</span>}
        {data.location && <span>• {data.location}</span>}
        {data.linkedin && <span>• {data.linkedin}</span>}
      </div>
      <hr className="border-gray-300 mb-4" />

      {data.summary && (
        <>
          <p className="text-sm leading-relaxed mb-4">{data.summary}</p>
          <hr className="border-gray-200 mb-4" />
        </>
      )}

      {data.experience.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Experience</h2>
          {data.experience.map((exp, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <span className="font-semibold text-sm">{exp.title} — {exp.company}</span>
                <span className="text-xs text-gray-400">{exp.startDate} – {exp.endDate || 'Present'}</span>
              </div>
              {exp.description && <p className="text-sm text-gray-600 mt-0.5">{exp.description}</p>}
            </div>
          ))}
        </div>
      )}

      {data.education.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Education</h2>
          {data.education.map((edu, i) => (
            <div key={i} className="mb-1 text-sm">
              <strong>{edu.degree}</strong> — {edu.institution} {edu.year && `(${edu.year})`}
            </div>
          ))}
        </div>
      )}

      {data.skills.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Skills</h2>
          <p className="text-sm">{data.skills.map(s => `${s.name} (${s.level})`).join('  •  ')}</p>
        </div>
      )}

      {data.languages.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Languages</h2>
          <p className="text-sm">{data.languages.map(l => `${l.language} (${l.proficiency})`).join('  •  ')}</p>
        </div>
      )}

      {data.certifications.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Certifications</h2>
          {data.certifications.map((c, i) => (
            <p key={i} className="text-sm">{c.name} — {c.issuer} {c.year && `(${c.year})`}</p>
          ))}
        </div>
      )}

      {data.references.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">References</h2>
          {data.references.map((r, i) => (
            <div key={i} className="text-sm mb-2">
              <strong>{r.name}</strong> — {r.title}{r.company ? `, ${r.company}` : ''}
              {r.email && <span className="text-gray-500 ml-2">{r.email}</span>}
              {r.phone && <span className="text-gray-500 ml-2">{r.phone}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const TEMPLATES = {
  classic: { name: 'Classic', desc: 'Traditional, formal format', Component: ClassicTemplate },
  modern: { name: 'Modern', desc: 'Colorful sidebar with skill bars', Component: ModernTemplate },
  simple: { name: 'Simple', desc: 'Minimalist, print-friendly', Component: SimpleTemplate },
};

/* ─── Section label component ─── */
const SectionHeader = ({ icon: Icon, label, tipKey, collapsed, toggle }) => (
  <div className="flex items-center justify-between cursor-pointer select-none" onClick={toggle}>
    <div className="flex items-center gap-2">
      {Icon && <Icon size={18} className="text-primary-600" />}
      <h3 className="font-semibold text-gray-800">{label}</h3>
      <Tip section={tipKey} />
    </div>
    {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
  </div>
);

/* ─── Main Component ─── */
export default function ResumeBuilder() {
  const { showToast } = useToast();
  const previewRef = useRef();
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState('modern');
  const [showPreview, setShowPreview] = useState(false); // mobile toggle
  const [collapsed, setCollapsed] = useState({});
  const [data, setData] = useState(defaultData);
  const [downloading, setDownloading] = useState(false);

  const toggle = (section) => setCollapsed(p => ({ ...p, [section]: !p[section] }));
  const update = (field, value) => setData(p => ({ ...p, [field]: value }));

  // Load profile data
  useEffect(() => {
    (async () => {
      try {
        const res = await profileAPI.get();
        const p = res.profile;
        const u = res.user;
        setData(prev => ({
          ...prev,
          fullName: `${u.first_name || ''} ${u.last_name || ''}`.trim(),
          email: u.email || '',
          phone: p.phone || '',
          location: p.location || '',
          headline: p.headline || '',
          summary: p.bio || '',
          linkedin: p.social_links ? JSON.parse(p.social_links).linkedin || '' : '',
          github: p.social_links ? JSON.parse(p.social_links).github || '' : '',
          website: p.social_links ? JSON.parse(p.social_links).website || '' : '',
          experience: p.work_history ? JSON.parse(p.work_history).map(w => ({
            title: w.title || '',
            company: w.company || '',
            location: w.location || '',
            startDate: w.start_date || w.startDate || '',
            endDate: w.end_date || w.endDate || '',
            description: w.description || '',
          })) : [],
          education: p.education ? JSON.parse(p.education).map(e => ({
            degree: e.degree || '',
            institution: e.institution || '',
            year: e.year || '',
          })) : [],
          skills: p.skills ? JSON.parse(p.skills).map(s =>
            typeof s === 'string' ? { name: s, level: 'Intermediate' } : { name: s.name || s, level: s.level || 'Intermediate' }
          ) : [],
          languages: p.languages ? JSON.parse(p.languages) : [],
          certifications: p.certifications ? JSON.parse(p.certifications) : [],
        }));
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // PDF download
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = previewRef.current;
      await html2pdf().set({
        margin: 0,
        filename: `${data.fullName || 'resume'}-resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(element).save();
      showToast('Resume downloaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Download failed', 'error');
    } finally {
      setDownloading(false);
    }
  };

  // Add/remove helpers for array fields
  const addItem = (field, item) => update(field, [...data[field], item]);
  const removeItem = (field, idx) => update(field, data[field].filter((_, i) => i !== idx));
  const updateItem = (field, idx, key, val) => {
    const items = [...data[field]];
    items[idx] = { ...items[idx], [key]: val };
    update(field, items);
  };

  const TemplateComponent = TEMPLATES[template].Component;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-primary-600" /> Resume Builder
          </h1>
          <p className="text-gray-500 text-sm mt-1">Build a professional resume from your profile data</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="lg:hidden flex items-center gap-1 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? 'Edit' : 'Preview'}
          </button>
          <button
            onClick={downloadPDF}
            disabled={downloading}
            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-700 disabled:opacity-50"
          >
            <Download size={16} />
            {downloading ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Template selector */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-2">
        {Object.entries(TEMPLATES).map(([key, tmpl]) => (
          <button
            key={key}
            onClick={() => setTemplate(key)}
            className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-all text-left ${
              template === key
                ? 'border-primary-600 bg-primary-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-sm">{tmpl.name}</div>
            <div className="text-xs text-gray-500">{tmpl.desc}</div>
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Form (hidden on mobile when preview active) */}
        <div className={`w-full lg:w-1/2 space-y-4 ${showPreview ? 'hidden lg:block' : ''}`}>
          {/* Personal Info */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={User} label="Personal Info" tipKey="summary" collapsed={collapsed.personal} toggle={() => toggle('personal')} />
            {!collapsed.personal && (
              <div className="mt-3 space-y-3">
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Full Name" value={data.fullName} onChange={e => update('fullName', e.target.value)} />
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Email" value={data.email} onChange={e => update('email', e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Phone" value={data.phone} onChange={e => update('phone', e.target.value)} />
                  <input className="border rounded-lg px-3 py-2 text-sm" placeholder="Location" value={data.location} onChange={e => update('location', e.target.value)} />
                </div>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Headline (e.g. Software Engineer)" value={data.headline} onChange={e => update('headline', e.target.value)} />
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="LinkedIn URL" value={data.linkedin} onChange={e => update('linkedin', e.target.value)} />
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="GitHub URL" value={data.github} onChange={e => update('github', e.target.value)} />
                <input className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Website" value={data.website} onChange={e => update('website', e.target.value)} />
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={FileText} label="Summary" tipKey="summary" collapsed={collapsed.summary} toggle={() => toggle('summary')} />
            {!collapsed.summary && (
              <textarea
                className="mt-3 w-full border rounded-lg px-3 py-2 text-sm"
                rows={4}
                placeholder="A brief professional summary..."
                value={data.summary}
                onChange={e => update('summary', e.target.value)}
              />
            )}
          </div>

          {/* Experience */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={Briefcase} label="Experience" tipKey="experience" collapsed={collapsed.experience} toggle={() => toggle('experience')} />
            {!collapsed.experience && (
              <div className="mt-3 space-y-3">
                {data.experience.map((exp, i) => (
                  <div key={i} className="border rounded-lg p-3 relative">
                    <button onClick={() => removeItem('experience', i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Job Title" value={exp.title} onChange={e => updateItem('experience', i, 'title', e.target.value)} />
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Company" value={exp.company} onChange={e => updateItem('experience', i, 'company', e.target.value)} />
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Start (e.g. Jan 2020)" value={exp.startDate} onChange={e => updateItem('experience', i, 'startDate', e.target.value)} />
                      <input className="border rounded px-2 py-1 text-sm" placeholder="End (or Present)" value={exp.endDate} onChange={e => updateItem('experience', i, 'endDate', e.target.value)} />
                    </div>
                    <textarea className="w-full border rounded px-2 py-1 text-sm" rows={2} placeholder="Description" value={exp.description} onChange={e => updateItem('experience', i, 'description', e.target.value)} />
                  </div>
                ))}
                <button onClick={() => addItem('experience', { title: '', company: '', location: '', startDate: '', endDate: '', description: '' })} className="flex items-center gap-1 text-primary-600 text-sm hover:underline">
                  <Plus size={14} /> Add Experience
                </button>
              </div>
            )}
          </div>

          {/* Education */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={GraduationCap} label="Education" tipKey="education" collapsed={collapsed.education} toggle={() => toggle('education')} />
            {!collapsed.education && (
              <div className="mt-3 space-y-3">
                {data.education.map((edu, i) => (
                  <div key={i} className="border rounded-lg p-3 relative">
                    <button onClick={() => removeItem('education', i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Degree" value={edu.degree} onChange={e => updateItem('education', i, 'degree', e.target.value)} />
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Institution" value={edu.institution} onChange={e => updateItem('education', i, 'institution', e.target.value)} />
                    <input className="w-full border rounded px-2 py-1 text-sm" placeholder="Year" value={edu.year} onChange={e => updateItem('education', i, 'year', e.target.value)} />
                  </div>
                ))}
                <button onClick={() => addItem('education', { degree: '', institution: '', year: '' })} className="flex items-center gap-1 text-primary-600 text-sm hover:underline">
                  <Plus size={14} /> Add Education
                </button>
              </div>
            )}
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={Star} label="Skills" tipKey="skills" collapsed={collapsed.skills} toggle={() => toggle('skills')} />
            {!collapsed.skills && (
              <div className="mt-3 space-y-2">
                {data.skills.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Skill name" value={s.name} onChange={e => updateItem('skills', i, 'name', e.target.value)} />
                    <select className="border rounded px-2 py-1 text-sm" value={s.level} onChange={e => updateItem('skills', i, 'level', e.target.value)}>
                      {proficiencyLevels.map(l => <option key={l}>{l}</option>)}
                    </select>
                    <button onClick={() => removeItem('skills', i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addItem('skills', { name: '', level: 'Intermediate' })} className="flex items-center gap-1 text-primary-600 text-sm hover:underline">
                  <Plus size={14} /> Add Skill
                </button>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={Globe} label="Languages" tipKey="languages" collapsed={collapsed.languages} toggle={() => toggle('languages')} />
            {!collapsed.languages && (
              <div className="mt-3 space-y-2">
                {data.languages.map((l, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className="flex-1 border rounded px-2 py-1 text-sm" placeholder="Language" value={l.language} onChange={e => updateItem('languages', i, 'language', e.target.value)} />
                    <select className="border rounded px-2 py-1 text-sm" value={l.proficiency} onChange={e => updateItem('languages', i, 'proficiency', e.target.value)}>
                      <option>Basic</option><option>Conversational</option><option>Intermediate</option><option>Fluent</option><option>Native</option>
                    </select>
                    <button onClick={() => removeItem('languages', i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addItem('languages', { language: '', proficiency: 'Intermediate' })} className="flex items-center gap-1 text-primary-600 text-sm hover:underline">
                  <Plus size={14} /> Add Language
                </button>
              </div>
            )}
          </div>

          {/* Certifications */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={Award} label="Certifications" tipKey="certifications" collapsed={collapsed.certifications} toggle={() => toggle('certifications')} />
            {!collapsed.certifications && (
              <div className="mt-3 space-y-3">
                {data.certifications.map((c, i) => (
                  <div key={i} className="border rounded-lg p-3 relative">
                    <button onClick={() => removeItem('certifications', i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Certification Name" value={c.name} onChange={e => updateItem('certifications', i, 'name', e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Issuer" value={c.issuer} onChange={e => updateItem('certifications', i, 'issuer', e.target.value)} />
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Year" value={c.year} onChange={e => updateItem('certifications', i, 'year', e.target.value)} />
                    </div>
                  </div>
                ))}
                <button onClick={() => addItem('certifications', { name: '', issuer: '', year: '' })} className="flex items-center gap-1 text-primary-600 text-sm hover:underline">
                  <Plus size={14} /> Add Certification
                </button>
              </div>
            )}
          </div>

          {/* References */}
          <div className="bg-white rounded-xl border p-4">
            <SectionHeader icon={Users} label="References" tipKey="references" collapsed={collapsed.references} toggle={() => toggle('references')} />
            {!collapsed.references && (
              <div className="mt-3 space-y-3">
                {data.references.map((r, i) => (
                  <div key={i} className="border rounded-lg p-3 relative">
                    <button onClick={() => removeItem('references', i)} className="absolute top-2 right-2 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Name" value={r.name} onChange={e => updateItem('references', i, 'name', e.target.value)} />
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Job Title" value={r.title} onChange={e => updateItem('references', i, 'title', e.target.value)} />
                    <input className="w-full border rounded px-2 py-1 text-sm mb-2" placeholder="Company" value={r.company} onChange={e => updateItem('references', i, 'company', e.target.value)} />
                    <div className="grid grid-cols-2 gap-2">
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Email" value={r.email} onChange={e => updateItem('references', i, 'email', e.target.value)} />
                      <input className="border rounded px-2 py-1 text-sm" placeholder="Phone" value={r.phone} onChange={e => updateItem('references', i, 'phone', e.target.value)} />
                    </div>
                  </div>
                ))}
                <button onClick={() => addItem('references', { name: '', title: '', company: '', email: '', phone: '' })} className="flex items-center gap-1 text-primary-600 text-sm hover:underline">
                  <Plus size={14} /> Add Reference
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preview panel */}
        <div className={`w-full lg:w-1/2 ${!showPreview ? 'hidden lg:block' : ''}`}>
          <div className="sticky top-4">
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  <Eye size={14} /> Live Preview — {TEMPLATES[template].name}
                </span>
              </div>
              <div ref={previewRef} className="overflow-auto max-h-[80vh]" style={{ transform: 'scale(0.75)', transformOrigin: 'top left', width: '133.33%' }}>
                <TemplateComponent data={data} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Used in SectionHeader but imported as User from lucide — fix the reference
function User(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={props.size||24} height={props.size||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
}
