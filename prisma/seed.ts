/**
 * Seeds the database with the Advanced Analytical Lab content and the first
 * super admin. Content is only inserted into an empty database.
 *
 *   npm run db:seed              # first-time setup
 *   npm run db:seed -- --reset   # wipe content (not users) and seed again
 *   SEED_RESET=true npm run db:seed   # same, for one-off runs on the server
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import photos from "./photos.json";

const db = new PrismaClient();

// Uploaded from `photots/` — see prisma/photos.json.
const P = photos as Record<string, string>;
const IMG = {
  facultyPair: P["lab-01"],
  equipmentDemo: P["lab-02"],
  discussion: P["lab-03"],
  training: P["lab-04"],
  seminar: P["lab-05"],
  presenting: P["lab-06"],
  slidePrep: P["lab-07"],
  groupPhoto: P["lab-08"],
  seminarWide: P["lab-09"],
  workshop: P["lab-10"],
  plaque: P["lab-11"],
  banner: P["lab-12"],
};

const LAB = {
  name: "Advanced Analytical Lab",
  short: "AAL",
  department: "Department of Fisheries Technology",
  faculty: "Faculty of Fisheries",
  university: "Patuakhali Science and Technology University (PSTU)",
  universityUrl: "https://pstu.ac.bd",
  projectTitle:
    "Development of a Rapid, Noninvasive and Eco-friendly Technology for Seafood Quality and Safety Analysis Using Fluorescence Fingerprint Coupled With Chemometrics",
  pin: "13571",
};

async function wipeContent() {
  await db.$transaction([
    db.attendance.deleteMany(),
    db.galleryImage.deleteMany(),
    db.galleryAlbum.deleteMany(),
    db.newsPost.deleteMany(),
    db.newsCategory.deleteMany(),
    db.notice.deleteMany(),
    db.publication.deleteMany(),
    db.project.deleteMany(),
    db.equipment.deleteMany(),
    db.member.updateMany({ data: { supervisorId: null, categoryId: null } }),
    db.member.deleteMany({ where: { account: null } }),
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
      labName: LAB.name,
      shortName: LAB.short,
      tagline: "Rapid, non-invasive and eco-friendly analysis of seafood quality and safety.",
      description:
        "The Advanced Analytical Lab of the Department of Fisheries Technology, PSTU, develops fast and eco-friendly analytical methods for seafood quality and safety — combining fluorescence fingerprinting, chemometrics and modern food-analysis techniques.",
      faculty: LAB.faculty,
      department: LAB.department,
      university: LAB.university,
      universityUrl: LAB.universityUrl,
      foundedYear: 2026,
      primaryColor: "#0b3b5c",
      accentColor: "#14b8a6",
      headingFont: "Plus Jakarta Sans",
      bodyFont: "Inter",
      address:
        "Advanced Analytical Lab\nDepartment of Fisheries Technology, Faculty of Fisheries\nPatuakhali Science and Technology University\nDumki, Patuakhali-8602, Bangladesh",
      officeHours: "Sunday–Thursday, 9:00–17:00",
      accessInfo:
        "<h3>On campus</h3><p>The laboratory is in the <strong>Faculty of Fisheries</strong> building of Patuakhali Science and Technology University, Dumki, Patuakhali. Visitors should report to the Department of Fisheries Technology office first.</p><h3>Getting to PSTU</h3><p>PSTU is about 15 km from Patuakhali town and roughly 25 km from Barishal–Kuakata highway junction at Dumki. Buses and local transport run to the campus gate throughout the day.</p>",
      socials: [],
      footerAbout:
        "A research laboratory of the Department of Fisheries Technology, PSTU, refurbished and modernized under the HEAT-ATF sub-project (PIN 13571), funded by the World Bank (IDA) and HEAT, UGC, Government of Bangladesh.",
      footerLinks: [
        { label: "PSTU", url: LAB.universityUrl },
        { label: "Faculty of Fisheries", url: "https://pstu.ac.bd/faculty/fisheries" },
        { label: "University Grants Commission", url: "https://ugc.gov.bd" },
        { label: "HEAT Project", url: "https://heat.ugc.gov.bd" },
      ],
      seoTitle: `${LAB.name} — ${LAB.department}, PSTU`,
      seoDescription:
        "Advanced Analytical Lab, Department of Fisheries Technology, Patuakhali Science and Technology University — fluorescence fingerprint and chemometrics for seafood quality and safety analysis.",
      seoKeywords:
        "seafood quality, seafood safety, fluorescence fingerprint, chemometrics, microplastics, fisheries technology, PSTU, Patuakhali",
      ogImageUrl: IMG.banner,
      announcementEnabled: true,
      announcementText: "Advanced Analytical Lab is now open — HEAT-ATF sub-project (PIN 13571)",
      announcementUrl: "/notices",
      contactIntro:
        "For laboratory visits, student placement, sample analysis or research collaboration, send us a message and we will get back to you.",
      inquiryTypes: [
        "Lab visit",
        "Student placement / thesis",
        "Sample analysis request",
        "Research collaboration",
        "Training request",
        "Other",
      ],
      attendanceRadiusMeters: 250,
      attendanceRequiresFence: true,
      memberSignupEnabled: true,
      memberSignupNote:
        "Students and researchers working in the Advanced Analytical Lab can create an account. A lab administrator approves each request before the member area unlocks.",
    },
  });

  const nav: [string, string][] = [
    ["Home", "/"],
    ["Research", "/research"],
    ["Members", "/members"],
    ["Notices", "/notices"],
    ["News", "/news"],
    ["Contact", "/contact"],
  ];
  for (const [i, [label, href]] of nav.entries()) {
    await db.navItem.create({ data: { label, href, order: i } });
  }
  const more = await db.navItem.create({ data: { label: "More", href: "#", order: nav.length } });
  const sub: [string, string][] = [
    ["Project", "/projects"],
    ["Publications", "/publications"],
    ["Gallery", "/gallery"],
    ["Facilities", "/p/facilities"],
    ["Join Us", "/join-us"],
    ["Member portal", "/account"],
  ];
  for (const [i, [label, href]] of sub.entries()) {
    await db.navItem.create({ data: { label, href, order: i, parentId: more.id } });
  }

  // ─── Research areas ────────────────────────────────────────────────────────
  const areas = [
    {
      slug: "fluorescence-fingerprint",
      title: "Fluorescence Fingerprint",
      subtitle: "Rapid, non-invasive measurement",
      coverImage: IMG.slidePrep,
      summary:
        "Excitation–emission matrices of fish and seafood samples are recorded without destroying the sample, giving a spectral “fingerprint” of freshness, composition and spoilage.",
    },
    {
      slug: "chemometrics",
      title: "Chemometrics & Data Analysis",
      subtitle: "Turning spectra into decisions",
      coverImage: IMG.workshop,
      summary:
        "PARAFAC, PLS regression, PCA and machine-learning models convert fluorescence data into practical indicators of quality, origin and safety.",
    },
    {
      slug: "seafood-quality",
      title: "Seafood Quality & Freshness",
      subtitle: "From harvest to consumer",
      coverImage: IMG.equipmentDemo,
      summary:
        "Freshness indices, proximate composition and sensory correlation studies on fish sold in local and export markets, including cold-chain and storage trials.",
    },
    {
      slug: "seafood-safety",
      title: "Seafood Safety",
      subtitle: "Contaminants and compliance",
      coverImage: IMG.presenting,
      summary:
        "Screening for adulteration, chemical residues and microbial hazards, supporting HACCP practice and national food-safety requirements.",
    },
    {
      slug: "microplastics",
      title: "Microplastics in Fish & Seafood",
      subtitle: "Extraction, identification, risk",
      coverImage: IMG.seminar,
      summary:
        "Digestion-based extraction (NaCl and hydrogen peroxide), microscopic identification and polymer characterisation of microplastics in commercially important fish.",
    },
    {
      slug: "post-harvest-technology",
      title: "Post-harvest & Processing Technology",
      subtitle: "Value addition and preservation",
      coverImage: IMG.training,
      summary:
        "Drying, chilling, packaging and value-added product development that reduce post-harvest loss and improve shelf-life of fish and fishery products.",
    },
  ];
  const areaRows: { id: string }[] = [];
  for (const [i, a] of areas.entries()) {
    areaRows.push(
      await db.researchArea.create({
        data: {
          ...a,
          order: i,
          body: `<p>${a.summary}</p><h2>Why it matters</h2><p>Bangladesh is one of the world's leading fish-producing countries, and quality and safety decide both consumer health and export value. Conventional laboratory methods are slow, expensive and destroy the sample. This laboratory develops methods that are fast, non-destructive and affordable enough for routine use.</p><h2>How we work</h2><ul><li>Sample collection from local landing centres, farms and markets</li><li>Standardised sample preparation in the laboratory</li><li>Instrumental measurement and data acquisition</li><li>Chemometric modelling and validation</li><li>Training of students and stakeholders on the method</li></ul>`,
          gallery: [IMG.training, IMG.seminarWide, IMG.discussion],
        },
      }),
    );
  }

  // ─── Equipment ─────────────────────────────────────────────────────────────
  const equipment = [
    { name: "Fluorescence spectrometer", description: "Records excitation–emission matrices of fish and seafood samples for fingerprint analysis.", image: IMG.slidePrep, areas: [0, 2] },
    { name: "Microscopy unit for microplastics", description: "Stereo and compound microscopy for identifying and counting microplastic particles after digestion.", image: IMG.seminar, areas: [4] },
    { name: "Sample preparation unit", description: "Digestion, filtration and homogenisation setup used before instrumental analysis.", image: IMG.equipmentDemo, areas: [2, 4] },
    { name: "Data analysis workstations", description: "Dedicated computers for chemometric modelling, machine learning and reporting.", image: IMG.workshop, areas: [1] },
    { name: "Training and seminar facility", description: "Seminar space inside the laboratory used for hands-on training of students and stakeholders.", image: IMG.groupPhoto, areas: [5] },
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

  // ─── People ────────────────────────────────────────────────────────────────
  const groups: [string, string][] = [
    ["Project Team", "project-team"],
    ["Research Assistants", "research-assistants"],
    ["MS Students", "ms-students"],
    ["BSc Students", "bsc-students"],
    ["Collaborators", "collaborators"],
  ];
  const groupIds: Record<string, string> = {};
  for (const [i, [name, slug]] of groups.entries()) {
    groupIds[slug] = (await db.memberCategory.create({ data: { name, slug, order: i } })).id;
  }

  const faculty = [
    {
      slug: "md-mizanur-rahman",
      name: "Prof. Dr. Md. Mizanur Rahman",
      position: "Sub-Project Manager (SPM)",
      department: "Department of Fisheries Technology",
      areas: [0, 1, 2],
      bio: `<p>Prof. Dr. Md. Mizanur Rahman leads the Advanced Analytical Lab as Sub-Project Manager of the HEAT-ATF sub-project (PIN ${LAB.pin}). His work focuses on rapid, non-invasive analysis of seafood quality and safety using fluorescence fingerprinting combined with chemometrics.</p>`,
      interests: "Fluorescence fingerprint, chemometrics, seafood quality and safety, post-harvest technology",
    },
    {
      slug: "mohammad-lokman-ali",
      name: "Prof. Dr. Mohammad Lokman Ali",
      position: "Associate Sub-Project Manager (ASPM-1)",
      department: "Department of Aquaculture",
      areas: [2, 5],
      bio: "<p>Prof. Dr. Mohammad Lokman Ali of the Department of Aquaculture contributes to the sub-project as Associate Sub-Project Manager, linking laboratory analysis with aquaculture production systems.</p>",
      interests: "Aquaculture systems, fish production, quality management",
    },
    {
      slug: "md-jahangir-alam",
      name: "Prof. Dr. Md. Jahangir Alam",
      position: "Associate Sub-Project Manager (ASPM-2)",
      department: "Department of Fisheries Management",
      areas: [3, 4],
      bio: "<p>Prof. Dr. Md. Jahangir Alam of the Department of Fisheries Management works on fisheries resources, safety and management aspects of the sub-project.</p>",
      interests: "Fisheries management, aquatic resources, food safety",
    },
    {
      slug: "kanij-rukshana-sumi",
      name: "Prof. Dr. Kanij Rukshana Sumi",
      position: "Project Member",
      department: "Department of Aquaculture",
      areas: [2, 4],
      bio: "<p>Prof. Dr. Kanij Rukshana Sumi of the Department of Aquaculture is a member of the sub-project team, working on quality and safety aspects of farmed fish.</p>",
      interests: "Aquaculture, fish nutrition, seafood quality",
    },
  ];
  for (const [i, f] of faculty.entries()) {
    await db.member.create({
      data: {
        slug: f.slug,
        name: f.name,
        position: f.position,
        program: "Faculty",
        faculty: LAB.faculty,
        department: f.department,
        bio: f.bio,
        researchInterests: f.interests,
        order: i,
        status: "APPROVED",
        categoryId: groupIds["project-team"],
        researchAreas: { connect: f.areas.map((x) => ({ id: areaRows[x].id })) },
      },
    });
  }

  // ─── Project ───────────────────────────────────────────────────────────────
  await db.project.create({
    data: {
      slug: "heat-atf-13571",
      title: LAB.projectTitle,
      funder: "World Bank (IDA) and HEAT, UGC, Government of Bangladesh",
      role: "Sub-Project Manager: Prof. Dr. Md. Mizanur Rahman",
      status: "Ongoing",
      amount: "",
      startYear: 2025,
      coverImage: IMG.banner,
      summary: `Higher Education Acceleration and Transformation (HEAT) — Academic Transformation Fund (ATF) sub-project PIN ${LAB.pin}, implemented by the Department of Fisheries Technology, PSTU.`,
      body: `<p>This sub-project develops a rapid, non-invasive and eco-friendly technology for seafood quality and safety analysis using fluorescence fingerprint coupled with chemometrics. Under the project the Advanced Analytical Lab of the Department of Fisheries Technology was refurbished and modernized.</p><h2>Project team</h2><ul><li><strong>SPM:</strong> Prof. Dr. Md. Mizanur Rahman, Department of Fisheries Technology</li><li><strong>ASPM-1:</strong> Prof. Dr. Mohammad Lokman Ali, Department of Aquaculture</li><li><strong>ASPM-2:</strong> Prof. Dr. Md. Jahangir Alam, Department of Fisheries Management</li><li><strong>Member:</strong> Prof. Dr. Kanij Rukshana Sumi, Department of Aquaculture</li></ul><h2>Implementation and funding</h2><p>Implemented by the Department of Fisheries Technology, PSTU. Funded by the World Bank (IDA) and HEAT, University Grants Commission, Government of Bangladesh.</p>`,
      researchAreas: { connect: [areaRows[0].id, areaRows[1].id, areaRows[2].id].map((id) => ({ id })) },
    },
  });

  // ─── News & notices ────────────────────────────────────────────────────────
  const cats: [string, string, string][] = [
    ["Event", "event", "#14b8a6"],
    ["Training", "training", "#0ea5e9"],
    ["Announcement", "announcement", "#f59e0b"],
    ["Publication", "publication", "#8b5cf6"],
  ];
  const catIds: Record<string, string> = {};
  for (const [i, [name, slug, color]] of cats.entries()) {
    catIds[slug] = (await db.newsCategory.create({ data: { name, slug, color, order: i } })).id;
  }

  const news = [
    {
      slug: "advanced-analytical-lab-inaugurated",
      title: "Advanced Analytical Lab inaugurated by the Honorable Vice-Chancellor",
      date: "2026-08-20",
      cat: "event",
      coverImage: IMG.plaque,
      pinned: true,
      excerpt:
        "The refurbished and modernized Advanced Analytical Lab of the Department of Fisheries Technology was inaugurated by Prof. Dr. S. M. Hemayet Jahan, Honorable Vice-Chancellor of PSTU.",
      body: `<p>The Advanced Analytical Lab of the Department of Fisheries Technology, PSTU, was inaugurated in August 2026 by <strong>Prof. Dr. S. M. Hemayet Jahan</strong>, Honorable Vice-Chancellor of Patuakhali Science and Technology University.</p><p>The laboratory was refurbished and modernized with support from the HEAT-ATF sub-project (PIN ${LAB.pin}), <em>${LAB.projectTitle}</em>, under Sub-Project Manager Prof. Dr. Md. Mizanur Rahman.</p>`,
    },
    {
      slug: "hands-on-training-seafood-analysis",
      title: "Hands-on training on seafood quality and safety analysis",
      date: "2026-09-10",
      cat: "training",
      coverImage: IMG.training,
      excerpt:
        "Students and researchers took part in a hands-on session covering sample preparation, instrumental measurement and data analysis in the new laboratory.",
      body: "<p>The laboratory hosted a hands-on training session for students and young researchers of the Faculty of Fisheries. The session covered sample collection and preparation, laboratory safety, instrument handling and the basics of data analysis for seafood quality studies.</p>",
    },
    {
      slug: "seminar-microplastics-in-fish",
      title: "Seminar on microplastics in commercially important fish",
      date: "2026-09-17",
      cat: "event",
      coverImage: IMG.seminar,
      excerpt:
        "A seminar presented the extraction and identification workflow for microplastics in fish, from NaCl and hydrogen peroxide digestion to microscopic identification.",
      body: "<p>Research students presented the methodology and preliminary findings of an ongoing study on microplastics in commercially important fish species, including sample digestion with NaCl and hydrogen peroxide, filtration and identification of particles under the microscope.</p>",
    },
    {
      slug: "lab-open-for-student-research",
      title: "Laboratory open for MS and BSc student research",
      date: "2026-09-22",
      cat: "announcement",
      coverImage: IMG.workshop,
      excerpt:
        "MS and undergraduate students of the Faculty of Fisheries can now apply to carry out thesis research in the Advanced Analytical Lab.",
      body: "<p>Students of the Faculty of Fisheries interested in seafood quality, safety, microplastics or post-harvest technology can apply to carry out their thesis research in the laboratory. Create a member account on this website and a lab administrator will review your request.</p>",
    },
  ];
  for (const n of news) {
    await db.newsPost.create({
      data: {
        slug: n.slug,
        title: n.title,
        date: new Date(n.date),
        excerpt: n.excerpt,
        body: n.body,
        coverImage: n.coverImage,
        pinned: n.pinned ?? false,
        categoryId: catIds[n.cat],
      },
    });
  }

  await db.notice.create({
    data: {
      slug: "member-accounts-open",
      title: "Member accounts are now open",
      level: "important",
      audience: "PUBLIC",
      pinned: true,
      body: "<p>Students and researchers working in the Advanced Analytical Lab can now create an account on this website. After a lab administrator approves the request, members get access to the member portal, lab notices, the lab group chat and attendance.</p>",
    },
  });

  // ─── Gallery ───────────────────────────────────────────────────────────────
  await db.galleryAlbum.create({
    data: {
      slug: "inauguration-and-training-2026",
      title: "Inauguration & training sessions, 2026",
      description:
        "The refurbished Advanced Analytical Lab, its inauguration and the first training and seminar sessions held in the laboratory.",
      date: new Date("2026-09-01"),
      coverImage: IMG.groupPhoto,
      order: 0,
      images: {
        create: [
          { url: IMG.plaque, caption: "Advanced Analytical Lab — inaugurated August 2026", order: 0 },
          { url: IMG.banner, caption: `HEAT-ATF sub-project (PIN ${LAB.pin})`, order: 1 },
          { url: IMG.facultyPair, caption: "Inside the refurbished laboratory", order: 2 },
          { url: IMG.equipmentDemo, caption: "Hands-on demonstration with laboratory staff", order: 3 },
          { url: IMG.discussion, caption: "Discussion session in the laboratory", order: 4 },
          { url: IMG.training, caption: "Training session on sample preparation", order: 5 },
          { url: IMG.seminar, caption: "Seminar on microplastics identification", order: 6 },
          { url: IMG.presenting, caption: "Student presentation in the lab seminar space", order: 7 },
          { url: IMG.slidePrep, caption: "Sample preparation workflow", order: 8 },
          { url: IMG.groupPhoto, caption: "Participants of the training session", order: 9 },
          { url: IMG.seminarWide, caption: "Seminar in progress", order: 10 },
          { url: IMG.workshop, caption: "Data analysis workshop", order: 11 },
        ],
      },
    },
  });

  // ─── Opportunities & partners ──────────────────────────────────────────────
  await db.opportunity.createMany({
    data: [
      {
        slug: "ms-thesis-students",
        title: "MS thesis students",
        type: "Master's Student",
        order: 0,
        summary: "MS students of the Faculty of Fisheries can carry out thesis research in the laboratory.",
        body: "<p>Research topics include fluorescence fingerprinting of fish, chemometric modelling, microplastics in seafood and post-harvest quality. Contact the Sub-Project Manager or create a member account to apply.</p>",
      },
      {
        slug: "bsc-project-students",
        title: "BSc project students",
        type: "Undergraduate",
        order: 1,
        summary: "Undergraduate students can join ongoing studies and learn laboratory techniques.",
        body: "<p>Undergraduate students of the Faculty of Fisheries are welcome to join the laboratory for their project work and to learn sample preparation, instrumental analysis and data handling.</p>",
      },
      {
        slug: "collaboration-and-analysis",
        title: "Collaboration & sample analysis",
        type: "Visiting Researcher",
        order: 2,
        summary: "Researchers, industry and government agencies can request collaboration or sample analysis.",
        body: "<p>The laboratory welcomes collaborative research and can support quality and safety analysis of fish and fishery products. Please use the contact form to discuss your requirement.</p>",
      },
    ],
  });

  const partners: [string, string, string][] = [
    ["World Bank (IDA)", "International", "https://www.worldbank.org"],
    ["HEAT Project, UGC Bangladesh", "Bangladesh", "https://heat.ugc.gov.bd"],
    ["University Grants Commission", "Bangladesh", "https://ugc.gov.bd"],
    ["Patuakhali Science and Technology University", "Bangladesh", LAB.universityUrl],
  ];
  for (const [i, [name, country, url]] of partners.entries()) {
    await db.partner.create({ data: { name, country, url, order: i } });
  }

  await db.page.create({
    data: {
      slug: "facilities",
      title: "Facilities",
      subtitle: "The refurbished Advanced Analytical Lab",
      coverImage: IMG.facultyPair,
      body: `<p>The Advanced Analytical Lab of the Department of Fisheries Technology was refurbished and modernized under the HEAT-ATF sub-project (PIN ${LAB.pin}). It combines instrumental analysis, sample preparation and a dedicated training space in one facility.</p><h2>Analytical section</h2><p>Instrumentation for fluorescence measurement and supporting analysis of fish and fishery products.</p><h2>Sample preparation</h2><p>Digestion, filtration and homogenisation setup used for quality, safety and microplastics studies.</p><h2>Data analysis</h2><p>Workstations dedicated to chemometric modelling, machine learning and reporting.</p><h2>Training space</h2><p>A seminar area inside the laboratory for hands-on training of students, researchers and stakeholders.</p>`,
    },
  });

  // ─── Homepage ──────────────────────────────────────────────────────────────
  const sections = [
    {
      type: "hero",
      title: "Advanced analysis for safer, better seafood",
      subtitle:
        "Rapid, non-invasive and eco-friendly technology for seafood quality and safety — fluorescence fingerprint coupled with chemometrics.",
      content: {
        eyebrow: `${LAB.department} · PSTU`,
        slides: [
          { image: IMG.workshop, title: "", subtitle: "" },
          { image: IMG.training, title: "", subtitle: "" },
          { image: IMG.seminarWide, title: "", subtitle: "" },
          { image: IMG.equipmentDemo, title: "", subtitle: "" },
        ],
        primaryLabel: "Explore our research",
        primaryHref: "/research",
        secondaryLabel: "Join the lab",
        secondaryHref: "/join-us",
      },
    },
    {
      type: "stats",
      title: "",
      subtitle: "",
      content: {
        stats: [
          { value: "{research}", label: "Research areas" },
          { value: "{members}", label: "Lab members" },
          { value: "{projects}", label: "Funded projects" },
          { value: "2026", label: "Modernized" },
        ],
      },
    },
    {
      type: "about",
      title: "A modern analytical facility for fisheries research",
      subtitle: "About the laboratory",
      body: `<p>The Advanced Analytical Lab was refurbished and modernized under the HEAT-ATF sub-project (PIN ${LAB.pin}) — <em>${LAB.projectTitle}</em> — and inaugurated in August 2026 by the Honorable Vice-Chancellor of PSTU.</p><p>The laboratory supports teaching, thesis research and service analysis for the Faculty of Fisheries, and works with farmers, processors and agencies on practical quality and safety problems.</p>`,
      content: {
        eyebrow: "Who we are",
        image: IMG.facultyPair,
        highlights: [
          "Fluorescence fingerprint and chemometrics",
          "Seafood quality, safety and microplastics research",
          "Hands-on training for MS and BSc students",
          "Funded by World Bank (IDA) and HEAT, UGC",
        ],
        primaryLabel: "Meet the team",
        primaryHref: "/members",
      },
    },
    {
      type: "research",
      title: "Research areas",
      subtitle: "From spectra to decisions that matter for fish quality and safety.",
      content: { eyebrow: "What we do", limit: 6, primaryLabel: "All research", primaryHref: "/research" },
    },
    {
      type: "news",
      title: "Latest news",
      subtitle: "Inauguration, training sessions, seminars and announcements.",
      content: { eyebrow: "What's new", limit: 4, primaryLabel: "All news", primaryHref: "/news" },
    },
    {
      type: "members",
      title: "Project team",
      subtitle: "The HEAT-ATF sub-project team leading the laboratory.",
      content: { eyebrow: "People", limit: 4, memberGroup: "project-team", primaryLabel: "All members", primaryHref: "/members" },
    },
    { type: "partners", title: "Supported by", subtitle: "", content: { eyebrow: "Partners" } },
    {
      type: "cta",
      title: "Work with the Advanced Analytical Lab",
      subtitle: "",
      body: "<p>Students, researchers, processors and agencies are welcome to collaborate, request analysis or join the laboratory for thesis research.</p>",
      content: {
        image: IMG.discussion,
        primaryLabel: "Join us",
        primaryHref: "/join-us",
        secondaryLabel: "Contact",
        secondaryHref: "/contact",
      },
    },
  ];
  for (const [i, s] of sections.entries()) {
    await db.homeSection.create({ data: { ...s, body: s.body ?? "", order: i } });
  }

  console.log(
    `✓ Seeded ${LAB.name}: ${areaRows.length} research areas, ${faculty.length} team members, ${news.length} news posts, 12 photos`,
  );
}

async function main() {
  const reset = process.argv.includes("--reset") || process.env.SEED_RESET === "true";
  if (reset) {
    await wipeContent();
    console.log("• Wiped existing content");
  }
  const hasContent = await db.siteSettings.findUnique({ where: { id: 1 } });
  if (hasContent) console.log("• Content already present — skipping (use --reset to replace)");
  else await seedContent();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
