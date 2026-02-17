#!/usr/bin/env node

/**
 * Social Media Content Generator for WantokJobs
 * Generates Facebook and LinkedIn posts for marketing campaigns.
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://wantokjobs.com';
const BASE_HASHTAGS = ['#PNGJobs', '#WantokJobs', '#PapuaNewGuinea', '#PacificJobs', '#HiringPNG'];

const posts = [];

// --- Facebook: Hot job categories (5) ---
const categoryPosts = [
  { text: `Mining jobs in PNG are booming! 🏗️ Check out the latest openings on WantokJobs and start your career underground or in the office. ${SITE_URL}`, hashtags: [...BASE_HASHTAGS, '#MiningJobs', '#PNGMINING'] },
  { text: `🏥 Healthcare workers needed across Papua New Guinea! Nurses, doctors, lab techs — browse health jobs on WantokJobs today. ${SITE_URL}`, hashtags: [...BASE_HASHTAGS, '#HealthcareJobs', '#PNGHealth'] },
  { text: `Construction is picking up across PNG! 🔨 Find builder, engineer, and trades jobs on WantokJobs. ${SITE_URL}`, hashtags: [...BASE_HASHTAGS, '#ConstructionJobs', '#TradesJobs'] },
  { text: `📚 Teaching jobs available in PNG — primary, secondary, and tertiary. Make a difference and find your next role on WantokJobs. ${SITE_URL}`, hashtags: [...BASE_HASHTAGS, '#TeachingJobs', '#EducationPNG'] },
  { text: `🛢️ Oil & Gas opportunities in Papua New Guinea! Top employers are hiring on WantokJobs right now. ${SITE_URL}`, hashtags: [...BASE_HASHTAGS, '#OilAndGas', '#EnergyJobs'] },
];

categoryPosts.forEach(p => posts.push({ ...p, platform: 'facebook', target_audience: 'jobseekers_category', language: 'en' }));

// --- Facebook: Targeting jobseekers (5, mix of English and Tok Pisin) ---
const jobseekerPosts = [
  { text: `Looking for work in PNG? WantokJobs has 400+ jobs waiting for you! 🇵🇬 Search by location, industry, or company. ${SITE_URL}`, language: 'en' },
  { text: `Painim wok long PNG? WantokJobs i gat planti wok bilong yu! 🇵🇬 Kam lukim nau! ${SITE_URL}`, language: 'tpi' },
  { text: `Your next career move starts here. Browse hundreds of jobs across Papua New Guinea on WantokJobs 🚀 ${SITE_URL}`, language: 'en' },
  { text: `Wok i stap! Kam long WantokJobs na painim wok bilong yu tude. Planti kampani i putim wok long hia! 💪 ${SITE_URL}`, language: 'tpi' },
  { text: `New to the job market? WantokJobs makes it easy to find entry-level and graduate roles in PNG. Start your journey! 🎓 ${SITE_URL}`, language: 'en' },
];

jobseekerPosts.forEach(p => posts.push({ text: p.text, platform: 'facebook', target_audience: 'jobseekers', hashtags: BASE_HASHTAGS, language: p.language }));

// --- Facebook: Targeting employers (5) ---
const employerPosts = [
  { text: `Hiring in PNG? Post your job for free on WantokJobs and reach thousands of qualified candidates! 📢 ${SITE_URL}`, language: 'en' },
  { text: `Yu laik painim wokman? Putim wok bilong yu long WantokJobs — em fri na planti man bai lukim! 🇵🇬 ${SITE_URL}`, language: 'tpi' },
  { text: `Stop struggling to find talent in PNG. WantokJobs connects you with jobseekers across every province. Post today! ${SITE_URL}`, language: 'en' },
  { text: `Recruit smarter in Papua New Guinea. WantokJobs gives your listing maximum visibility — free to post! 🎯 ${SITE_URL}`, language: 'en' },
  { text: `Whether you're hiring in Port Moresby, Lae, or Mt Hagen — WantokJobs gets your job seen nationwide. 🗺️ ${SITE_URL}`, language: 'en' },
];

employerPosts.forEach(p => posts.push({ text: p.text, platform: 'facebook', target_audience: 'employers', hashtags: [...BASE_HASHTAGS, '#HiringNow', '#RecruitPNG'], language: p.language }));

// --- Facebook: Unique features (5) ---
const featurePosts = [
  { text: `Did you know? WantokJobs has remote jobs you can do from anywhere in PNG! 💻🏝️ Work from home, work from the village. ${SITE_URL}`, language: 'en' },
  { text: `WantokJobs updates daily with fresh job listings from top PNG employers. Never miss an opportunity — check back often! 🔄 ${SITE_URL}`, language: 'en' },
  { text: `No signup needed to browse jobs on WantokJobs! Just search, find, and apply. Simple as that. ✅ ${SITE_URL}`, language: 'en' },
  { text: `WantokJobs covers every province in Papua New Guinea — from NCD to Western, Highlands to the Islands. 🌏 ${SITE_URL}`, language: 'en' },
  { text: `Save time on your job search! WantokJobs lets you filter by salary, location, and job type in seconds. ⚡ ${SITE_URL}`, language: 'en' },
];

featurePosts.forEach(p => posts.push({ text: p.text, platform: 'facebook', target_audience: 'general', hashtags: BASE_HASHTAGS, language: p.language }));

// --- LinkedIn posts (10, professional tone) ---
const linkedinPosts = [
  { text: `Papua New Guinea's job market is evolving rapidly. WantokJobs aggregates opportunities across mining, healthcare, construction, education, and more — helping professionals connect with the right roles.\n\nExplore current openings: ${SITE_URL}`, target_audience: 'professionals' },
  { text: `For organisations recruiting in PNG: WantokJobs offers free job postings with nationwide reach. Simplify your hiring pipeline and access a growing pool of local talent.\n\n${SITE_URL}`, target_audience: 'employers' },
  { text: `The Pacific region presents unique workforce challenges. WantokJobs is bridging the gap between PNG employers and qualified candidates — one listing at a time.\n\n${SITE_URL}`, target_audience: 'industry' },
  { text: `Remote work is gaining traction in Papua New Guinea. WantokJobs now features remote and hybrid roles for PNG-based professionals looking for flexibility.\n\n${SITE_URL}`, target_audience: 'professionals' },
  { text: `Talent acquisition in PNG doesn't have to be difficult. WantokJobs provides a centralised platform where employers can post and candidates can discover opportunities across all 22 provinces.\n\n${SITE_URL}`, target_audience: 'employers' },
  { text: `Graduate entering the PNG workforce? WantokJobs features entry-level roles and internships to help you launch your career in Papua New Guinea.\n\n${SITE_URL}`, target_audience: 'graduates' },
  { text: `Mining and resources remain PNG's largest employment sector. WantokJobs tracks the latest openings from leading operators — stay informed and stay ahead.\n\n${SITE_URL}`, target_audience: 'professionals' },
  { text: `Healthcare recruitment in Papua New Guinea needs modern solutions. WantokJobs helps hospitals, clinics, and NGOs find the medical professionals they need.\n\n${SITE_URL}`, target_audience: 'employers' },
  { text: `Building a career in Papua New Guinea starts with access to the right opportunities. WantokJobs is the country's growing jobs platform — 400+ listings and counting.\n\n${SITE_URL}`, target_audience: 'professionals' },
  { text: `Investing in PNG's human capital means connecting talent with opportunity. WantokJobs is proud to support workforce development across the Pacific.\n\n${SITE_URL}`, target_audience: 'industry' },
];

linkedinPosts.forEach(p => posts.push({
  text: p.text,
  platform: 'linkedin',
  target_audience: p.target_audience,
  hashtags: ['#PNGJobs', '#WantokJobs', '#PapuaNewGuinea', '#PacificJobs', '#Hiring', '#Careers'],
  language: 'en',
}));

// Write output
const outDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'social-posts.json');
fs.writeFileSync(outPath, JSON.stringify(posts, null, 2));

const fbCount = posts.filter(p => p.platform === 'facebook').length;
const liCount = posts.filter(p => p.platform === 'linkedin').length;
const tpiCount = posts.filter(p => p.language === 'tpi').length;
console.log(`✅ Generated ${posts.length} social media posts (${fbCount} Facebook, ${liCount} LinkedIn, ${tpiCount} Tok Pisin)`);
console.log(`   Saved to ${outPath}`);
