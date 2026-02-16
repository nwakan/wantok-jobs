const Database = require('./app/node_modules/better-sqlite3');
const db = new Database('./app/server/data/wantokjobs.db');

// All the scraped job data from pages 1-15
const jobPages = [
  // Page 1
  `Localisation Consultant (CPP4)|Job-ID:229950|Listed on 16-02-2026|Adventist Development and Relief Agency (ADRA) PNG|LAE, MO|https://www.pngjobseek.com/display-job/229950/Localisation-Consultant-(CPP4).html
3 x CIRCULATION SALES REPS (POM BASED)|Job-ID:229927|Listed on 16-02-2026|South Pacific Post (SPP) Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229927/3-x-CIRCULATION-SALES-REPS-(POM-BASED).html
COMPLETE AUTO SERVICES -LAE|Job-ID:229926|Listed on 16-02-2026|Datec|LAE, MO|https://www.pngjobseek.com/display-job/229926/COMPLETE-AUTO-SERVICES--LAE.html
Communications & Public Rlations (PR) Manager|Job-ID:229925|Listed on 16-02-2026|PNG Chamber of Resources and Energy|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229925/Communications-&-Public-Rlations-(PR)-Manager.html
Concrete Mixer Truck Driver|Job-ID:229915|Listed on 15-02-2026|Curtain Bros (CB) Group|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229915/Concrete-Mixer-Truck-Driver.html
Batch Plant Operator|Job-ID:229914|Listed on 15-02-2026|Curtain Bros (CB) Group|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229914/Batch-Plant-Operator.html
Prime Mover Drivers / Swinglift Operator (Port Moresby)|Job-ID:229841|Listed on 14-02-2026|Swift agencies PNG ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229841/Prime-Mover-Drivers---Swinglift-Operator-(Port-Moresby).html
Risk Analyst - Operational Risks|Job-ID:229827|Listed on 13-02-2026|TISA Bank Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229827/Risk-Analyst---Operational-Risks.html
1x Monitoring & Evaluation Supervisor – NCD, Port Moresby|Job-ID:229802|Listed on 13-02-2026|ROTARIAN AGAINST MALARIA|Section 53, Allotment 15 Unit 8 Tropicana Building, Ume Street, Gordons, Port Moresby, NCD|https://www.pngjobseek.com/display-job/229802/1x-Monitoring-&-Evaluation-Supervisor-–-NCD,-Port-Moresby.html
2 x Home Malaria Management Officer|Job-ID:229801|Listed on 13-02-2026|ROTARIAN AGAINST MALARIA|East New Britain & Oro Province|https://www.pngjobseek.com/display-job/229801/2-x-Home-Malaria-Management-Officer.html`,

  // Page 2
  `Manager Human Resources & Administration|Job-ID:229798|Listed on 13-02-2026|Head Hunters Recruitment|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229798/Manager-Human-Resources-&-Administration.html
CHIEF INVESTMENT OFFICER|Job-ID:229693|Listed on 13-02-2026|Head Hunters Recruitment|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229693/CHIEF-INVESTMENT-OFFICER.html
CHIEF EXECUTIVE OFFICER|Job-ID:229697|Listed on 13-02-2026|Head Hunters Recruitment|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229697/CHIEF-EXECUTIVE-OFFICER.html
Production Workers|Job-ID:229786|Listed on 13-02-2026|Papua Niugini Freezers (PNF)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229786/Production-Workers.html
MANAGER|Job-ID:229785|Listed on 13-02-2026|Vanguard International|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229785/MANAGER.html
AIR NIUGINI LTD_GENERAL MANAGER – BUSINESS TRANSFORMATION|Job-ID:229783|Listed on 13-02-2026|Vanguard International|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229783/AIR-NIUGINI-LTD_GENERAL-MANAGER-–-BUSINESS-TRANSFORMATION.html
BURSAR|Job-ID:229780|Listed on 13-02-2026|Port Moresby Business College|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229780/BURSAR.html
Project Civil Engineer|Job-ID:229777|Listed on 13-02-2026|Lihir Civil & Construction Ltd (LCC)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229777/Project-Civil-Engineer.html
SENIOR HUMAN RESOURCE OFFICER|Job-ID:229776|Listed on 13-02-2026|Head Hunters Recruitment|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229776/SENIOR-HUMAN-RESOURCE-OFFICER.html
Managing Director|Job-ID:229775|Listed on 13-02-2026|Kumul Petroleum Holdings Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229775/Managing-Director.html`,

  // Page 3
  `MANAGER – Facilities and Maintenance|Job-ID:229774|Listed on 13-02-2026|DREAM INN|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229774/MANAGER-–-Facilities-and-Maintenance.html
Various Vacancies|Job-ID:229744|Listed on 12-02-2026|Morobe Provincial Health Authority|Lae, MO|https://www.pngjobseek.com/display-job/229744/Various-Vacancies.html
2 x FINANCE ROLES|Job-ID:229689|Listed on 12-02-2026|ROTARIAN AGAINST MALARIA|Section 53, Allotment 15 Unit 8 Tropicana Building, Ume Street, Gordons, Port Moresby, NCD|https://www.pngjobseek.com/display-job/229689/2-x-FINANCE-ROLES.html
Sales Assistant – FMCG Products|Job-ID:229688|Listed on 12-02-2026|NextGen Soloutions|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229688/Sales-Assistant-–-FMCG-Products.html
Occupational Health & Safety Officer - PNF|Job-ID:229682|Listed on 12-02-2026|The BNG Trading Co. Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229682/Occupational-Health-&-Safety-Officer---PNF.html
Relationship Officer|Job-ID:229677|Listed on 12-02-2026|Nasfund Contributors Savings & Loans Society Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229677/Relationship-Officer.html
Production Workers - PNF|Job-ID:229673|Listed on 12-02-2026|The BNG Trading Co. Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229673/Production-Workers---PNF.html
Various Vacancies|Job-ID:229668|Listed on 11-02-2026|Office of The Public Solicitor|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229668/Various-Vacancies.html
Lands Officer|Job-ID:229632|Listed on 11-02-2026|Hargy Oil Palms Limited (HOPL)|Bialla, WNB|https://www.pngjobseek.com/display-job/229632/Lands-Officer.html
Senior Civil Design Engineer|Job-ID:229627|Listed on 11-02-2026|M&E Partnership (PNG) Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229627/Senior-Civil-Design-Engineer.html`,

  // Page 4
  `Electrical Engineer & Mechanical Engineer|Job-ID:229623|Listed on 11-02-2026|M&E Partnership (PNG) Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229623/Electrical-Engineer-&-Mechanical-Engineer.html
Associate Pastor|Job-ID:229618|Listed on 11-02-2026|Boroko Baptist Church|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229618/Associate-Pastor.html
Various Job Vacancies|Job-ID:229614|Listed on 11-02-2026|Norman Finance Limited|Port Moresby, Madang, Buka, NCD|https://www.pngjobseek.com/display-job/229614/Various-Job-Vacancies.html
Manager Accounts|Job-ID:229605|Listed on 11-02-2026|Comrade Trustee Services Limited (CTSL)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229605/Manager-Accounts.html
Regional Sales Manager|Job-ID:229591|Listed on 10-02-2026|Head Hunters Recruitment|Port Moresby & Lae, NCD|https://www.pngjobseek.com/display-job/229591/Regional-Sales-Manager.html
Supply Chain Planning Manager - Lae|Job-ID:229590|Listed on 10-02-2026|Head Hunters Recruitment|Lae, MO|https://www.pngjobseek.com/display-job/229590/Supply-Chain-Planning-Manager---Lae.html
Corporate Lawyer|Job-ID:229555|Listed on 10-02-2026|PNG Forest Products Ltd (PNGFPL)|Bulolo, MO|https://www.pngjobseek.com/display-job/229555/Corporate-Lawyer.html
Construction Project Coordinator|Job-ID:229554|Listed on 10-02-2026|PNG Forest Products Ltd (PNGFPL)|Bulolo, MO|https://www.pngjobseek.com/display-job/229554/Construction-Project-Coordinator.html
Finance and Accounting Manager|Job-ID:229550|Listed on 10-02-2026|Star Mountain Plaza Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229550/Finance-and-Accounting-Manager.html
Training & Development Officer|Job-ID:229548|Listed on 10-02-2026|CPL Group of Companies|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229548/Training-&-Development-Officer.html`,

  // Page 5
  `Human Services Manager|Job-ID:229544|Listed on 10-02-2026|Synergy Alliance Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229544/Human-Services-Manager.html
Travel Manager|Job-ID:229534|Listed on 10-02-2026|Northstar Travels and Events Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229534/Travel-Manager.html
Pharmacists|Job-ID:229530|Listed on 09-02-2026|CPL Group of Companies|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229530/Pharmacists.html
Head Chef|Job-ID:229526|Listed on 09-02-2026|Star Mountain Plaza Limited|Kikori, GU|https://www.pngjobseek.com/display-job/229526/Head-Chef.html
Branch Manager - Goroka|Job-ID:229485|Listed on 09-02-2026|BRIDGESTONE TYRES(P.N.G) PTY.LTD|Goroka, EH|https://www.pngjobseek.com/display-job/229485/Branch-Manager---Goroka.html
MIDDLE SCHOOL TEACHERS|Job-ID:229480|Listed on 09-02-2026|Hargy Oil Palms Limited (HOPL)|Kimbe, WNB|https://www.pngjobseek.com/display-job/229480/MIDDLE-SCHOOL-TEACHERS.html
Counter Salesman|Job-ID:229476|Listed on 09-02-2026|BRIDGESTONE TYRES(P.N.G) PTY.LTD|Kokopo, ENB|https://www.pngjobseek.com/display-job/229476/Counter-Salesman.html
Crane Operator|Job-ID:229473|Listed on 09-02-2026|Curtain Bros (CB) Group|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229473/Crane-Operator.html
Heavy Equipment Fitter|Job-ID:229470|Listed on 09-02-2026|Curtain Bros (CB) Group|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229470/Heavy-Equipment-Fitter.html
Program Director - Strongim Wok Long TVET|Job-ID:229440|Listed on 09-02-2026|Palladium PNG Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229440/Program-Director---Strongim-Wok-Long-TVET.html`,

  // Page 6
  `Heavy Diesel Mechanic|Job-ID:221769|Listed on 09-02-2026|Brian Bell Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/221769/Heavy-Diesel-Mechanic.html
Projects Director|Job-ID:229452|Listed on 09-02-2026|Marie Stopes Papua New Guinea|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229452/Projects-Director.html
Various Job Vacancies|Job-ID:229449|Listed on 09-02-2026|Vanguard International|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229449/Various-Job-Vacancies.html
HUMAN RESOURCES MANAGER|Job-ID:229444|Listed on 09-02-2026|PNG Institute of Medical Research (PNGIMR)|Goroka, EH|https://www.pngjobseek.com/display-job/229444/HUMAN-RESOURCES-MANAGER.html
CORPORATE SERVICES MANAGER|Job-ID:229420|Listed on 08-02-2026|Barlow Industries Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229420/CORPORATE-SERVICES-MANAGER.html
Key Accounts Supervisor|Job-ID:229409|Listed on 08-02-2026|Head Hunters Recruitment|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229409/Key-Accounts-Supervisor.html
5 x PRIME MOVER DRIVERS & SIDELIFTER OPERATOR|Job-ID:229282|Listed on 06-02-2026|Swift agencies PNG ltd|Lae City, MO|https://www.pngjobseek.com/display-job/229282/5-x-PRIME-MOVER-DRIVERS-&-SIDELIFTER-OPERATOR.html
Customs Compiler (Lae Branch)|Job-ID:229281|Listed on 06-02-2026|Swift agencies PNG ltd|Lae City, MO|https://www.pngjobseek.com/display-job/229281/Customs-Compiler-(Lae-Branch).html
Customs Broker (Lae Branch)|Job-ID:229278|Listed on 06-02-2026|Swift agencies PNG ltd|Lae City, MO|https://www.pngjobseek.com/display-job/229278/Customs-Broker-(Lae-Branch).html
TRAFFIC ENFORCEMENT OFFICERS (TEO)|Job-ID:229274|Listed on 06-02-2026|Road Traffic Authority (RTA)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229274/TRAFFIC-ENFORCEMENT-OFFICERS-(TEO).html`,

  // Page 7
  `Training/Riding Chief Engineer - Maritime|Job-ID:229272|Listed on 06-02-2026|P&O Maritime Logistics|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229272/Training-Riding-Chief-Engineer---Maritime.html
Marine Superintendent - Maritime|Job-ID:229271|Listed on 06-02-2026|P&O Maritime Logistics|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229271/Marine-Superintendent---Maritime.html
CHIEF LEGAL OFFICER AND GENERAL COUNSEL|Job-ID:229267|Listed on 06-02-2026|Kumul Petroleum Holdings Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229267/CHIEF-LEGAL-OFFICER-AND-GENERAL-COUNSEL.html
ASSISTANT COMPANY SECRETARY|Job-ID:229266|Listed on 06-02-2026|Kumul Petroleum Holdings Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229266/ASSISTANT-COMPANY-SECRETARY.html
COMPANY SECRETARY|Job-ID:229262|Listed on 06-02-2026|Kumul Petroleum Holdings Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229262/COMPANY-SECRETARY.html
Executive Opportunity (Re-advertisement)|Job-ID:229261|Listed on 06-02-2026|Vanguard International|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229261/Executive-Opportunity-(Re-advertisement).html
Administration & Recruitment Officer|Job-ID:229260|Listed on 06-02-2026|The BNG Trading Co. Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229260/Administration-&-Recruitment-Officer.html
Various Job Vacancies - NCDC|Job-ID:229257|Listed on 06-02-2026|People Connexion|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229257/Various-Job-Vacancies---NCDC.html
Various Trade roles|Job-ID:229245|Listed on 06-02-2026|Mayur Industries Ltd|Port Moresby|https://www.pngjobseek.com/display-job/229245/Various-Trade-roles.html
x2 STOREMAN DRIVER FOR LAE AND POM BRANCH|Job-ID:229150|Listed on 05-02-2026|Komatsu (UMW) Niugini Limited|Port Moresby, Lae, NCD|https://www.pngjobseek.com/display-job/229150/x2-STOREMAN-DRIVER-FOR-LAE-AND-POM-BRANCH.html`,

  // Page 8
  `Assistant Service Manager - Lae|Job-ID:221462|Listed on 05-02-2026|Brian Bell Ltd|Lae, MO|https://www.pngjobseek.com/display-job/221462/Assistant-Service-Manager---Lae.html
Assistant Service Manager - Port Moresby|Job-ID:221464|Listed on 05-02-2026|Brian Bell Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/221464/Assistant-Service-Manager---Port-Moresby.html
IT Support Officer (POM BASED)|Job-ID:229142|Listed on 05-02-2026|South Pacific Post (SPP) Limited|Konedobu, NCD|https://www.pngjobseek.com/display-job/229142/IT-Support-Officer-(POM-BASED).html
DEBT COLLECTOR|Job-ID:229138|Listed on 05-02-2026|South Pacific Post (SPP) Limited|Konedobu, NCD|https://www.pngjobseek.com/display-job/229138/DEBT-COLLECTOR.html
TEAM LEADER - LENDING|Job-ID:229123|Listed on 05-02-2026|Nasfund Contributors Savings & Loans Society Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229123/TEAM-LEADER---LENDING.html
UNDERWRITER|Job-ID:229062|Listed on 04-02-2026|Capital Insurance Group (CIG)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229062/UNDERWRITER.html
CLAIMS CONSULTANT, MEDICAL|Job-ID:229060|Listed on 04-02-2026|Capital Insurance Group (CIG)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229060/CLAIMS-CONSULTANT,-MEDICAL.html
INTERSHIP PROGRAMS|Job-ID:229054|Listed on 04-02-2026|Port Moresby Nature Park|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229054/INTERSHIP-PROGRAMS.html
7 x VACANT POSITION|Job-ID:229045|Listed on 04-02-2026|Brian Bell Ltd|LAE, MO|https://www.pngjobseek.com/display-job/229045/7-x-VACANT-POSITION.html
Electrical Instructor|Job-ID:229025|Listed on 04-02-2026|Don Bosco Simbu Technical College||https://www.pngjobseek.com/display-job/229025/Electrical-Instructor.html`,

  // Page 9
  `CHIEF EXECUTIVE OFFICER - KOKOPO CITY AUTHORITY EXECUTIVE LEVEL 4|Job-ID:229024|Listed on 04-02-2026|Department of Personnel Management (DPM)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229024/CHIEF-EXECUTIVE-OFFICER---KOKOPO-CITY-AUTHORITY--EXECUTIVE-LEVEL-4.html
Data Analyst|Job-ID:229016|Listed on 04-02-2026|Nasfund Contributors Savings & Loans Society Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229016/Data-Analyst.html
Various Job Vacancies|Job-ID:229012|Listed on 04-02-2026|Nazarene Health Ministries Inc|Kunjip, Jiwaka, WHP|https://www.pngjobseek.com/display-job/229012/Various-Job-Vacancies.html
Security Supervisor|Job-ID:226115|Listed on 04-02-2026|Brian Bell Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/226115/Security-Supervisor.html
ATM SUPPORT ENGINEER|Job-ID:229008|Listed on 04-02-2026|TISA Bank Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229008/ATM-SUPPORT-ENGINEER.html
Plumber|Job-ID:229003|Listed on 03-02-2026|Brian Bell Ltd|Lae, MO|https://www.pngjobseek.com/display-job/229003/Plumber.html
Senior Investigators|Job-ID:229002|Listed on 03-02-2026|Independent Commission Against Corruption (ICAC)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229002/Senior-Investigators.html
Team Leader - Investigation|Job-ID:229001|Listed on 03-02-2026|Independent Commission Against Corruption (ICAC)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229001/Team-Leader---Investigation.html
Investigators|Job-ID:229000|Listed on 03-02-2026|Independent Commission Against Corruption (ICAC)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/229000/Investigators.html
PHARMACIST|Job-ID:228978|Listed on 03-02-2026|NUIGINI ISLANDS PHARMACEUTICAL WHOLESALERS|Rabaul, ENB|https://www.pngjobseek.com/display-job/228978/PHARMACIST.html`,

  // Page 10
  `Hino Crane Truck Operator / Driver|Job-ID:228977|Listed on 03-02-2026|Bishop Brothers Engineering Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228977/Hino-Crane-Truck-Operator---Driver.html
VARIOUS JOB OPPORTUNITIES|Job-ID:228975|Listed on 03-02-2026|CPL Group of Companies|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228975/VARIOUS-JOB-OPPORTUNITIES.html
Accountant|Job-ID:228957|Listed on 03-02-2026|Ashton Brunswick Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228957/Accountant.html
Property Management – Admin Assistant|Job-ID:228948|Listed on 03-02-2026|Ashton Brunswick Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228948/Property-Management-–-Admin-Assistant.html
Operations Coordinator|Job-ID:218839|Listed on 03-02-2026|CTS Logistics (PNG) Limited|Lae, MO|https://www.pngjobseek.com/display-job/218839/Operations-Coordinator.html
COMPLIANCE MANAGER|Job-ID:228942|Listed on 02-02-2026|Capital Insurance Group (CIG)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228942/COMPLIANCE-MANAGER.html
CHIEF EXECUTIVE OFFICER – EXECUTIVE LEVEL 3|Job-ID:228918|Listed on 02-02-2026|Department of Personnel Management (DPM)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228918/CHIEF-EXECUTIVE-OFFICER-–-EXECUTIVE-LEVEL-3.html
Administration Assistant|Job-ID:228887|Listed on 02-02-2026|CPL Group of Companies|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228887/Administration-Assistant.html
Manager - Foreign Exchange & Treasury|Job-ID:228884|Listed on 02-02-2026|First Investment Finance Limited (FIFL)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228884/Manager---Foreign-Exchange-&-Treasury.html
PROJECT ACCOUNTANT|Job-ID:228878|Listed on 01-02-2026|Grand Columbia Limited|Port Moresby, NCD, NCD|https://www.pngjobseek.com/display-job/228878/PROJECT-ACCOUNTANT.html`,

  // Page 11
  `EXECUTIVE MANAGER – Training, Research & Innovation|Job-ID:228876|Listed on 01-02-2026|NiuSky Pacific Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228876/EXECUTIVE-MANAGER-–-Training,-Research-&-Innovation.html
Maintenance Jobs|Job-ID:228848|Listed on 01-02-2026|Port Moresby Nature Park|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228848/Maintenance-Jobs.html
People & Culture Specialist|Job-ID:228772|Listed on 30-01-2026|DT Global|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228772/People-&-Culture-Specialist.html
Senior Coordinator People and Culture|Job-ID:228754|Listed on 30-01-2026|DT Global||https://www.pngjobseek.com/display-job/228754/Senior-Coordinator-People-and-Culture.html
Various Job Vacancies - Simbu Provincial Health Authority|Job-ID:228746|Listed on 30-01-2026|Simbu Provincial Health Authority|Kundiawa, SI|https://www.pngjobseek.com/display-job/228746/Various-Job-Vacancies---Simbu-Provincial-Health-Authority.html
Tradesman Fitter Technician|Job-ID:228745|Listed on 30-01-2026|Colgate - Palmolive (PNG) Ltd|Lae, MO|https://www.pngjobseek.com/display-job/228745/Tradesman-Fitter-Technician.html
TRUCK DRIVERS - KUTUBU TRANSPORT, LAE|Job-ID:228742|Listed on 30-01-2026|Kutubu Transport, LAE|LAE, MO|https://www.pngjobseek.com/display-job/228742/TRUCK-DRIVERS---KUTUBU-TRANSPORT,-LAE.html
Various Job Vacancies - Teaching Services Commission|Job-ID:228739|Listed on 30-01-2026|Teaching Service Commission|Port Moresby, SHP, Enga, Hela, Madang, WSP, WNBP,ENBP, NIP, Manus, AROB, NCD|https://www.pngjobseek.com/display-job/228739/Various-Job-Vacancies---Teaching-Services-Commission.html
Corporate Sales Representative - Tari, Hela Province|Job-ID:228733|Listed on 30-01-2026|CPL Group of Companies|Tari, HE|https://www.pngjobseek.com/display-job/228733/Corporate-Sales-Representative---Tari,-Hela-Province.html
Corporate Sales Representative - Wabag, Enga Province|Job-ID:228732|Listed on 30-01-2026|CPL Group of Companies|Wabag, EN|https://www.pngjobseek.com/display-job/228732/Corporate-Sales-Representative---Wabag,-Enga-Province.html`,

  // Page 12
  `Corporate Sales Representative - Mendi, Southern Highlands|Job-ID:228726|Listed on 29-01-2026|CPL Group of Companies|Mendi, SH|https://www.pngjobseek.com/display-job/228726/Corporate-Sales-Representative---Mendi,-Southern-Highlands.html
FINAL SHORTLIST: NCD, CENTRAL & GULF PROVINCES|Job-ID:228696|Listed on 29-01-2026|RPNGC National Centre of Excellence – Bomana|Bomana, NCD|https://www.pngjobseek.com/display-job/228696/FINAL-SHORTLIST--NCD,-CENTRAL-&-GULF-PROVINCES.html
Senior Group Accountant|Job-ID:228695|Listed on 29-01-2026|Protocal Group|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228695/Senior-Group-Accountant.html
ACCOUNTANT - RIBITO HOTEL|Job-ID:228663|Listed on 29-01-2026|Kurai Group of Companies Ltd|Wabag, Enga Province, EN|https://www.pngjobseek.com/display-job/228663/ACCOUNTANT---RIBITO-HOTEL.html
Various Job Vacancies - GLOBAL CONSTRUCTIONS LTD|Job-ID:228659|Listed on 29-01-2026|Global Constructions Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228659/Various-Job-Vacancies---GLOBAL-CONSTRUCTIONS-LTD.html
VARIOUS VACANCIES|Job-ID:228656|Listed on 29-01-2026|Curtain Bros (CB) Group|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228656/VARIOUS-VACANCIES.html
QUALITY ASSURANCE OFFICER|Job-ID:228629|Listed on 28-01-2026|TISA Bank Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228629/QUALITY-ASSURANCE-OFFICER.html
Finance and Admin Manager|Job-ID:228616|Listed on 28-01-2026|Traisa Transport Ltd|Lae, MO|https://www.pngjobseek.com/display-job/228616/Finance-and-Admin-Manager.html
LAB TECHNICIAN - POMIS|Job-ID:228594|Listed on 28-01-2026|Port Moresby International School (POMIS)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228594/LAB-TECHNICIAN---POMIS.html
Customer Service Consultant, Kimbe Branch|Job-ID:228593|Listed on 27-01-2026|Nasfund Contributors Savings & Loans Society Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228593/Customer-Service-Consultant,-Kimbe-Branch.html`,

  // Page 13
  `Various Job Vacancies - Dept. Magisterial Services|Job-ID:228592|Listed on 27-01-2026|Magisterial Services PNG|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228592/Various-Job-Vacancies---Dept.-Magisterial-Services.html
ADMINISTRATION MANAGER (PHYSICAL SECURITY)|Job-ID:228574|Listed on 27-01-2026|TISA Bank Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228574/ADMINISTRATION-MANAGER-(PHYSICAL-SECURITY).html
Associate Director of Operations - FHI - 360|Job-ID:228570|Listed on 27-01-2026|FHI 360|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228570/Associate-Director-of-Operations---FHI---360.html
Business Development Manager|Job-ID:228557|Listed on 26-01-2026|Brian Bell Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228557/Business-Development-Manager.html
SENIOR LEGAL OFFICER (COMMERCIAL & BANKING)|Job-ID:228544|Listed on 26-01-2026|TISA Bank Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228544/SENIOR-LEGAL-OFFICER-(COMMERCIAL-&-BANKING).html
SENIOR LEGAL OFFICER (LITIGATION)|Job-ID:228534|Listed on 26-01-2026|TISA Bank Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228534/SENIOR-LEGAL-OFFICER-(LITIGATION).html
GENERAL MANAGER – HUMAN RESOURCES|Job-ID:228531|Listed on 26-01-2026|Kumul Petroleum Holdings Limited|Port Moresby|https://www.pngjobseek.com/display-job/228531/GENERAL-MANAGER-–-HUMAN-RESOURCES.html
Expression Of Interest|Job-ID:228467|Listed on 23-01-2026|Seladi - 85 Architecture| NCD|https://www.pngjobseek.com/display-job/228467/Expression-Of-Interest.html
Various Job Vacancies - NBC|Job-ID:228461|Listed on 23-01-2026|National Broadcasting Corporation (NBC)|Port Moresby, Kundiawa, Goroka, Buka, Lae, Madang, Vanimo|https://www.pngjobseek.com/display-job/228461/Various-Job-Vacancies---NBC.html
Director|Job-ID:228440|Listed on 23-01-2026|Kumul Consolidated Holdings (KCH)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228440/Director.html`,

  // Page 14
  `Assistant Draftsman|Job-ID:228401|Listed on 22-01-2026|CPL Group of Companies|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228401/Assistant-Draftsman.html
Hotel Manager - Kikori (Gulf Province)|Job-ID:228398|Listed on 22-01-2026|Star Mountain Plaza Limited|Kikori, GU|https://www.pngjobseek.com/display-job/228398/Hotel-Manager---Kikori-(Gulf-Province).html
SHEQ Manager|Job-ID:228394|Listed on 22-01-2026|Traisa Transport Ltd|Lae, MO|https://www.pngjobseek.com/display-job/228394/SHEQ-Manager.html
Account Manager|Job-ID:228374|Listed on 22-01-2026|Remington Group|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228374/Account-Manager.html
Solar Technician|Job-ID:228367|Listed on 21-01-2026|Brian Bell Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228367/Solar-Technician.html
Senior HR Officer|Job-ID:228317|Listed on 21-01-2026|Barlow Industries Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228317/Senior-HR-Officer.html
Gas Agent Officer|Job-ID:228307|Listed on 21-01-2026|BOC PNG Ltd|LAE, MO|https://www.pngjobseek.com/display-job/228307/Gas-Agent-Officer.html
Various Job Vacancies - NGCB|Job-ID:228303|Listed on 21-01-2026|Vanguard International|LAE, MO|https://www.pngjobseek.com/display-job/228303/Various-Job-Vacancies---NGCB.html
Admin Driver - Prouds DFS|Job-ID:228189|Listed on 20-01-2026|CPL Group of Companies|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228189/Admin-Driver---Prouds-DFS.html
LEARNING & DEVELOPMENT CORDINATOR|Job-ID:228142|Listed on 19-01-2026|National Airports Corporation (NAC)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228142/LEARNING-&-DEVELOPMENT-CORDINATOR.html`,

  // Page 15
  `Team Leader - Human Resources|Job-ID:228140|Listed on 19-01-2026|Handy Finance Group||https://www.pngjobseek.com/display-job/228140/Team-Leader---Human-Resources.html
Account Payable (x1) – Port Moresby (HQ)|Job-ID:228130|Listed on 19-01-2026|Norman Finance Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228130/Account-Payable-(x1)-–-Port-Moresby-(HQ).html
Purchasing Support/Clerk|Job-ID:228133|Listed on 19-01-2026|Bishop Brothers Engineering Ltd|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228133/Purchasing-Support-Clerk.html
Loans Development Officer|Job-ID:228137|Listed on 19-01-2026|Haraga Loans!||https://www.pngjobseek.com/display-job/228137/Loans-Development-Officer.html
3 x VACANT POSITIONS|Job-ID:228129|Listed on 19-01-2026|Airways Residences Limited|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228129/3-x-VACANT-POSITIONS.html
CORPORATE COMMUNICATIONS MANAGER - PNG Ports|Job-ID:228122|Listed on 19-01-2026|Vanguard International|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228122/CORPORATE-COMMUNICATIONS-MANAGER---PNG-Ports.html
MANAGING DIRECTOR|Job-ID:228120|Listed on 19-01-2026|Climate Change & Development Authority (CCDA)|Port Moresby, NCD|https://www.pngjobseek.com/display-job/228120/MANAGING-DIRECTOR.html`
];

console.log('Parsing job data...');

const jobs = [];
jobPages.forEach(pageData => {
  const lines = pageData.trim().split('\n');
  lines.forEach(line => {
    const parts = line.split('|');
    if (parts.length >= 5) {
      const title = parts[0];
      const jobId = parts[1].replace('Job-ID:', '');
      const company = parts[3];
      const location = parts[4];
      const url = parts[5];
      
      jobs.push({
        title,
        jobId,
        company,
        location,
        url
      });
    }
  });
});

console.log(`Parsed ${jobs.length} jobs from PNGJobSeek`);

// Check for existing jobs in database
const checkDuplicate = db.prepare('SELECT id FROM jobs WHERE title = ? AND company_name = ? AND source = ?');
const insertJob = db.prepare(`
  INSERT INTO jobs (
    employer_id, title, description, company_name, location, country,
    job_type, experience_level, external_url, source, status,
    application_method, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

let inserted = 0;
let duplicates = 0;

jobs.forEach(job => {
  const existing = checkDuplicate.get(job.title, job.company, 'pngjobseek');
  
  if (existing) {
    duplicates++;
    return;
  }
  
  try {
    insertJob.run(
      1, // employer_id (default)
      job.title,
      `Job listing from ${job.company}. For full details, please visit the application link.`,
      job.company,
      job.location || 'Papua New Guinea',
      'Papua New Guinea',
      'full-time', // default
      'Mid Level', // default
      job.url,
      'pngjobseek',
      'active',
      'external'
    );
    inserted++;
  } catch (error) {
    console.error(`Error inserting job ${job.title}:`, error.message);
  }
});

console.log(`\nPNGJobSeek scrape complete:`);
console.log(`- New jobs inserted: ${inserted}`);
console.log(`- Duplicates skipped: ${duplicates}`);
console.log(`- Total jobs parsed: ${jobs.length}`);

db.close();
