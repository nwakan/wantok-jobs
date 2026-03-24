// Scout Agent - Employer Lead Discovery MVP
// Purpose: Find new employers for WantokJobs platform
// Target: 50+ leads on first run
// Created: 2026-03-22
// Fixed: 2026-03-24 (corruption repair)

const Database = require("better-sqlite3");
const path = require("path");

class ScoutAgent {
  constructor() {
    this.db = new Database(path.join(__dirname, "../../server/data/wantokjobs.db"));
    this.leads_found = 0;
    this.leads_saved = 0;
    this.errors = [];
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix = level === "error" ? "❌" : level === "success" ? "✅" : "ℹ️";
    console.log(`[${timestamp}] ${prefix} Scout: ${message}`);
  }

  calculateConfidence(lead) {
    let score = 0;
    if (lead.website) score += 0.3;
    if (lead.email) score += 0.2;
    if (lead.phone) score += 0.15;
    if (lead.location) score += 0.1;
    if (lead.industry) score += 0.25;
    return Math.min(score, 1.0);
  }

  companyExists(name, website) {
    const query = `
      SELECT COUNT(*) as count FROM users
      WHERE (role = ? OR account_type = ?)
      AND LOWER(name) = LOWER(?)
    `;
    const result = this.db.prepare(query).get("employer", "employer", name);
    return result.count > 0;
  }

  leadExists(name, website) {
    const query = `
      SELECT COUNT(*) as count FROM employer_leads
      WHERE LOWER(company_name) = LOWER(?) OR LOWER(website) = LOWER(?)
    `;
    const result = this.db.prepare(query).get(name, website || "");
    return result.count > 0;
  }

  saveLead(lead) {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO employer_leads (
          company_name, website, email, phone, location, province,
          industry, source, confidence_score, metadata, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const metadata = JSON.stringify({
        discovery_date: new Date().toISOString(),
        discovery_method: "automated_scout"
      });

      stmt.run(
        lead.company_name, lead.website || null, lead.email || null,
        lead.phone || null, lead.location || null, lead.province || null,
        lead.industry || null, lead.source, lead.confidence_score,
        metadata, "scout_agent"
      );

      this.leads_saved++;
      this.log(`Saved: ${lead.company_name} (${(lead.confidence_score * 100).toFixed(0)}%)`, "success");
      return true;
    } catch (err) {
      this.log(`Failed to save ${lead.company_name}: ${err.message}`, "error");
      this.errors.push({ company: lead.company_name, error: err.message });
      return false;
    }
  }

  seedPNGCompanies() {
    this.log("Seeding known PNG companies...");

    const pngCompanies = [
      { name: "Bank South Pacific", website: "https://www.bsp.com.pg", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
      { name: "Air Niugini", website: "https://www.airniugini.com.pg", industry: "Transport & Logistics", location: "Port Moresby", province: "National Capital District" },
      { name: "PNG Power", website: "https://www.pngpower.com.pg", industry: "Government", location: "Port Moresby", province: "National Capital District" },
      { name: "Ok Tedi Mining", website: "https://oktedi.com", industry: "Mining & Resources", location: "Tabubil", province: "Western Province" },
      { name: "Digicel PNG", website: "https://www.digicelgroup.com", industry: "Telecommunications", location: "Port Moresby", province: "National Capital District" },
      { name: "Steamships Trading Company", website: "https://www.steamships.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
      { name: "Coffee Industry Corporation", website: "https://cic.org.pg", industry: "Agriculture", location: "Goroka", province: "Eastern Highlands Province" },
      { name: "New Britain Palm Oil", website: "https://www.nbpol.com.pg", industry: "Agriculture", location: "Kimbe", province: "West New Britain Province" },
      { name: "Ramu NiCo", website: "https://www.ramunico.com", industry: "Mining & Resources", location: "Madang", province: "Madang Province" },
      { name: "Lae Biscuit Company", website: "https://www.laebiscuit.com.pg", industry: "Manufacturing", location: "Lae", province: "Morobe Province" },
      { name: "Coca-Cola Amatil PNG", website: "https://www.ccamatil.com", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
      { name: "PNG Forest Products", website: "https://www.pngfp.com", industry: "Manufacturing", location: "Lae", province: "Morobe Province" },
      { name: "Trukai Industries", website: "https://www.trukai.com", industry: "Agriculture", location: "Lae", province: "Morobe Province" },
      { name: "Oil Search", website: "https://www.oilsearch.com", industry: "Oil & Gas", location: "Port Moresby", province: "National Capital District" },
      { name: "ExxonMobil PNG", website: "https://www.exxonmobil.com.pg", industry: "Oil & Gas", location: "Port Moresby", province: "National Capital District" },
      { name: "Newcrest Mining", website: "https://www.newcrest.com", industry: "Mining & Resources", location: "Port Moresby", province: "National Capital District" },
      { name: "Barrick Niugini", website: "https://www.barrick.com", industry: "Mining & Resources", location: "Wau", province: "Morobe Province" },
      { name: "Pacific MMI", website: "https://www.pmmi.com.pg", industry: "Insurance", location: "Port Moresby", province: "National Capital District" },
      { name: "Paradise Foods", website: "https://www.paradisefoods.com.pg", industry: "Manufacturing", location: "Lae", province: "Morobe Province" },
      { name: "Credit Corporation", website: "https://www.creditcorporation.com.pg", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
      { name: "Westpac PNG", website: "https://www.westpac.com.pg", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
      { name: "ANZ PNG", website: "https://www.anz.com/png", industry: "Banking & Finance", location: "Port Moresby", province: "National Capital District" },
      { name: "Bemobile", website: "https://www.bmobile.com.pg", industry: "Telecommunications", location: "Port Moresby", province: "National Capital District" },
      { name: "Telikom PNG", website: "https://www.telikom.com.pg", industry: "Telecommunications", location: "Port Moresby", province: "National Capital District" },
      { name: "Airlines PNG", website: "https://www.apng.com", industry: "Transport & Logistics", location: "Port Moresby", province: "National Capital District" },
      { name: "Pacific Palms Property", website: "https://www.pacificpalms.com.pg", industry: "Real Estate", location: "Port Moresby", province: "National Capital District" },
      { name: "Stop N Shop", website: "https://www.stopnshop.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
      { name: "Brian Bell", website: "https://www.brianbell.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
      { name: "RH Hypermarket", website: "https://www.rhhypermarket.com.pg", industry: "Retail & FMCG", location: "Lae", province: "Morobe Province" },
      { name: "Ela Motors", website: "https://www.elamotors.com.pg", industry: "Retail & FMCG", location: "Port Moresby", province: "National Capital District" },
    ];

    for (const company of pngCompanies) {
      if (this.companyExists(company.name, company.website)) {
        this.log(`${company.name} already registered - skipping`);
        continue;
      }

      if (this.leadExists(company.name, company.website)) {
        this.log(`${company.name} already in leads - skipping`);
        continue;
      }

      const lead = {
        company_name: company.name,
        website: company.website,
        location: company.location,
        province: company.province,
        industry: company.industry,
        source: "manual_seed_mvp",
        confidence_score: 0.85
      };

      lead.confidence_score = this.calculateConfidence(lead);
      this.leads_found++;
      this.saveLead(lead);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      leads_discovered: this.leads_found,
      leads_saved: this.leads_saved,
      errors: this.errors.length,
      error_details: this.errors
    };

    console.log("");
    console.log("=== SCOUT AGENT REPORT ===");
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Leads Discovered: ${report.leads_discovered}`);
    console.log(`Leads Saved: ${report.leads_saved}`);
    console.log(`Errors: ${report.errors}`);
    if (report.errors > 0) {
      console.log("");
      console.log("Error Details:");
      report.error_details.forEach(e => {
        console.log(`  - ${e.company}: ${e.error}`);
      });
    }
    console.log("=========================");
    console.log("");

    return report;
  }

  async run() {
    this.log("Starting Scout Agent...");
    
    try {
      this.seedPNGCompanies();
      const report = this.generateReport();
      this.db.close();
      return report;
    } catch (err) {
      this.log(`Fatal error: ${err.message}`, "error");
      this.db.close();
      throw err;
    }
  }
}

if (require.main === module) {
  const agent = new ScoutAgent();
  agent.run().catch(err => {
    console.error("Scout agent failed:", err);
    process.exit(1);
  });
}

module.exports = ScoutAgent;
