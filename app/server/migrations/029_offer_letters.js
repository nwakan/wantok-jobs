const db = require("../database");

function up() {
  console.log("Creating offers table...");
  
  db.prepare().run();
  
  // Indexes
  db.prepare("CREATE INDEX IF NOT EXISTS idx_offers_application ON offers(application_id)").run();
  db.prepare("CREATE INDEX IF NOT EXISTS idx_offers_employer ON offers(employer_id)").run();
  db.prepare("CREATE INDEX IF NOT EXISTS idx_offers_jobseeker ON offers(jobseeker_id)").run();
  db.prepare("CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status)").run();
  
  console.log("✅ Offers table created successfully");
}

function down() {
  db.prepare("DROP TABLE IF EXISTS offers").run();
  console.log("✅ Offers table dropped");
}

module.exports = { up, down };
