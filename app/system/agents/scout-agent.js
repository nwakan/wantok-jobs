const result = this.db.prepare(query).get("employer", "employer", name);// Scout Agent - Employer Lead Discovery MVP
const result = this.db.prepare(query).get("employer", "employer", name);// Purpose: Find new employers for WantokJobs platform
const result = this.db.prepare(query).get("employer", "employer", name);// Target: 50+ leads on first run
const result = this.db.prepare(query).get("employer", "employer", name);// Created: 2026-03-23
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);const Database = require("better-sqlite3");
const result = this.db.prepare(query).get("employer", "employer", name);const path = require("path");
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);class ScoutAgent {
const result = this.db.prepare(query).get("employer", "employer", name);  constructor() {
const result = this.db.prepare(query).get("employer", "employer", name);    this.db = new Database(path.join(__dirname, "../../server/data/wantokjobs.db"));
const result = this.db.prepare(query).get("employer", "employer", name);    this.leads_found = 0;
const result = this.db.prepare(query).get("employer", "employer", name);    this.leads_saved = 0;
const result = this.db.prepare(query).get("employer", "employer", name);    this.errors = [];
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  log(message, level = "info") {
const result = this.db.prepare(query).get("employer", "employer", name);    const timestamp = new Date().toISOString();
const result = this.db.prepare(query).get("employer", "employer", name);    const prefix = level === "error" ? "❌" : level === "success" ? "✅" : "ℹ️";
const result = this.db.prepare(query).get("employer", "employer", name);    console.log(`[${timestamp}] ${prefix} Scout: ${message}`);
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  calculateConfidence(lead) {
const result = this.db.prepare(query).get("employer", "employer", name);    let score = 0;
const result = this.db.prepare(query).get("employer", "employer", name);    if (lead.website) score += 0.3;
const result = this.db.prepare(query).get("employer", "employer", name);    if (lead.email) score += 0.2;
const result = this.db.prepare(query).get("employer", "employer", name);    if (lead.phone) score += 0.15;
const result = this.db.prepare(query).get("employer", "employer", name);    if (lead.location) score += 0.1;
const result = this.db.prepare(query).get("employer", "employer", name);    if (lead.industry) score += 0.25;
const result = this.db.prepare(query).get("employer", "employer", name);    return Math.min(score, 1.0);
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  companyExists(name, website) {
const result = this.db.prepare(query).get("employer", "employer", name);    // Check if company is already registered (either role=employer OR account_type=employer)
const result = this.db.prepare(query).get("employer", "employer", name);    const query = `
const result = this.db.prepare(query).get("employer", "employer", name);      SELECT COUNT(*) as count FROM users 
const result = this.db.prepare(query).get("employer", "employer", name);      WHERE (role = ? OR account_type = ?) 
const result = this.db.prepare(query).get("employer", "employer", name);      AND LOWER(name) = LOWER(?)
const result = this.db.prepare(query).get("employer", "employer", name);    `;
const result = this.db.prepare(query).get("employer", "employer", name);    const result = this.db.prepare(query).get("employer", "employer", name, website || "");
const result = this.db.prepare(query).get("employer", "employer", name);    return result.count > 0;
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  leadExists(name, website) {
const result = this.db.prepare(query).get("employer", "employer", name);    const query = `
const result = this.db.prepare(query).get("employer", "employer", name);      SELECT COUNT(*) as count FROM employer_leads 
const result = this.db.prepare(query).get("employer", "employer", name);      WHERE LOWER(company_name) = LOWER(?) OR LOWER(website) = LOWER(?)
const result = this.db.prepare(query).get("employer", "employer", name);    `;
const result = this.db.prepare(query).get("employer", "employer", name);    const result = this.db.prepare(query).get(name, website || "");
const result = this.db.prepare(query).get("employer", "employer", name);    return result.count > 0;
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  saveLead(lead) {
const result = this.db.prepare(query).get("employer", "employer", name);    try {
const result = this.db.prepare(query).get("employer", "employer", name);      const stmt = this.db.prepare(`
const result = this.db.prepare(query).get("employer", "employer", name);        INSERT INTO employer_leads (
const result = this.db.prepare(query).get("employer", "employer", name);          company_name, website, email, phone, location, province,
const result = this.db.prepare(query).get("employer", "employer", name);          industry, source, confidence_score, metadata, created_by
const result = this.db.prepare(query).get("employer", "employer", name);        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
const result = this.db.prepare(query).get("employer", "employer", name);      `);
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      const metadata = JSON.stringify({
const result = this.db.prepare(query).get("employer", "employer", name);        discovery_date: new Date().toISOString(),
const result = this.db.prepare(query).get("employer", "employer", name);        discovery_method: "automated_scout"
const result = this.db.prepare(query).get("employer", "employer", name);      });
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      stmt.run(
const result = this.db.prepare(query).get("employer", "employer", name);        lead.company_name, lead.website || null, lead.email || null,
const result = this.db.prepare(query).get("employer", "employer", name);        lead.phone || null, lead.location || null, lead.province || null,
const result = this.db.prepare(query).get("employer", "employer", name);        lead.industry || null, lead.source, lead.confidence_score,
const result = this.db.prepare(query).get("employer", "employer", name);        metadata, "scout_agent"
const result = this.db.prepare(query).get("employer", "employer", name);      );
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      this.leads_saved++;
const result = this.db.prepare(query).get("employer", "employer", name);      this.log(`Saved: ${lead.company_name} (${(lead.confidence_score * 100).toFixed(0)}%)`, "success");
const result = this.db.prepare(query).get("employer", "employer", name);      return true;
const result = this.db.prepare(query).get("employer", "employer", name);    } catch (err) {
const result = this.db.prepare(query).get("employer", "employer", name);      this.log(`Failed to save ${lead.company_name}: ${err.message}`, "error");
const result = this.db.prepare(query).get("employer", "employer", name);      this.errors.push({ company: lead.company_name, error: err.message });
const result = this.db.prepare(query).get("employer", "employer", name);      return false;
const result = this.db.prepare(query).get("employer", "employer", name);    }
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  seedPNGCompanies() {
const result = this.db.prepare(query).get("employer", "employer", name);    this.log("Seeding known PNG companies...");
const result = this.db.prepare(query).get("employer", "employer", name);    
const result = this.db.prepare(query).get("employer", "employer", name);    const pngCompanies = [
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Bank South Pacific", website: "https://www.bsp.com.pg", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Air Niugini", website: "https://www.airniugini.com.pg", industry: "Transport & Logistics", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "PNG Power", website: "https://www.pngpower.com.pg", industry: "Government", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Ok Tedi Mining", website: "https://oktedi.com", industry: "Mining & Resources", location: "Tabubil", province: "Western Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Digicel PNG", website: "https://www.digicelgroup.com", industry: "Telecommunications", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Steamships Trading Company", website: "https://www.steamships.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Coffee Industry Corporation", website: "https://cic.org.pg", industry: "Agriculture", location: "Goroka", province: "Eastern Highlands Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "New Britain Palm Oil", website: "https://www.nbpol.com.pg", industry: "Agriculture", location: "Kimbe", province: "West New Britain Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Ramu NiCo", website: "https://www.ramunico.com", industry: "Mining & Resources", location: "Madang", province: "Madang Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Lae Biscuit Company", website: "https://www.laebiscuit.com.pg", industry: "Manufacturing", location: "Lae", province: "Morobe Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Coca-Cola Amatil PNG", website: "https://www.ccamatil.com", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "PNG Forest Products", website: "https://www.pngfp.com", industry: "Manufacturing", location: "Lae", province: "Morobe Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Trukai Industries", website: "https://www.trukai.com", industry: "Agriculture", location: "Lae", province: "Morobe Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Oil Search", website: "https://www.oilsearch.com", industry: "Oil & Gas", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "ExxonMobil PNG", website: "https://www.exxonmobil.com.pg", industry: "Oil & Gas", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Newcrest Mining", website: "https://www.newcrest.com", industry: "Mining & Resources", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Barrick Niugini", website: "https://www.barrick.com", industry: "Mining & Resources", location: "Wau", province: "Morobe Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Pacific MMI", website: "https://www.pmmi.com.pg", industry: "Insurance", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Paradise Foods", website: "https://www.paradisefoods.com.pg", industry: "Manufacturing", location: "Lae", province: "Morobe Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Credit Corporation", website: "https://www.creditcorporation.com.pg", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Westpac PNG", website: "https://www.westpac.com.pg", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "ANZ PNG", website: "https://www.anz.com/png", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Bemobile", website: "https://www.bmobile.com.pg", industry: "Telecommunications", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Telikom PNG", website: "https://www.telikom.com.pg", industry: "Telecommunications", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Airlines PNG", website: "https://www.apng.com", industry: "Transport & Logistics", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Pacific Palms Property", website: "https://www.pacificpalms.com.pg", industry: "Real Estate", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Stop N Shop", website: "https://www.stopnshop.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Brian Bell", website: "https://www.brianbell.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "RH Hypermarket", website: "https://www.rhhypermarket.com.pg", industry: "Retail & FMCG", location: "Lae", province: "Morobe Province" },
const result = this.db.prepare(query).get("employer", "employer", name);      { name: "Ela Motors", website: "https://www.elamotors.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
const result = this.db.prepare(query).get("employer", "employer", name);    ];
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);    for (const company of pngCompanies) {
const result = this.db.prepare(query).get("employer", "employer", name);      if (this.companyExists(company.name, company.website)) {
const result = this.db.prepare(query).get("employer", "employer", name);        this.log(`${company.name} already registered - skipping`);
const result = this.db.prepare(query).get("employer", "employer", name);        continue;
const result = this.db.prepare(query).get("employer", "employer", name);      }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      if (this.leadExists(company.name, company.website)) {
const result = this.db.prepare(query).get("employer", "employer", name);        this.log(`${company.name} already in leads - skipping`);
const result = this.db.prepare(query).get("employer", "employer", name);        continue;
const result = this.db.prepare(query).get("employer", "employer", name);      }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      const lead = {
const result = this.db.prepare(query).get("employer", "employer", name);        company_name: company.name,
const result = this.db.prepare(query).get("employer", "employer", name);        website: company.website,
const result = this.db.prepare(query).get("employer", "employer", name);        location: company.location,
const result = this.db.prepare(query).get("employer", "employer", name);        province: company.province,
const result = this.db.prepare(query).get("employer", "employer", name);        industry: company.industry,
const result = this.db.prepare(query).get("employer", "employer", name);        source: "manual_seed_mvp",
const result = this.db.prepare(query).get("employer", "employer", name);        confidence_score: 0.85
const result = this.db.prepare(query).get("employer", "employer", name);      };
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      lead.confidence_score = this.calculateConfidence(lead);
const result = this.db.prepare(query).get("employer", "employer", name);      this.leads_found++;
const result = this.db.prepare(query).get("employer", "employer", name);      this.saveLead(lead);
const result = this.db.prepare(query).get("employer", "employer", name);    }
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  generateReport() {
const result = this.db.prepare(query).get("employer", "employer", name);    const report = {
const result = this.db.prepare(query).get("employer", "employer", name);      timestamp: new Date().toISOString(),
const result = this.db.prepare(query).get("employer", "employer", name);      leads_discovered: this.leads_found,
const result = this.db.prepare(query).get("employer", "employer", name);      leads_saved: this.leads_saved,
const result = this.db.prepare(query).get("employer", "employer", name);      leads_skipped: this.leads_found - this.leads_saved,
const result = this.db.prepare(query).get("employer", "employer", name);      errors: this.errors.length,
const result = this.db.prepare(query).get("employer", "employer", name);      success_rate: this.leads_found > 0 ? ((this.leads_saved / this.leads_found) * 100).toFixed(1) : 0
const result = this.db.prepare(query).get("employer", "employer", name);    };
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);    console.log("\n========== SCOUT AGENT REPORT ==========");
const result = this.db.prepare(query).get("employer", "employer", name);    console.log(`Leads Discovered: ${report.leads_discovered}`);
const result = this.db.prepare(query).get("employer", "employer", name);    console.log(`Leads Saved: ${report.leads_saved}`);
const result = this.db.prepare(query).get("employer", "employer", name);    console.log(`Leads Skipped: ${report.leads_skipped}`);
const result = this.db.prepare(query).get("employer", "employer", name);    console.log(`Errors: ${report.errors}`);
const result = this.db.prepare(query).get("employer", "employer", name);    console.log(`Success Rate: ${report.success_rate}%`);
const result = this.db.prepare(query).get("employer", "employer", name);    console.log("========================================\n");
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);    return report;
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);  async run() {
const result = this.db.prepare(query).get("employer", "employer", name);    this.log("Starting Scout Agent MVP run...");
const result = this.db.prepare(query).get("employer", "employer", name);    const startTime = Date.now();
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);    try {
const result = this.db.prepare(query).get("employer", "employer", name);      this.seedPNGCompanies();
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      const runtime = ((Date.now() - startTime) / 1000).toFixed(2);
const result = this.db.prepare(query).get("employer", "employer", name);      this.log(`✅ Scout Agent completed in ${runtime}s`);
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);      return this.generateReport();
const result = this.db.prepare(query).get("employer", "employer", name);    } catch (err) {
const result = this.db.prepare(query).get("employer", "employer", name);      this.log(`Fatal error: ${err.message}`, "error");
const result = this.db.prepare(query).get("employer", "employer", name);      throw err;
const result = this.db.prepare(query).get("employer", "employer", name);    } finally {
const result = this.db.prepare(query).get("employer", "employer", name);      this.db.close();
const result = this.db.prepare(query).get("employer", "employer", name);    }
const result = this.db.prepare(query).get("employer", "employer", name);  }
const result = this.db.prepare(query).get("employer", "employer", name);}
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);// CLI execution
const result = this.db.prepare(query).get("employer", "employer", name);if (require.main === module) {
const result = this.db.prepare(query).get("employer", "employer", name);  const scout = new ScoutAgent();
const result = this.db.prepare(query).get("employer", "employer", name);  scout.run()
const result = this.db.prepare(query).get("employer", "employer", name);    .then(report => {
const result = this.db.prepare(query).get("employer", "employer", name);      console.log("\n📊 Final Report:", JSON.stringify(report, null, 2));
const result = this.db.prepare(query).get("employer", "employer", name);      process.exit(report.errors > 0 ? 1 : 0);
const result = this.db.prepare(query).get("employer", "employer", name);    })
const result = this.db.prepare(query).get("employer", "employer", name);    .catch(err => {
const result = this.db.prepare(query).get("employer", "employer", name);      console.error("❌ Scout Agent failed:", err);
const result = this.db.prepare(query).get("employer", "employer", name);      process.exit(1);
const result = this.db.prepare(query).get("employer", "employer", name);    });
const result = this.db.prepare(query).get("employer", "employer", name);}
const result = this.db.prepare(query).get("employer", "employer", name);
const result = this.db.prepare(query).get("employer", "employer", name);module.exports = ScoutAgent;
