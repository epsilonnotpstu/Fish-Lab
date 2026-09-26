// Single source of truth for member profile fields. Used by the public sign-up
// wizard, the member portal and the admin member form, so every path validates
// and renders exactly the same set.

import type { Field } from "./admin/resources";

export const PROGRAMS = [
  "BSc (Fisheries)",
  "MS",
  "PhD",
  "Research Assistant",
  "Lab Staff",
  "Faculty",
  "Intern",
  "Visiting Researcher",
] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const SEMESTERS = [
  "1st Semester", "2nd Semester", "3rd Semester", "4th Semester",
  "5th Semester", "6th Semester", "7th Semester", "8th Semester",
  "MS 1st Semester", "MS 2nd Semester", "MS 3rd Semester", "MS 4th Semester",
  "Thesis", "Not applicable",
] as const;

/** Academic details asked at sign-up and shown on the profile. */
export const academicFields: Field[] = [
  { name: "program", label: "Program / role", type: "select", options: [...PROGRAMS], required: true, half: true, section: "Academic" },
  { name: "session", label: "Session", type: "text", placeholder: "2021-22", half: true, section: "Academic" },
  { name: "semester", label: "Semester / year", type: "select", options: [...SEMESTERS], half: true, section: "Academic" },
  { name: "faculty", label: "Faculty", type: "text", placeholder: "Faculty of Fisheries", half: true, section: "Academic" },
  { name: "department", label: "Department", type: "text", placeholder: "Department of Fisheries Technology", half: true, section: "Academic" },
  { name: "studentId", label: "Student / employee ID", type: "text", half: true, section: "Academic" },
  { name: "registrationNo", label: "Registration number", type: "text", half: true, section: "Academic" },
  { name: "supervisor", label: "Supervisor", type: "relation", relation: "members", half: true, section: "Academic" },
];

/** Contact details — private, visible to the member and to staff only. */
export const contactFields: Field[] = [
  { name: "phone", label: "Phone", type: "text", required: true, half: true, section: "Contact" },
  { name: "whatsapp", label: "WhatsApp (if different)", type: "text", half: true, section: "Contact" },
  { name: "bloodGroup", label: "Blood group", type: "select", options: [...BLOOD_GROUPS], half: true, section: "Contact" },
  { name: "dateOfBirth", label: "Date of birth", type: "date", half: true, section: "Contact" },
  { name: "address", label: "Present address", type: "textarea", section: "Contact" },
  { name: "emergencyContact", label: "Emergency contact (name & phone)", type: "text", section: "Contact" },
];

/** Public-facing profile content the member writes about themselves. */
export const profileFields: Field[] = [
  { name: "photo", label: "Profile photo", type: "image", section: "Profile", help: "A clear head-and-shoulders photo works best." },
  { name: "bio", label: "About you", type: "richtext", section: "Profile" },
  { name: "researchInterests", label: "Research interests", type: "textarea", help: "Comma separated, e.g. fluorescence, microplastics", section: "Profile" },
  { name: "skills", label: "Skills & techniques", type: "tags", section: "Profile" },
  { name: "education", label: "Education", type: "textarea", help: "One line per degree.", section: "Profile" },
  {
    name: "links",
    label: "Profile links",
    type: "repeater",
    help: "Google Scholar, ORCID, ResearchGate, LinkedIn…",
    section: "Profile",
    subfields: [
      { name: "label", label: "Label", type: "text" },
      { name: "url", label: "URL", type: "url" },
    ],
  },
];

/** Everything a member fills in when applying (after the account step). */
export const applicationFields: Field[] = [...academicFields, ...contactFields, ...profileFields];

/** Fields a member may change themselves once approved. */
export const MEMBER_EDITABLE = new Set([
  ...profileFields.map((f) => f.name),
  ...contactFields.map((f) => f.name),
  "semester",
  "session",
]);

export const memberEditableFields: Field[] = applicationFields.filter((f) => MEMBER_EDITABLE.has(f.name));

/** Staff-managed fields, shown read-only in the portal. */
export const memberReadOnlyFields = academicFields.filter((f) => !MEMBER_EDITABLE.has(f.name));

/** Private columns that must never reach a public page or the search API. */
export const PRIVATE_MEMBER_FIELDS = [
  "studentId",
  "registrationNo",
  "phone",
  "whatsapp",
  "bloodGroup",
  "dateOfBirth",
  "address",
  "emergencyContact",
] as const;

/** Columns that are safe to expose publicly. */
export const publicMemberSelect = {
  id: true,
  slug: true,
  name: true,
  position: true,
  photo: true,
  email: true,
  bio: true,
  researchInterests: true,
  education: true,
  links: true,
  skills: true,
  program: true,
  session: true,
  semester: true,
  faculty: true,
  department: true,
  joinYear: true,
  graduationYear: true,
  currentPosition: true,
  isAlumni: true,
  order: true,
  published: true,
  status: true,
  categoryId: true,
  supervisorId: true,
  createdAt: true,
  updatedAt: true,
} as const;
