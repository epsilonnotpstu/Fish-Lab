import { BLOOD_GROUPS, PROGRAMS, SEMESTERS } from "@/lib/member-fields";

// Declarative description of every editable collection. The admin list pages,
// forms, server-side validation and persistence are all generated from this,
// so adding a field is a one-line change here plus a schema column.
// Must stay plain serialisable data: it is passed to client components.

export type SubField = {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "image" | "date";
  placeholder?: string;
};

export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "slug"
  | "email"
  | "url"
  | "color"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "select"
  | "image"
  | "file"
  | "gallery"
  | "tags"
  | "relation"
  | "relations"
  | "repeater";

export type Field = {
  /** Column name, or `content.key` to store inside the JSON `content` column. */
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: string[];
  /** Target resource key for relation fields. */
  relation?: string;
  /** For slug fields: which field to derive from. */
  from?: string;
  subfields?: SubField[];
  /** Tab / card the field is grouped under. */
  section?: string;
  half?: boolean;
  /** Only show when another field has one of these values. */
  showIf?: { field: string; values: string[] };
  max?: number;
  /** Repeater stored as child rows of a related model instead of JSON. */
  nested?: boolean;
};

export type ListColumn = {
  name: string;
  label: string;
  type?: "text" | "image" | "boolean" | "date" | "relation" | "badge" | "number";
};

export type Resource = {
  key: string;
  model: string;
  label: string;
  singular: string;
  icon: string;
  description: string;
  titleField: string;
  imageField?: string;
  columns: ListColumn[];
  searchFields: string[];
  orderBy: Record<string, "asc" | "desc">[];
  orderable?: boolean;
  fields: Field[];
  /** Public URL for "view on site"; `:slug` is replaced. */
  publicPath?: string;
  superAdminOnly?: boolean;
  group: "Content" | "People" | "Site";
};

const published: Field = {
  name: "published",
  label: "Published",
  type: "boolean",
  help: "Unpublished items are hidden from the public site.",
  section: "Publishing",
};

export const HOME_SECTION_TYPES = [
  "hero",
  "notices",
  "about",
  "stats",
  "research",
  "news",
  "publications",
  "members",
  "partners",
  "cta",
  "custom",
] as const;

export const resources: Resource[] = [
  {
    key: "research",
    model: "researchArea",
    label: "Research Areas",
    singular: "Research Area",
    icon: "FlaskConical",
    description: "Research themes shown on the Research page and homepage.",
    titleField: "title",
    imageField: "coverImage",
    group: "Content",
    columns: [
      { name: "coverImage", label: "", type: "image" },
      { name: "title", label: "Title" },
      { name: "subtitle", label: "Subtitle" },
      { name: "published", label: "Status", type: "boolean" },
    ],
    searchFields: ["title", "subtitle", "summary"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    publicPath: "/research/:slug",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, section: "Content" },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, section: "Content", half: true },
      { name: "subtitle", label: "Subtitle", type: "text", section: "Content", half: true },
      { name: "summary", label: "Short summary", type: "textarea", help: "Shown on cards (1–3 sentences).", section: "Content" },
      { name: "body", label: "Full description", type: "richtext", section: "Content" },
      { name: "coverImage", label: "Cover image", type: "image", section: "Media" },
      { name: "gallery", label: "Image gallery", type: "gallery", section: "Media" },
      { name: "members", label: "Members involved", type: "relations", relation: "members", section: "Relations" },
      { name: "equipment", label: "Equipment", type: "relations", relation: "equipment", section: "Relations" },
      published,
    ],
  },
  {
    key: "equipment",
    model: "equipment",
    label: "Equipment",
    singular: "Equipment",
    icon: "Microscope",
    description: "Instruments and facilities, linked to research areas.",
    titleField: "name",
    imageField: "image",
    group: "Content",
    columns: [
      { name: "image", label: "", type: "image" },
      { name: "name", label: "Name" },
    ],
    searchFields: ["name", "description"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "image", label: "Image", type: "image" },
      { name: "researchAreas", label: "Used in research areas", type: "relations", relation: "research" },
    ],
  },
  {
    key: "news",
    model: "newsPost",
    label: "News",
    singular: "News Post",
    icon: "Newspaper",
    description: "Announcements, conference presentations, awards.",
    titleField: "title",
    imageField: "coverImage",
    group: "Content",
    columns: [
      { name: "coverImage", label: "", type: "image" },
      { name: "title", label: "Title" },
      { name: "category", label: "Category", type: "relation" },
      { name: "date", label: "Date", type: "date" },
      { name: "published", label: "Status", type: "boolean" },
    ],
    searchFields: ["title", "excerpt", "venue"],
    orderBy: [{ date: "desc" }],
    publicPath: "/news/:slug",
    fields: [
      { name: "title", label: "Title", type: "text", required: true, section: "Content" },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, section: "Content", half: true },
      { name: "date", label: "Date", type: "date", required: true, section: "Content", half: true },
      { name: "category", label: "Category", type: "relation", relation: "news-categories", section: "Content", half: true },
      { name: "venue", label: "Venue / location", type: "text", section: "Content", half: true },
      { name: "excerpt", label: "Excerpt", type: "textarea", help: "Short teaser shown in lists.", section: "Content" },
      { name: "body", label: "Body", type: "richtext", section: "Content" },
      {
        name: "presentations",
        label: "Presentations",
        type: "repeater",
        help: "For conference news: each talk or poster by the lab.",
        section: "Presentations",
        subfields: [
          { name: "title", label: "Title", type: "text" },
          { name: "presenters", label: "Presenters", type: "text" },
          { name: "date", label: "Date", type: "text", placeholder: "Sep 16, 2026" },
          { name: "format", label: "Format", type: "text", placeholder: "Poster / Oral" },
        ],
      },
      { name: "coverImage", label: "Cover image", type: "image", section: "Media" },
      { name: "externalUrl", label: "External link", type: "url", help: "e.g. conference website", section: "Media" },
      { name: "pinned", label: "Pin to top", type: "boolean", section: "Publishing" },
      published,
    ],
  },
  {
    key: "news-categories",
    model: "newsCategory",
    label: "News Categories",
    singular: "News Category",
    icon: "Tags",
    description: "Categories used to filter news.",
    titleField: "name",
    group: "Content",
    columns: [
      { name: "name", label: "Name", type: "badge" },
      { name: "slug", label: "Slug" },
    ],
    searchFields: ["name"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "slug", label: "Slug", type: "slug", from: "name", required: true, half: true },
      { name: "color", label: "Colour", type: "color" },
    ],
  },
  {
    key: "publications",
    model: "publication",
    label: "Publications",
    singular: "Publication",
    icon: "BookOpen",
    description: "Journal articles, conference papers, books and theses.",
    titleField: "title",
    group: "Content",
    columns: [
      { name: "title", label: "Title" },
      { name: "type", label: "Type", type: "badge" },
      { name: "year", label: "Year", type: "number" },
      { name: "featured", label: "Featured", type: "boolean" },
    ],
    searchFields: ["title", "authors", "venue"],
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "authors", label: "Authors", type: "text", required: true, help: "Comma separated, as they should appear." },
      { name: "venue", label: "Journal / conference", type: "text", half: true },
      { name: "year", label: "Year", type: "number", required: true, half: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        half: true,
        options: ["Journal Article", "Conference Paper", "Book", "Book Chapter", "Thesis", "Patent", "Report", "Preprint"],
      },
      { name: "volume", label: "Volume / issue", type: "text", half: true },
      { name: "pages", label: "Pages", type: "text", half: true },
      { name: "doi", label: "DOI", type: "text", placeholder: "10.1000/xyz123", half: true },
      { name: "url", label: "Link", type: "url", half: true },
      { name: "pdfUrl", label: "PDF", type: "file", half: true },
      { name: "abstract", label: "Abstract", type: "textarea" },
      { name: "researchAreas", label: "Research areas", type: "relations", relation: "research" },
      { name: "featured", label: "Featured on homepage", type: "boolean", section: "Publishing" },
      published,
    ],
  },
  {
    key: "projects",
    model: "project",
    label: "Projects & Grants",
    singular: "Project",
    icon: "Briefcase",
    description: "Funded projects and grants.",
    titleField: "title",
    imageField: "coverImage",
    group: "Content",
    columns: [
      { name: "title", label: "Title" },
      { name: "funder", label: "Funder" },
      { name: "status", label: "Status", type: "badge" },
      { name: "published", label: "Published", type: "boolean" },
    ],
    searchFields: ["title", "funder", "summary"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    publicPath: "/projects/:slug",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, half: true },
      { name: "status", label: "Status", type: "select", options: ["Ongoing", "Completed", "Upcoming"], half: true },
      { name: "funder", label: "Funding agency", type: "text", half: true },
      { name: "role", label: "Lab role", type: "text", placeholder: "Principal Investigator", half: true },
      { name: "startYear", label: "Start year", type: "number", half: true },
      { name: "endYear", label: "End year", type: "number", half: true },
      { name: "amount", label: "Budget", type: "text", half: true },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Details", type: "richtext" },
      { name: "coverImage", label: "Cover image", type: "image" },
      { name: "researchAreas", label: "Research areas", type: "relations", relation: "research" },
      published,
    ],
  },
  {
    key: "events",
    model: "event",
    label: "Events & Seminars",
    singular: "Event",
    icon: "CalendarDays",
    description: "Seminars, workshops, field trips and open days.",
    titleField: "title",
    imageField: "coverImage",
    group: "Content",
    columns: [
      { name: "coverImage", label: "", type: "image" },
      { name: "title", label: "Title" },
      { name: "startDate", label: "Date", type: "date" },
      { name: "location", label: "Location" },
      { name: "published", label: "Status", type: "boolean" },
    ],
    searchFields: ["title", "location", "summary"],
    orderBy: [{ startDate: "desc" }],
    publicPath: "/events/:slug",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, half: true },
      { name: "location", label: "Location", type: "text", half: true },
      { name: "startDate", label: "Starts", type: "datetime", required: true, half: true },
      { name: "endDate", label: "Ends", type: "datetime", half: true },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Details", type: "richtext" },
      { name: "coverImage", label: "Cover image", type: "image", half: true },
      { name: "registrationUrl", label: "Registration link", type: "url", half: true },
      published,
    ],
  },
  {
    key: "gallery",
    model: "galleryAlbum",
    label: "Gallery",
    singular: "Album",
    icon: "Images",
    description: "Photo albums: lab life, fieldwork, events.",
    titleField: "title",
    imageField: "coverImage",
    group: "Content",
    columns: [
      { name: "coverImage", label: "", type: "image" },
      { name: "title", label: "Album" },
      { name: "date", label: "Date", type: "date" },
      { name: "published", label: "Status", type: "boolean" },
    ],
    searchFields: ["title", "description"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, half: true },
      { name: "date", label: "Date", type: "date", half: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "coverImage", label: "Cover image", type: "image" },
      {
        name: "images",
        label: "Photos",
        type: "repeater",
        nested: true,
        subfields: [
          { name: "url", label: "Photo", type: "image" },
          { name: "caption", label: "Caption", type: "text" },
        ],
      },
      published,
    ],
  },
  {
    key: "partners",
    model: "partner",
    label: "Partners",
    singular: "Partner",
    icon: "Handshake",
    description: "Collaborating institutions shown on the homepage.",
    titleField: "name",
    imageField: "logo",
    group: "Content",
    columns: [
      { name: "logo", label: "", type: "image" },
      { name: "name", label: "Name" },
      { name: "country", label: "Country" },
      { name: "published", label: "Status", type: "boolean" },
    ],
    searchFields: ["name", "country"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "country", label: "Country", type: "text", half: true },
      { name: "url", label: "Website", type: "url", half: true },
      { name: "logo", label: "Logo", type: "image" },
      published,
    ],
  },
  {
    key: "pages",
    model: "page",
    label: "Custom Pages",
    singular: "Page",
    icon: "FileText",
    description: "Free-form pages such as Facilities, History or Teaching.",
    titleField: "title",
    group: "Content",
    columns: [
      { name: "title", label: "Title" },
      { name: "slug", label: "URL" },
      { name: "published", label: "Status", type: "boolean" },
    ],
    searchFields: ["title"],
    orderBy: [{ title: "asc" }],
    publicPath: "/p/:slug",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, help: "Page will be available at /p/<slug>", half: true },
      { name: "subtitle", label: "Subtitle", type: "text", half: true },
      { name: "body", label: "Content", type: "richtext" },
      { name: "coverImage", label: "Header image", type: "image" },
      { name: "seoDescription", label: "SEO description", type: "textarea" },
      published,
    ],
  },
  {
    key: "members",
    model: "member",
    label: "Members",
    singular: "Member",
    icon: "Users",
    description: "Faculty, students, staff, collaborators and alumni.",
    titleField: "name",
    imageField: "photo",
    group: "People",
    columns: [
      { name: "photo", label: "", type: "image" },
      { name: "name", label: "Name" },
      { name: "position", label: "Position" },
      { name: "category", label: "Group", type: "relation" },
      { name: "status", label: "Status", type: "badge" },
    ],
    searchFields: ["name", "position", "email", "studentId", "registrationNo"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    publicPath: "/members/:slug",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, section: "Profile" },
      { name: "slug", label: "URL slug", type: "slug", from: "name", required: true, section: "Profile", half: true },
      { name: "position", label: "Position / title", type: "text", placeholder: "Associate Professor", section: "Profile", half: true },
      { name: "category", label: "Group", type: "relation", relation: "member-categories", section: "Profile", half: true },
      { name: "photo", label: "Photo", type: "image", section: "Profile" },
      { name: "bio", label: "Biography", type: "richtext", section: "Profile" },
      { name: "researchInterests", label: "Research interests", type: "textarea", section: "Profile" },
      { name: "education", label: "Education", type: "textarea", section: "Profile" },
      { name: "program", label: "Program / role", type: "select", options: [...PROGRAMS], section: "Academic", half: true },
      { name: "session", label: "Session", type: "text", placeholder: "2021-22", section: "Academic", half: true },
      { name: "semester", label: "Semester / year", type: "select", options: [...SEMESTERS], section: "Academic", half: true },
      { name: "supervisor", label: "Supervisor", type: "relation", relation: "members", section: "Academic", half: true },
      { name: "faculty", label: "Faculty", type: "text", section: "Academic", half: true },
      { name: "department", label: "Department", type: "text", section: "Academic", half: true },
      { name: "studentId", label: "Student / employee ID", type: "text", section: "Academic", half: true },
      { name: "registrationNo", label: "Registration number", type: "text", section: "Academic", half: true },
      { name: "skills", label: "Skills & techniques", type: "tags", section: "Academic" },
      { name: "email", label: "Email", type: "email", section: "Contact", half: true },
      { name: "phone", label: "Phone", type: "text", section: "Contact", half: true },
      { name: "whatsapp", label: "WhatsApp", type: "text", section: "Contact", half: true },
      { name: "bloodGroup", label: "Blood group", type: "select", options: [...BLOOD_GROUPS], section: "Contact", half: true },
      { name: "dateOfBirth", label: "Date of birth", type: "date", section: "Contact", half: true },
      { name: "address", label: "Present address", type: "textarea", section: "Contact" },
      { name: "emergencyContact", label: "Emergency contact", type: "text", section: "Contact" },
      {
        name: "links",
        label: "Profile links",
        type: "repeater",
        help: "Google Scholar, ORCID, ResearchGate, LinkedIn, personal site…",
        section: "Contact",
        subfields: [
          { name: "label", label: "Label", type: "text" },
          { name: "url", label: "URL", type: "url" },
        ],
      },
      { name: "researchAreas", label: "Research areas", type: "relations", relation: "research", section: "Contact" },
      { name: "joinYear", label: "Joined (year)", type: "number", section: "Alumni", half: true },
      { name: "graduationYear", label: "Graduated / left (year)", type: "number", section: "Alumni", half: true },
      { name: "isAlumni", label: "Alumni", type: "boolean", section: "Alumni" },
      {
        name: "status",
        label: "Membership status",
        type: "select",
        options: ["PENDING", "APPROVED", "REJECTED"],
        section: "Publishing",
        help: "Only approved members can use the member portal, chat and attendance.",
      },
      { name: "reviewNote", label: "Review note", type: "textarea", section: "Publishing", help: "Shown to the member if the request is rejected." },
      { name: "currentPosition", label: "Current position (alumni)", type: "text", section: "Alumni" },
      { ...published, section: "Alumni" },
    ],
  },
  {
    key: "member-categories",
    model: "memberCategory",
    label: "Member Groups",
    singular: "Member Group",
    icon: "Layers",
    description: "e.g. Faculty, PhD Students, Master's Students.",
    titleField: "name",
    group: "People",
    columns: [
      { name: "name", label: "Name" },
      { name: "slug", label: "Slug" },
    ],
    searchFields: ["name"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, half: true },
      { name: "slug", label: "Slug", type: "slug", from: "name", required: true, half: true },
    ],
  },
  {
    key: "opportunities",
    model: "opportunity",
    label: "Join Us",
    singular: "Opportunity",
    icon: "Sparkles",
    description: "Open positions, scholarships and admission info.",
    titleField: "title",
    group: "People",
    columns: [
      { name: "title", label: "Title" },
      { name: "type", label: "Type", type: "badge" },
      { name: "deadline", label: "Deadline", type: "date" },
      { name: "isOpen", label: "Open", type: "boolean" },
    ],
    searchFields: ["title", "summary"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, half: true },
      {
        name: "type",
        label: "Type",
        type: "select",
        half: true,
        options: ["PhD Student", "Master's Student", "Undergraduate", "Postdoc", "Research Staff", "Internship", "Scholarship", "Visiting Researcher"],
      },
      { name: "deadline", label: "Deadline", type: "date", half: true },
      { name: "applyUrl", label: "Apply link", type: "url", half: true },
      { name: "summary", label: "Summary", type: "textarea" },
      { name: "body", label: "Details", type: "richtext" },
      { name: "isOpen", label: "Currently open", type: "boolean" },
      published,
    ],
  },
  {
    key: "notices",
    model: "notice",
    label: "Notices",
    singular: "Notice",
    icon: "Megaphone",
    description: "Notices shown on the landing page and in the member portal.",
    titleField: "title",
    group: "Content",
    columns: [
      { name: "title", label: "Title" },
      { name: "level", label: "Level", type: "badge" },
      { name: "audience", label: "Audience", type: "badge" },
      { name: "publishAt", label: "Published", type: "date" },
      { name: "published", label: "Status", type: "boolean" },
    ],
    searchFields: ["title", "body"],
    orderBy: [{ pinned: "desc" }, { publishAt: "desc" }],
    publicPath: "/notices#:slug",
    fields: [
      { name: "title", label: "Title", type: "text", required: true },
      { name: "slug", label: "URL slug", type: "slug", from: "title", required: true, half: true },
      { name: "level", label: "Level", type: "select", options: ["info", "important", "urgent"], half: true },
      { name: "audience", label: "Who can see it", type: "select", options: ["PUBLIC", "MEMBERS"], half: true, help: "PUBLIC shows on the website; MEMBERS only inside the member portal." },
      { name: "publishAt", label: "Publish from", type: "datetime", half: true },
      { name: "expiresAt", label: "Hide after", type: "datetime", half: true },
      { name: "body", label: "Notice", type: "richtext", required: true },
      { name: "attachmentUrl", label: "Attachment", type: "file", half: true },
      { name: "pinned", label: "Pin to top", type: "boolean", section: "Publishing" },
      { ...published, section: "Publishing" },
    ],
  },
  {
    key: "home-sections",
    model: "homeSection",
    label: "Homepage",
    singular: "Homepage Section",
    icon: "LayoutDashboard",
    description: "Blocks that make up the homepage. Drag to reorder.",
    titleField: "title",
    group: "Site",
    columns: [
      { name: "type", label: "Block", type: "badge" },
      { name: "title", label: "Heading" },
      { name: "visible", label: "Visible", type: "boolean" },
    ],
    searchFields: ["title", "type"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "type", label: "Block type", type: "select", required: true, options: [...HOME_SECTION_TYPES], half: true },
      { name: "visible", label: "Visible", type: "boolean", half: true },
      { name: "content.eyebrow", label: "Eyebrow (small label above heading)", type: "text" },
      { name: "title", label: "Heading", type: "text" },
      { name: "subtitle", label: "Sub-heading", type: "textarea" },
      {
        name: "body",
        label: "Body text",
        type: "richtext",
        showIf: { field: "type", values: ["about", "cta", "custom"] },
      },
      {
        name: "content.slides",
        label: "Hero slides",
        type: "repeater",
        help: "Background images rotate automatically. Heading/subtitle per slide override the block heading.",
        showIf: { field: "type", values: ["hero"] },
        subfields: [
          { name: "image", label: "Image", type: "image" },
          { name: "title", label: "Heading", type: "text" },
          { name: "subtitle", label: "Subtitle", type: "text" },
        ],
      },
      {
        name: "content.image",
        label: "Image",
        type: "image",
        showIf: { field: "type", values: ["about", "cta", "custom"] },
      },
      {
        name: "content.highlights",
        label: "Highlights",
        type: "tags",
        help: "Short bullet points.",
        showIf: { field: "type", values: ["about"] },
      },
      {
        name: "content.stats",
        label: "Statistics",
        type: "repeater",
        help: "Use {members}, {publications}, {projects}, {partners}, {research} or {alumni} as the value for live counts.",
        showIf: { field: "type", values: ["stats"] },
        subfields: [
          { name: "value", label: "Value", type: "text", placeholder: "{publications} or 25+" },
          { name: "label", label: "Label", type: "text" },
        ],
      },
      {
        name: "content.limit",
        label: "Number of items",
        type: "number",
        showIf: { field: "type", values: ["research", "news", "publications", "members", "notices"] },
      },
      {
        name: "content.memberGroup",
        label: "Member group slug to show (blank = all)",
        type: "text",
        showIf: { field: "type", values: ["members"] },
      },
      {
        name: "content.primaryLabel",
        label: "Primary button label",
        type: "text",
        half: true,
        showIf: { field: "type", values: ["hero", "about", "cta", "research", "news", "publications", "members"] },
      },
      {
        name: "content.primaryHref",
        label: "Primary button link",
        type: "url",
        half: true,
        showIf: { field: "type", values: ["hero", "about", "cta", "research", "news", "publications", "members"] },
      },
      {
        name: "content.secondaryLabel",
        label: "Secondary button label",
        type: "text",
        half: true,
        showIf: { field: "type", values: ["hero", "cta"] },
      },
      {
        name: "content.secondaryHref",
        label: "Secondary button link",
        type: "url",
        half: true,
        showIf: { field: "type", values: ["hero", "cta"] },
      },
    ],
  },
  {
    key: "navigation",
    model: "navItem",
    label: "Navigation",
    singular: "Menu Item",
    icon: "Menu",
    description: "Header menu links. Drag to reorder; set a parent for dropdowns.",
    titleField: "label",
    group: "Site",
    columns: [
      { name: "label", label: "Label" },
      { name: "href", label: "Link" },
      { name: "parent", label: "Parent", type: "relation" },
      { name: "visible", label: "Visible", type: "boolean" },
    ],
    searchFields: ["label", "href"],
    orderBy: [{ order: "asc" }],
    orderable: true,
    fields: [
      { name: "label", label: "Label", type: "text", required: true, half: true },
      { name: "href", label: "Link", type: "url", required: true, placeholder: "/research or https://…", half: true },
      { name: "parent", label: "Parent item (for dropdowns)", type: "relation", relation: "navigation" },
      { name: "visible", label: "Visible", type: "boolean", half: true },
      { name: "newTab", label: "Open in new tab", type: "boolean", half: true },
    ],
  },
];

export function getResource(key: string) {
  return resources.find((r) => r.key === key);
}

// ─── Site settings form (singleton) ──────────────────────────────────────────

export const FONT_OPTIONS = [
  "Inter",
  "Plus Jakarta Sans",
  "Manrope",
  "DM Sans",
  "Poppins",
  "Source Serif 4",
  "Merriweather",
  "Playfair Display",
  "Lora",
];

export const settingsFields: Field[] = [
  { name: "labName", label: "Laboratory name", type: "text", required: true, section: "General" },
  { name: "shortName", label: "Short name / acronym", type: "text", required: true, section: "General", half: true },
  { name: "foundedYear", label: "Founded (year)", type: "number", section: "General", half: true },
  { name: "tagline", label: "Tagline", type: "text", section: "General" },
  { name: "description", label: "About the lab (short)", type: "textarea", section: "General" },
  { name: "faculty", label: "Faculty", type: "text", section: "General", half: true },
  { name: "department", label: "Department", type: "text", section: "General", half: true },
  { name: "university", label: "University / institution", type: "text", section: "General", half: true },
  { name: "universityUrl", label: "University website", type: "url", section: "General", half: true },

  { name: "logoUrl", label: "Logo", type: "image", section: "Branding", half: true, help: "SVG or PNG with transparent background." },
  { name: "logoDarkUrl", label: "Logo for dark backgrounds", type: "image", section: "Branding", half: true },
  { name: "faviconUrl", label: "Favicon", type: "image", section: "Branding", half: true },
  { name: "ogImageUrl", label: "Social share image", type: "image", section: "Branding", half: true, help: "1200×630 recommended." },
  { name: "primaryColor", label: "Primary colour", type: "color", section: "Branding", half: true },
  { name: "accentColor", label: "Accent colour", type: "color", section: "Branding", half: true },
  { name: "headingFont", label: "Heading font", type: "select", options: FONT_OPTIONS, section: "Branding", half: true },
  { name: "bodyFont", label: "Body font", type: "select", options: FONT_OPTIONS, section: "Branding", half: true },

  { name: "email", label: "Email", type: "email", section: "Contact", half: true },
  { name: "phone", label: "Phone", type: "text", section: "Contact", half: true },
  { name: "fax", label: "Fax", type: "text", section: "Contact", half: true },
  { name: "officeHours", label: "Office hours", type: "text", section: "Contact", half: true },
  { name: "address", label: "Address", type: "textarea", section: "Contact" },
  { name: "mapEmbedUrl", label: "Google Maps embed URL", type: "url", section: "Contact", help: "Google Maps → Share → Embed a map → copy only the src URL, or use https://www.google.com/maps?q=YOUR+ADDRESS&output=embed" },
  { name: "accessInfo", label: "Access / directions", type: "richtext", section: "Contact" },
  { name: "contactFormEnabled", label: "Enable contact form", type: "boolean", section: "Contact" },
  { name: "contactIntro", label: "Contact page intro", type: "textarea", section: "Contact" },
  { name: "inquiryTypes", label: "Inquiry types", type: "tags", section: "Contact", help: "Options in the contact form dropdown." },

  {
    name: "socials",
    label: "Social profiles",
    type: "repeater",
    section: "Footer & Social",
    help: "Platform: twitter, facebook, linkedin, youtube, instagram, github, researchgate, scholar, orcid or website.",
    subfields: [
      { name: "platform", label: "Platform", type: "text", placeholder: "linkedin" },
      { name: "url", label: "URL", type: "url" },
    ],
  },
  { name: "footerAbout", label: "Footer text", type: "textarea", section: "Footer & Social" },
  {
    name: "footerLinks",
    label: "Footer quick links",
    type: "repeater",
    section: "Footer & Social",
    subfields: [
      { name: "label", label: "Label", type: "text" },
      { name: "url", label: "URL", type: "text" },
    ],
  },
  { name: "copyright", label: "Copyright line", type: "text", section: "Footer & Social", help: "Leave blank for automatic “© year Lab name”." },

  { name: "announcementEnabled", label: "Show announcement bar", type: "boolean", section: "Announcement" },
  { name: "announcementText", label: "Announcement text", type: "text", section: "Announcement" },
  { name: "announcementUrl", label: "Announcement link", type: "url", section: "Announcement" },

  { name: "seoTitle", label: "Default page title", type: "text", section: "SEO" },
  { name: "seoDescription", label: "Meta description", type: "textarea", section: "SEO" },
  { name: "seoKeywords", label: "Keywords", type: "text", section: "SEO", help: "Comma separated." },

  { name: "labLat", label: "Lab latitude", type: "text", section: "Member area", half: true, help: "Used to check attendance location, e.g. 22.4590" },
  { name: "labLng", label: "Lab longitude", type: "text", section: "Member area", half: true, help: "e.g. 90.3560" },
  { name: "attendanceRadiusMeters", label: "Allowed distance (metres)", type: "number", section: "Member area", half: true },
  { name: "attendanceRequiresFence", label: "Require being near the lab", type: "boolean", section: "Member area", half: true, help: "If off, attendance is accepted from anywhere but the distance is still recorded." },
  { name: "memberSignupEnabled", label: "Allow member sign-up", type: "boolean", section: "Member area", half: true },
  { name: "appApkUrl", label: "Android app (APK) link", type: "url", section: "Member area", half: true },
  { name: "appVersion", label: "App version", type: "text", section: "Member area", half: true },
  { name: "memberSignupNote", label: "Note on the sign-up page", type: "textarea", section: "Member area" },

  { name: "showNotices", label: "Notices page", type: "boolean", section: "Features", half: true },
  { name: "showPublications", label: "Publications page", type: "boolean", section: "Features", half: true },
  { name: "showProjects", label: "Projects page", type: "boolean", section: "Features", half: true },
  { name: "showGallery", label: "Gallery page", type: "boolean", section: "Features", half: true },
  { name: "showEvents", label: "Events page", type: "boolean", section: "Features", half: true },
  { name: "showJoinUs", label: "Join Us page", type: "boolean", section: "Features", half: true },
  { name: "showAlumni", label: "Alumni on Members page", type: "boolean", section: "Features", half: true },
];
