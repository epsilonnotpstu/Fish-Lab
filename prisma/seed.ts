/**
 * Seeds the database with a complete fisheries-lab demo and the first super
 * admin. Content is only inserted into an empty database; run with
 * `--reset` to wipe content (not users) and re-seed.
 *
 *   npm run db:seed            # first-time setup
 *   npm run db:seed -- --reset # wipe demo content and seed again
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
const face = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&h=600&q=80&auto=format&fit=crop&crop=faces`;

const IMG = {
  diver: img("1544551763-46a013bb70d5"),
  wave: img("1559827260-dc66d52bef19"),
  labTeam: img("1581093450021-4a7360e9a6b5"),
  reefFish: img("1582967788606-a171c1080cb0"),
  reefLight: img("1583212292454-1fe6229603b7"),
  coral: img("1546026423-cc4642628d2b"),
  goldfish: img("1522069169874-c58ec4b76be5"),
  tang: img("1504472478235-9bc48ba4d60f"),
  cells: img("1576086213369-97a306d36557"),
  glassware: img("1532094349884-543bc11b234d"),
  labCorridor: img("1579154204601-01588f351e67"),
  pipette: img("1614935151651-0bea6508db6b"),
  scientist: img("1581595219315-a187dd40c322"),
  turtle: img("1437622368342-7a3d73a34c8f"),
  clownfish: img("1535591273668-578e31182c4f"),
  whale: img("1518877593221-1f28583780b4"),
  pinkFish: img("1524704654690-b56c05c78a00"),
  beach: img("1505142468610-359e7d316be0"),
  underwater: img("1551244072-5d12893278ab"),
  teamHands: img("1583321500900-82807e458f3c"),
  sea: img("1500375592092-40eb2168fd21"),
};

async function wipeContent() {
  await db.$transaction([
    db.galleryImage.deleteMany(),
    db.galleryAlbum.deleteMany(),
    db.newsPost.deleteMany(),
    db.newsCategory.deleteMany(),
    db.publication.deleteMany(),
    db.project.deleteMany(),
    db.equipment.deleteMany(),
    db.member.deleteMany(),
    db.memberCategory.deleteMany(),
    db.researchArea.deleteMany(),
    db.event.deleteMany(),
    db.opportunity.deleteMany(),
    db.partner.deleteMany(),
    db.page.deleteMany(),
    db.homeSection.deleteMany(),
    db.navItem.deleteMany(),
    db.siteSettings.deleteMany(),
  ]);
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.SEED_ADMIN_PASSWORD || "";
  if (!email || !password) {
    console.warn("! SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin user.");
    return;
  }
  if (await db.user.findUnique({ where: { email } })) {
    console.log(`• Admin ${email} already exists`);
    return;
  }
  await db.user.create({
    data: {
      email,
      name: process.env.SEED_ADMIN_NAME || "Site Administrator",
      role: "SUPER_ADMIN",
      passwordHash: await bcrypt.hash(password, 12),
      mustChangePassword: true,
    },
  });
  console.log(`✓ Created super admin ${email} (password change required on first login)`);
}

async function seedContent() {
  await db.siteSettings.create({
    data: {
      id: 1,
      labName: "Aquatic Bioscience & Fisheries Laboratory",
      shortName: "ABFL",
      tagline: "Understanding aquatic life to feed the future sustainably.",
      description:
        "We study the biology, health and ecology of fish and aquatic ecosystems, and translate that knowledge into sustainable aquaculture and fisheries management.",
      faculty: "Faculty of Fisheries",
      department: "Department of Aquaculture & Aquatic Resources",
      university: "University of Marine Science",
      universityUrl: "https://example.edu",
      foundedYear: 2008,
      primaryColor: "#0b3b5c",
      accentColor: "#14b8a6",
      headingFont: "Plus Jakarta Sans",
      bodyFont: "Inter",
      email: "contact@abfl.example.edu",
      phone: "+1 (555) 010-7070",
      fax: "+1 (555) 010-7071",
      officeHours: "Mon–Fri, 9:00–17:00",
      address: "Building 4, Room 402\nFaculty of Fisheries, University of Marine Science\n1-1 Harbor Road, Coast City 441-8580",
      mapEmbedUrl: "https://www.google.com/maps?q=Tokyo+University+of+Marine+Science+and+Technology&output=embed",
      accessInfo:
        "<h3>By train and bus</h3><p>From Central Station take bus line 12 bound for <strong>University Marine Campus</strong> (approx. 25 minutes) and get off at the Faculty of Fisheries stop. The laboratory is in Building 4, fourth floor.</p><h3>By car</h3><p>About 20 minutes from the Coastal Expressway (Harbor exit). Visitor parking is available at the east gate — please register at the security office.</p>",
      socials: [
        { platform: "twitter", url: "https://x.com" },
        { platform: "linkedin", url: "https://linkedin.com" },
        { platform: "youtube", url: "https://youtube.com" },
        { platform: "researchgate", url: "https://researchgate.net" },
      ],
      footerAbout:
        "A research laboratory of the Faculty of Fisheries advancing sustainable aquaculture, fish health and aquatic ecosystem science.",
      footerLinks: [
        { label: "University", url: "https://example.edu" },
        { label: "Faculty of Fisheries", url: "https://example.edu/fisheries" },
        { label: "Graduate Admissions", url: "https://example.edu/admissions" },
        { label: "Library", url: "https://example.edu/library" },
      ],
      seoTitle: "Aquatic Bioscience & Fisheries Laboratory",
      seoDescription:
        "Research laboratory in the Faculty of Fisheries working on sustainable aquaculture, fish nutrition, fish health and aquatic ecology.",
      seoKeywords: "fisheries, aquaculture, fish nutrition, fish disease, aquatic ecology, marine science",
      announcementEnabled: true,
      announcementText: "Now accepting applications for PhD and Master's students — April 2027 intake",
      announcementUrl: "/join-us",
      contactIntro:
        "Interested in visiting the lab, joining as a student, or collaborating with us? Send us a message — we usually reply within three working days.",
      inquiryTypes: ["Lab visit", "Prospective student", "Research collaboration", "Media inquiry", "Other"],
    },
  });

  const nav = [
    ["Home", "/"],
    ["Research", "/research"],
    ["Members", "/members"],
    ["Publications", "/publications"],
    ["News", "/news"],
    ["Contact", "/contact"],
  ];
  for (const [i, [label, href]] of nav.entries()) {
    await db.navItem.create({ data: { label, href, order: i } });
  }
  const more = await db.navItem.create({ data: { label: "More", href: "#", order: nav.length } });
  const sub = [
    ["Projects", "/projects"],
    ["Events", "/events"],
    ["Gallery", "/gallery"],
    ["Join Us", "/join-us"],
    ["Facilities", "/p/facilities"],
  ];
  for (const [i, [label, href]] of sub.entries()) {
    await db.navItem.create({ data: { label, href, order: i, parentId: more.id } });
  }

  // Research areas
  const areas = [
    {
      slug: "aquaculture-systems",
      title: "Aquaculture Systems",
      subtitle: "Recirculating & integrated farming",
      icon: "Waves",
      coverImage: IMG.tang,
      summary:
        "Designing efficient recirculating aquaculture systems (RAS) and integrated multi-trophic farms that raise more fish with less water, energy and waste.",
    },
    {
      slug: "fish-nutrition",
      title: "Fish Nutrition & Feed",
      subtitle: "Sustainable feeds for farmed fish",
      icon: "Wheat",
      coverImage: IMG.goldfish,
      summary:
        "Replacing fishmeal with insect, algal and plant proteins while maintaining growth, health and fillet quality of farmed species.",
    },
    {
      slug: "fish-health",
      title: "Fish Health & Disease",
      subtitle: "Immunology and pathogen control",
      icon: "ShieldPlus",
      coverImage: IMG.scientist,
      summary:
        "Understanding fish immune responses and developing vaccines, probiotics and rapid diagnostics against bacterial and viral diseases.",
    },
    {
      slug: "aquatic-ecology",
      title: "Aquatic Ecology & Conservation",
      subtitle: "Healthy ecosystems, healthy fisheries",
      icon: "Leaf",
      coverImage: IMG.turtle,
      summary:
        "Monitoring fish populations and habitats with eDNA, acoustic telemetry and field surveys to inform conservation and stock management.",
    },
    {
      slug: "fisheries-biotechnology",
      title: "Fisheries Biotechnology",
      subtitle: "Genomics for selective breeding",
      icon: "Dna",
      coverImage: IMG.pipette,
      summary:
        "Applying genomics, transcriptomics and marker-assisted selection to breed faster-growing, disease-resistant aquaculture strains.",
    },
    {
      slug: "seafood-quality",
      title: "Post-harvest & Seafood Quality",
      subtitle: "From catch to consumer",
      icon: "FlaskConical",
      coverImage: IMG.glassware,
      summary:
        "Improving freshness, safety and shelf-life of seafood through novel processing, cold-chain monitoring and quality biomarkers.",
    },
  ];
  const areaRows: { id: string }[] = [];
  for (const [i, a] of areas.entries()) {
    areaRows.push(
      await db.researchArea.create({
        data: {
          ...a,
          order: i,
          body: `<p>${a.summary}</p><h2>Research questions</h2><ul><li>Which mechanisms drive performance and welfare in this area?</li><li>How can new methods be scaled to commercial farms and fisheries?</li><li>What are the environmental and economic trade-offs?</li></ul><h2>Approach</h2><p>We combine controlled tank experiments in our wet-lab facility with field sampling, molecular analyses and data science. Students work closely with industry partners and government fisheries agencies so that results reach practice.</p><blockquote>Our goal is science that makes aquatic food systems more productive, resilient and fair.</blockquote>`,
          gallery: [IMG.underwater, IMG.reefLight, IMG.labCorridor],
        },
      }),
    );
  }

  // Equipment
  const equipment = [
    { name: "Recirculating Aquaculture Facility", description: "24 independent 500 L tanks with automated temperature, oxygen and pH control for growth and feeding trials.", image: IMG.tang, areas: [0, 1] },
    { name: "Real-time PCR & Sequencing Lab", description: "qPCR systems and a benchtop sequencer for pathogen detection, eDNA and gene-expression studies.", image: IMG.pipette, areas: [2, 3, 4] },
    { name: "Fish Histopathology Suite", description: "Microtome, automated stainer and fluorescence microscope for tissue and immunology analyses.", image: IMG.cells, areas: [2] },
    { name: "Research Vessel Access", description: "Shared access to the faculty's 18 m coastal research vessel for trawl, plankton and acoustic surveys.", image: IMG.sea, areas: [3] },
    { name: "Food Analysis Laboratory", description: "Texture analyser, colorimeter and GC-MS for seafood freshness and quality assessment.", image: IMG.glassware, areas: [5] },
  ];
  for (const [i, e] of equipment.entries()) {
    await db.equipment.create({
      data: {
        name: e.name,
        description: e.description,
        image: e.image,
        order: i,
        researchAreas: { connect: e.areas.map((x) => ({ id: areaRows[x].id })) },
      },
    });
  }

  // Member groups & members
  const groups = [
    ["Faculty", "faculty"],
    ["Postdoctoral Researchers", "postdocs"],
    ["PhD Students", "phd"],
    ["Master's Students", "masters"],
    ["Undergraduate Students", "undergraduates"],
    ["Collaborators", "collaborators"],
  ];
  const groupRows: Record<string, string> = {};
  for (const [i, [name, slug]] of groups.entries()) {
    groupRows[slug] = (await db.memberCategory.create({ data: { name, slug, order: i } })).id;
  }

  const links = (name: string) => [
    { label: "Google Scholar", url: "https://scholar.google.com" },
    { label: "ORCID", url: "https://orcid.org" },
    { label: "ResearchGate", url: `https://researchgate.net/profile/${name.replace(/\s+/g, "-")}` },
  ];

  const members = [
    { name: "Prof. Daniel Hartmann", position: "Professor & Principal Investigator", group: "faculty", photo: face("1472099645785-5658abf4ff4e"), areas: [0, 1], email: "hartmann@abfl.example.edu",
      bio: "<p>Daniel Hartmann leads the laboratory. His research focuses on sustainable aquaculture systems and alternative feeds. He has published more than 120 peer-reviewed papers and advises national agencies on aquaculture policy.</p>",
      interests: "Recirculating aquaculture, alternative proteins, fish welfare", education: "PhD in Aquaculture, University of Stirling (2004)\nMSc in Fisheries Science (2000)" },
    { name: "Assoc. Prof. Mei Tanaka", position: "Associate Professor", group: "faculty", photo: face("1573496359142-b8d87734a5a2"), areas: [2, 4], email: "tanaka@abfl.example.edu",
      bio: "<p>Mei Tanaka studies fish immunology and genomics, developing vaccines and disease-resistant breeding lines for major farmed species.</p>",
      interests: "Fish immunology, vaccine development, genomic selection", education: "PhD in Marine Biotechnology (2011)" },
    { name: "Dr. Samuel Okafor", position: "Assistant Professor", group: "faculty", photo: face("1560250097-0b93528c311a"), areas: [3], email: "okafor@abfl.example.edu",
      bio: "<p>Samuel Okafor is an aquatic ecologist working on eDNA monitoring and the conservation of freshwater and coastal fish populations.</p>",
      interests: "eDNA, population ecology, fisheries management", education: "PhD in Aquatic Ecology (2015)" },
    { name: "Dr. Elena Rossi", position: "JSPS Postdoctoral Fellow", group: "postdocs", photo: face("1531123897727-8f129e1688ce"), areas: [5] ,
      bio: "<p>Elena works on non-destructive freshness sensing for seafood supply chains.</p>", interests: "Seafood quality, spectroscopy" },
    { name: "Arif Rahman", position: "PhD Candidate (D3)", group: "phd", photo: face("1507003211169-0a1dd7228f2d"), areas: [1],
      bio: "<p>Arif investigates black soldier fly larvae meal as a fishmeal replacement for tilapia.</p>", interests: "Insect protein, tilapia nutrition" },
    { name: "Sofia Martins", position: "PhD Candidate (D2)", group: "phd", photo: face("1494790108377-be9c29b29330"), areas: [2],
      bio: "<p>Sofia studies probiotics that protect shrimp against vibriosis.</p>", interests: "Probiotics, shrimp health" },
    { name: "Kenji Watanabe", position: "PhD Candidate (D1)", group: "phd", photo: face("1500648767791-00dcc994a43e"), areas: [4],
      bio: "<p>Kenji uses genome-wide association studies to find growth-related genes in yellowtail.</p>", interests: "Genomics, selective breeding" },
    { name: "Hannah Clarke", position: "Master's Student (M2)", group: "masters", photo: face("1438761681033-6461ffad8d80"), areas: [3], bio: "", interests: "Estuarine fish communities" },
    { name: "Nadia Hossain", position: "Master's Student (M2)", group: "masters", photo: face("1544005313-94ddf0286df2"), areas: [0], bio: "", interests: "Aquaponics, water quality" },
    { name: "Lucas Moreau", position: "Master's Student (M1)", group: "masters", photo: face("1506794778202-cad84cf45f1d"), areas: [5], bio: "", interests: "Cold-chain monitoring" },
    { name: "Tomás Alvarez", position: "Master's Student (M1)", group: "masters", photo: face("1527980965255-d3b416303d12"), areas: [2], bio: "", interests: "Fish vaccines" },
    { name: "Yuki Sato", position: "Undergraduate (B4)", group: "undergraduates", photo: face("1524504388940-b1c1722653e1"), areas: [1], bio: "", interests: "Feed formulation" },
    { name: "Liam O'Brien", position: "Undergraduate (B4)", group: "undergraduates", photo: face("1539571696357-5a69c17a67c6"), areas: [3], bio: "", interests: "Fish behaviour" },
    { name: "Aisha Bello", position: "Undergraduate (B4)", group: "undergraduates", photo: face("1580489944761-15a19d654956"), areas: [0], bio: "", interests: "Biofloc technology" },
    { name: "Prof. Ingrid Larsen", position: "Visiting Professor, Nordic Institute of Marine Research", group: "collaborators", photo: face("1529626455594-4ff0802cfb7e"), areas: [3, 4], bio: "", interests: "Salmon genetics" },
  ];
  const memberRows: { id: string }[] = [];
  for (const [i, m] of members.entries()) {
    const slug = m.name.toLowerCase().replace(/^(prof\.|assoc\. prof\.|dr\.)\s*/i, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    memberRows.push(
      await db.member.create({
        data: {
          slug,
          name: m.name,
          position: m.position,
          photo: m.photo,
          email: m.email ?? "",
          bio: m.bio,
          researchInterests: m.interests,
          education: m.education ?? "",
          links: m.group === "faculty" || m.group === "postdocs" ? links(m.name) : [],
          order: i,
          joinYear: 2018 + (i % 6),
          categoryId: groupRows[m.group],
          researchAreas: { connect: m.areas.map((x) => ({ id: areaRows[x].id })) },
        },
      }),
    );
  }
  const alumni = [
    { name: "Dr. Priya Nair", position: "PhD (2023)", currentPosition: "Research Scientist, National Fisheries Agency", photo: face("1534528741775-53994a69daeb"), year: 2023 },
    { name: "Marco Bianchi", position: "MSc (2024)", currentPosition: "Aquaculture Engineer, BlueFarm Ltd.", photo: "", year: 2024 },
    { name: "Grace Kim", position: "MSc (2022)", currentPosition: "PhD student, University of Tasmania", photo: face("1517841905240-472988babdf9"), year: 2022 },
  ];
  for (const [i, a] of alumni.entries()) {
    await db.member.create({
      data: {
        slug: a.name.toLowerCase().replace(/^dr\.\s*/, "").replace(/[^a-z0-9]+/g, "-"),
        name: a.name,
        position: a.position,
        currentPosition: a.currentPosition,
        photo: a.photo,
        isAlumni: true,
        graduationYear: a.year,
        order: 100 + i,
      },
    });
  }

  // News
  const cats = [
    ["Conference", "conference", "#0ea5e9"],
    ["Award", "award", "#f59e0b"],
    ["Publication", "publication", "#8b5cf6"],
    ["Event", "event", "#14b8a6"],
    ["Announcement", "announcement", "#ef4444"],
  ];
  const catRows: Record<string, string> = {};
  for (const [i, [name, slug, color]] of cats.entries()) {
    catRows[slug] = (await db.newsCategory.create({ data: { name, slug, color, order: i } })).id;
  }

  const news = [
    {
      slug: "world-aquaculture-2026", title: "11 presentations at World Aquaculture Society Meeting 2026", date: "2026-09-16", cat: "conference",
      venue: "Kitakyushu International Conference Center", externalUrl: "https://www.was.org", coverImage: IMG.labTeam, pinned: true,
      excerpt: "Our students and staff presented eleven posters and talks on feeds, fish health and ecosystem monitoring.",
      presentations: [
        { title: "Black soldier fly meal improves gut health of Nile tilapia", presenters: "A. Rahman, D. Hartmann", date: "Sep 16, 2026", format: "Oral" },
        { title: "A multi-strain probiotic reduces Vibrio mortality in whiteleg shrimp", presenters: "S. Martins, M. Tanaka", date: "Sep 16, 2026", format: "Poster" },
        { title: "eDNA metabarcoding of estuarine fish communities across seasons", presenters: "H. Clarke, S. Okafor", date: "Sep 17, 2026", format: "Poster" },
        { title: "Low-cost IoT sensors for water-quality control in small RAS", presenters: "N. Hossain, D. Hartmann", date: "Sep 17, 2026", format: "Poster" },
        { title: "Genome-wide association of growth traits in yellowtail", presenters: "K. Watanabe, M. Tanaka", date: "Sep 18, 2026", format: "Poster" },
      ],
    },
    {
      slug: "best-student-paper-award", title: "Sofia Martins wins Best Student Paper Award", date: "2026-08-28", cat: "award", coverImage: IMG.clownfish,
      excerpt: "PhD candidate Sofia Martins received the Best Student Paper Award at the Asian Fisheries Forum for her work on shrimp probiotics.",
    },
    {
      slug: "paper-aquaculture-journal", title: "New paper in Aquaculture on insect-based feeds", date: "2026-07-10", cat: "publication", coverImage: IMG.goldfish,
      excerpt: "Our study shows that up to 50% of fishmeal can be replaced with insect meal without affecting tilapia growth.",
    },
    {
      slug: "open-lab-day-2026", title: "Open Lab Day for prospective students — October 12", date: "2026-06-20", cat: "event", coverImage: IMG.labCorridor,
      excerpt: "Visit our wet-lab facilities, meet current students and learn about graduate programmes in the Faculty of Fisheries.",
    },
    {
      slug: "new-grant-national-science-foundation", title: "Lab awarded a new 3-year national research grant", date: "2026-04-02", cat: "announcement", coverImage: IMG.reefLight,
      excerpt: "The grant will fund research on climate-resilient aquaculture strains in collaboration with two partner universities.",
    },
    {
      slug: "fieldwork-coastal-survey", title: "Spring coastal fish survey completed", date: "2026-03-15", cat: "event", coverImage: IMG.sea,
      excerpt: "Students joined the faculty research vessel for a week-long survey of coastal fish nurseries.",
    },
  ];
  for (const n of news) {
    await db.newsPost.create({
      data: {
        slug: n.slug,
        title: n.title,
        date: new Date(n.date),
        excerpt: n.excerpt,
        body: `<p>${n.excerpt}</p><p>Congratulations to everyone involved. More details will be shared on the lab's social media channels.</p>`,
        coverImage: n.coverImage,
        venue: n.venue ?? "",
        externalUrl: n.externalUrl ?? "",
        presentations: n.presentations ?? [],
        pinned: n.pinned ?? false,
        categoryId: catRows[n.cat],
      },
    });
  }

  // Publications
  const pubs = [
    { title: "Black soldier fly larvae meal as a sustainable fishmeal replacement in Nile tilapia diets: growth, gut microbiota and fillet quality", authors: "Rahman A., Watanabe K., Hartmann D.", venue: "Aquaculture", year: 2026, type: "Journal Article", volume: "581", pages: "740412", doi: "10.1016/j.aquaculture.2026.740412", featured: true, areas: [1] },
    { title: "A multi-strain Bacillus probiotic protects Litopenaeus vannamei against acute hepatopancreatic necrosis disease", authors: "Martins S., Tanaka M.", venue: "Fish & Shellfish Immunology", year: 2026, type: "Journal Article", volume: "148", pages: "109512", doi: "10.1016/j.fsi.2026.109512", featured: true, areas: [2] },
    { title: "Seasonal eDNA metabarcoding reveals nursery function of temperate estuaries", authors: "Clarke H., Okafor S.", venue: "Environmental DNA", year: 2025, type: "Journal Article", volume: "7", pages: "e512", doi: "10.1002/edn3.512", featured: true, areas: [3] },
    { title: "Genomic prediction of growth and disease resistance in yellowtail (Seriola quinqueradiata)", authors: "Watanabe K., Larsen I., Tanaka M.", venue: "Frontiers in Genetics", year: 2025, type: "Journal Article", volume: "16", pages: "1123", doi: "10.3389/fgene.2025.1123", areas: [4] },
    { title: "Low-cost IoT monitoring for small-scale recirculating aquaculture systems", authors: "Hossain N., Hartmann D.", venue: "Proceedings of the World Aquaculture Conference", year: 2025, type: "Conference Paper", pages: "212–219", areas: [0] },
    { title: "Hyperspectral imaging for non-destructive freshness assessment of fish fillets", authors: "Rossi E., Moreau L., Hartmann D.", venue: "Food Chemistry", year: 2024, type: "Journal Article", volume: "432", pages: "137201", doi: "10.1016/j.foodchem.2024.137201", areas: [5] },
    { title: "Sustainable Aquaculture: Principles and Practice", authors: "Hartmann D., Tanaka M. (Eds.)", venue: "Springer", year: 2024, type: "Book", areas: [0, 1] },
    { title: "Mucosal immunity in teleost fish: implications for oral vaccine design", authors: "Tanaka M.", venue: "Reviews in Aquaculture", year: 2023, type: "Journal Article", volume: "15", pages: "1450–1472", doi: "10.1111/raq.12790", areas: [2] },
  ];
  for (const p of pubs) {
    const { areas: a, ...rest } = p;
    await db.publication.create({
      data: {
        ...rest,
        abstract: "This study addresses a key challenge for sustainable aquatic food production. We combine controlled experiments with molecular and statistical analyses; results provide practical recommendations for industry and management.",
        url: rest.doi ? `https://doi.org/${rest.doi}` : "",
        researchAreas: { connect: a.map((x) => ({ id: areaRows[x].id })) },
      },
    });
  }

  // Projects
  const projects = [
    { slug: "climate-resilient-strains", title: "Climate-resilient aquaculture strains", funder: "National Science Foundation", role: "Principal Investigator", startYear: 2026, endYear: 2029, amount: "$1.2M", status: "Ongoing", areas: [2, 4], coverImage: IMG.reefFish,
      summary: "Breeding heat- and disease-tolerant fish lines to secure aquaculture production under warming seas." },
    { slug: "circular-feeds", title: "Circular feeds from food-industry side streams", funder: "Ministry of Agriculture, Forestry & Fisheries", role: "Principal Investigator", startYear: 2024, endYear: 2027, amount: "$650K", status: "Ongoing", areas: [1], coverImage: IMG.goldfish,
      summary: "Upcycling brewery and food waste into insect and microbial proteins for fish feed." },
    { slug: "coastal-edna-network", title: "Coastal eDNA monitoring network", funder: "Environmental Research Council", role: "Co-Investigator", startYear: 2022, endYear: 2025, amount: "$400K", status: "Completed", areas: [3], coverImage: IMG.turtle,
      summary: "A citizen-science network sampling coastal waters to track fish biodiversity through environmental DNA." },
  ];
  for (const [i, p] of projects.entries()) {
    const { areas: a, ...rest } = p;
    await db.project.create({
      data: {
        ...rest,
        order: i,
        body: `<p>${rest.summary}</p><h2>Objectives</h2><ul><li>Generate new scientific knowledge</li><li>Develop tools that industry can adopt</li><li>Train the next generation of fisheries scientists</li></ul>`,
        researchAreas: { connect: a.map((x) => ({ id: areaRows[x].id })) },
      },
    });
  }

  // Events
  await db.event.createMany({
    data: [
      { slug: "open-lab-day-2026", title: "Open Lab Day 2026", startDate: new Date("2026-10-12T10:00:00"), endDate: new Date("2026-10-12T16:00:00"), location: "Building 4, Faculty of Fisheries", summary: "Tour our facilities and meet current students.", coverImage: IMG.labCorridor, registrationUrl: "https://forms.example.com/open-lab" },
      { slug: "seminar-ocean-warming", title: "Seminar: Ocean warming and fish physiology", startDate: new Date("2026-11-05T15:00:00"), location: "Seminar Room 2", summary: "Guest lecture by Prof. Ingrid Larsen (Nordic Institute of Marine Research).", coverImage: IMG.whale },
      { slug: "aquaculture-workshop-2026", title: "Hands-on RAS Workshop", startDate: new Date("2026-12-02T09:30:00"), endDate: new Date("2026-12-03T17:00:00"), location: "Wet-lab Facility", summary: "Two-day practical workshop on recirculating aquaculture system design.", coverImage: IMG.tang },
      { slug: "spring-symposium-2026", title: "Spring Fisheries Symposium", startDate: new Date("2026-03-20T09:00:00"), location: "University Hall", summary: "Annual student research symposium.", coverImage: IMG.labTeam },
    ],
  });

  // Gallery
  const albums = [
    { slug: "fieldwork-2026", title: "Coastal Fieldwork 2026", description: "Sampling fish nurseries aboard the faculty research vessel.", date: "2026-03-15", cover: IMG.sea, images: [IMG.sea, IMG.beach, IMG.wave, IMG.whale, IMG.underwater] },
    { slug: "life-in-the-lab", title: "Life in the Lab", description: "Everyday moments in our wet-lab and molecular lab.", date: "2026-05-01", cover: IMG.labTeam, images: [IMG.labTeam, IMG.pipette, IMG.labCorridor, IMG.glassware, IMG.cells] },
    { slug: "underwater-world", title: "Underwater World", description: "Dive surveys and reef monitoring.", date: "2025-08-10", cover: IMG.reefFish, images: [IMG.reefFish, IMG.reefLight, IMG.coral, IMG.diver, IMG.clownfish, IMG.pinkFish, IMG.turtle] },
  ];
  for (const [i, a] of albums.entries()) {
    await db.galleryAlbum.create({
      data: {
        slug: a.slug, title: a.title, description: a.description, date: new Date(a.date), coverImage: a.cover, order: i,
        images: { create: a.images.map((url, j) => ({ url, order: j, caption: "" })) },
      },
    });
  }

  // Opportunities
  await db.opportunity.createMany({
    data: [
      { slug: "phd-positions-2027", title: "PhD positions — April 2027 intake", type: "PhD Student", order: 0, summary: "Fully funded PhD positions in fish nutrition and fish health. Scholarships available for international students.", deadline: new Date("2026-12-15"), applyUrl: "https://example.edu/admissions",
        body: "<h3>Who we are looking for</h3><ul><li>MSc in fisheries, aquaculture, biology or related field</li><li>Strong interest in experimental research</li><li>Good English communication skills</li></ul><h3>How to apply</h3><p>Send your CV, transcript and a one-page research proposal via the contact form.</p>" },
      { slug: "masters-2027", title: "Master's students", type: "Master's Student", order: 1, summary: "Join one of our research groups for the two-year Master's programme in Fisheries Science.", applyUrl: "https://example.edu/admissions",
        body: "<p>Undergraduates from any university are welcome to visit the lab before applying. Please contact us to arrange a visit.</p>" },
      { slug: "postdoc-genomics", title: "Postdoctoral researcher in fish genomics", type: "Postdoc", order: 2, summary: "Two-year position on the climate-resilient strains project.", deadline: new Date("2026-11-30"),
        body: "<p>Experience with genomic data analysis (GWAS, genomic selection) is required.</p>" },
      { slug: "visiting-researchers", title: "Visiting researchers & interns", type: "Visiting Researcher", order: 3, summary: "We host visiting scholars and summer interns every year.", isOpen: true, body: "<p>Contact us with your research interests and preferred period.</p>" },
    ],
  });

  // Partners
  const partners = [
    ["Nordic Institute of Marine Research", "Norway"],
    ["National Fisheries Agency", "Japan"],
    ["WorldFish Center", "Malaysia"],
    ["University of Tasmania", "Australia"],
    ["BlueFarm Aquaculture Ltd.", "Chile"],
    ["Ocean Conservation Trust", "UK"],
  ];
  for (const [i, [name, country]] of partners.entries()) {
    await db.partner.create({ data: { name, country, order: i, url: "https://example.org" } });
  }

  // Custom page
  await db.page.create({
    data: {
      slug: "facilities",
      title: "Facilities",
      subtitle: "State-of-the-art infrastructure for aquatic research",
      coverImage: IMG.labCorridor,
      body: "<p>Our laboratory operates a 600 m² wet-lab with recirculating systems, a molecular biology lab, a histology suite and a food analysis lab. Students also have access to the faculty's research vessel and field station.</p><h2>Wet-lab</h2><p>24 independent tanks with automated water-quality control.</p><h2>Molecular lab</h2><p>qPCR, sequencing and bioinformatics workstations.</p>",
    },
  });

  // Homepage
  const sections = [
    { type: "hero", title: "Understanding aquatic life to feed the future", subtitle: "We advance sustainable aquaculture, fish health and aquatic ecosystem science — from the molecule to the ocean.",
      content: {
        eyebrow: "Faculty of Fisheries · University of Marine Science",
        slides: [
          { image: IMG.diver, title: "", subtitle: "" },
          { image: IMG.reefFish, title: "", subtitle: "" },
          { image: IMG.labTeam, title: "", subtitle: "" },
          { image: IMG.wave, title: "", subtitle: "" },
        ],
        primaryLabel: "Explore our research", primaryHref: "/research",
        secondaryLabel: "Join the lab", secondaryHref: "/join-us",
      } },
    { type: "stats", title: "", subtitle: "",
      content: { stats: [{ value: "{members}", label: "Lab members" }, { value: "{publications}", label: "Publications" }, { value: "{projects}", label: "Funded projects" }, { value: "{partners}", label: "Partner institutions" }] } },
    { type: "about", title: "Science for sustainable aquatic food systems", subtitle: "About the laboratory",
      body: "<p>Founded in 2008, our laboratory brings together biologists, engineers and data scientists to solve real problems in fisheries and aquaculture. We work closely with farmers, industry and government so our findings make a difference on the water.</p>",
      content: { eyebrow: "Who we are", image: IMG.labTeam, highlights: ["6 research themes spanning molecule to ecosystem", "State-of-the-art recirculating wet-lab facility", "International partners on four continents", "Graduates working in industry, academia and government"], primaryLabel: "Meet the team", primaryHref: "/members" } },
    { type: "research", title: "Research areas", subtitle: "Six interconnected themes tackle the biggest challenges in fisheries and aquaculture.", content: { eyebrow: "What we do", limit: 6, primaryLabel: "All research", primaryHref: "/research" } },
    { type: "news", title: "Latest news", subtitle: "Conferences, awards, publications and life in the lab.", content: { eyebrow: "What's new", limit: 4, primaryLabel: "All news", primaryHref: "/news" } },
    { type: "publications", title: "Featured publications", subtitle: "", content: { eyebrow: "Research output", limit: 3, primaryLabel: "All publications", primaryHref: "/publications" } },
    { type: "members", title: "Our faculty", subtitle: "Led by experienced researchers and supported by a diverse, international team of students.", content: { eyebrow: "People", limit: 4, memberGroup: "faculty", primaryLabel: "All members", primaryHref: "/members" } },
    { type: "partners", title: "Collaborating institutions", subtitle: "", content: { eyebrow: "Partners" } },
    { type: "cta", title: "Curious about fish, oceans and food security?", subtitle: "",
      body: "<p>We welcome motivated students and researchers from around the world. Come visit the lab, or get in touch to discuss collaboration.</p>",
      content: { image: IMG.reefLight, primaryLabel: "Join us", primaryHref: "/join-us", secondaryLabel: "Contact", secondaryHref: "/contact" } },
  ];
  for (const [i, s] of sections.entries()) {
    await db.homeSection.create({ data: { ...s, body: s.body ?? "", order: i } });
  }

  console.log(`✓ Seeded demo content: ${areaRows.length} research areas, ${memberRows.length + alumni.length} members, ${news.length} news, ${pubs.length} publications`);
}

async function main() {
  const reset = process.argv.includes("--reset");
  if (reset) {
    await wipeContent();
    console.log("• Wiped existing content");
  }
  const hasContent = await db.siteSettings.findUnique({ where: { id: 1 } });
  if (hasContent) console.log("• Content already present — skipping demo content (use --reset to replace)");
  else await seedContent();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
