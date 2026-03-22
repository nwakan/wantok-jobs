// Headhunter Agent - Job Sourcing Orchestrator
// Created: 2026-03-23
const Database = require("better-sqlite3");
const crypto = require("crypto");
const path = require("path");
const { execSync } = require("child_process");

class HeadhunterAgent {
  constructor() {
    this.db = new Database(path.join(__dirname, "../../server/data/wantokjobs.db"));
    this.stats = { saved: 0, errors: 0 };
  }

  log(msg, lvl) {
    if (!lvl) lvl = "info";
    var ico = lvl === "error" ? "❌" : lvl === "success" ? "✅" : "ℹ️";
    console.log("[" + new Date().toISOString() + "] " + ico + " " + msg);
  }

  hash(title, company, desc) {
    var t = title || "";
    var c = company || "";
    var d = desc || "";
    var txt = t.toLowerCase() + "|" + c.toLowerCase() + "|" + d.substring(0,500).toLowerCase();
    return crypto.createHash("md5").update(txt).digest("hex");
  }

  backfill() {
    this.log("Backfilling hashes...");
    var jobs = this.db.prepare("SELECT id,title,company_name,description FROM jobs WHERE content_hash IS NULL LIMIT 1000").all();
    if (jobs.length === 0) {
      this.log("No backfill needed");
      return;
    }
    var stmt = this.db.prepare("UPDATE jobs SET content_hash=? WHERE id=?");
    for (var i = 0; i < jobs.length; i++) {
      var j = jobs[i];
      stmt.run(this.hash(j.title, j.company_name, j.description), j.id);
    }
    this.log("Backfilled " + jobs.length + " hashes", "success");
  }

  scrape(script, source) {
    this.log("Running " + source + "...");
    try {
      var before = this.db.prepare("SELECT COUNT(*) as c FROM jobs").get().c;
      execSync("node " + script, {cwd: path.join(__dirname, "../../"), timeout: 120000, stdio: "pipe"});
      var after = this.db.prepare("SELECT COUNT(*) as c FROM jobs").get().c;
      var added = after - before;
      this.stats.saved += added;
      this.log(source + ": +" + added + " jobs", "success");
    } catch(e) {
      this.log(source + " failed: " + e.message, "error");
      this.stats.errors++;
    }
  }

  run() {
    this.log("Starting Headhunter...");
    this.backfill();
    var scrapers = [
      ["scripts/scrape-pngworkforce-new.js", "PNGWorkforce"],
      ["scripts/scrape-pacific-jobs.js", "PacificJobs"]
    ];
    for (var i = 0; i < scrapers.length; i++) {
      this.scrape(scrapers[i][0], scrapers[i][1]);
    }
    console.log("");
    console.log("=== HEADHUNTER REPORT ===");
    console.log("Jobs Saved: " + this.stats.saved);
    console.log("Errors: " + this.stats.errors);
    console.log("=========================");
    console.log("");
    this.db.close();
  }
}

if (require.main === module) {
  var agent = new HeadhunterAgent();
  agent.run();
}

module.exports = HeadhunterAgent;
