# Lab Website CMS

A premium, fully database-driven laboratory website with an admin panel. Nothing on the public site is hard-coded: lab name, logo, colours, fonts, menus, homepage blocks, research, people, news, publications, pages, footer and SEO all come from PostgreSQL and are edited in `/admin`. Point it at a new database, change the content, and it becomes a different lab's website.

The seed data is a fictional fisheries laboratory. Replace it from the admin panel.

## Features

**Public site:** homepage built from reorderable blocks (hero slider, live statistics, about, research, news, publications, team, partners, call to action, custom), research areas with equipment, team, publications and gallery, member directory grouped by role plus alumni and individual profiles, news with category, year and search filters and conference presentation lists, publications grouped by year with filters, abstracts and BibTeX copy, projects and grants, events (upcoming and past), photo gallery with lightbox, Join Us (openings), contact form with access info and map, custom pages at `/p/<slug>`, ⌘K site search, dark mode, share buttons, sitemap, robots, Open Graph and JSON-LD.

**Admin (`/admin`):** dashboard, messages inbox, create/edit/delete for every collection, drag-and-drop ordering, rich-text editor, Cloudinary drag-and-drop uploads, site settings (branding colours and fonts, contact, footer, SEO, announcement bar, feature toggles), users and roles, and an activity log.

**Member portal (`/account`):** lab members sign up and sign in with a 6-digit code sent to their email (no password). Once their account is linked to a member profile they can edit their own photo, bio, interests, education and links.

## Roles

| Role | Can do |
| --- | --- |
| Super admin | Everything, including settings, users and the activity log |
| Editor | All content (research, news, people, pages, homepage, navigation) |
| Member | Only their own linked profile, through the member portal |

Members register themselves. A new account is linked automatically to an unclaimed member profile with the same email address. Otherwise a super admin links it under **Users & Roles**. To make someone an editor, set a password for them first, then change their role.

## Security

- Sessions are server-side. The cookie holds a random token and the database stores only its SHA-256 hash. Cookies are httpOnly, Secure (in production) and SameSite=Lax.
- Passwords are hashed with bcrypt (cost 12) and must meet a strength policy. Temporary passwords must be changed at first sign-in.
- Login is rate-limited per IP. An account locks for 15 minutes after 5 failed attempts. Responses do not reveal whether an account exists.
- Optional 2-step login for staff: set `ADMIN_2FA=true` to require an emailed code after the password.
- Email codes are single-use, expire after 10 minutes, allow 5 attempts, are stored as an HMAC and are rate-limited per IP and per email.
- Every server action re-checks the session and role. Members can never reach admin actions.
- All input is validated with Zod on the server. Rich text is sanitised when saved and again when rendered.
- Security headers: a nonce-based Content Security Policy, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy and Permissions-Policy. `/admin` responses are `no-store` and `noindex`.
- Cloudinary uploads are signed on the server. The folder and allowed formats are part of the signature. Members can upload images only.
- The contact form uses a honeypot, a timing check and rate limits.
- An audit log records sign-ins and changes.

## Local development

Requirements: Node 20.9+ and PostgreSQL.

```bash
cp .env.example .env        # fill in DATABASE_URL, SESSION_SECRET, SEED_ADMIN_*
npm install
npm run db:migrate          # create tables
npm run db:seed             # demo content + first super admin
npm run dev                 # http://localhost:3000  (admin: /admin)
```

If `RESEND_API_KEY` is empty in development, email codes are printed to the server console instead of being sent.

`npm run db:seed -- --reset` wipes all content (not users) and loads the demo again.

## Deploy on Railway (recommended)

1. Push this folder to a GitHub repository.
2. In Railway, create a **New Project → Deploy from GitHub repo**, then add a **PostgreSQL** database to the project.
3. In the web service's **Variables**, add:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `SESSION_SECRET` = the output of `openssl rand -base64 48`
   - `SITE_URL` = your public URL, e.g. `https://your-lab.up.railway.app`
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME`
   - `RESEND_API_KEY`, `MAIL_FROM` (see Email below)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
4. Deploy. `railway.json` runs migrations and the idempotent seed on each start, then starts the app.
5. Open `/admin`, sign in with the seed admin, and set a new password.
6. Under **Settings → Networking**, generate a domain or attach your own.

Vercel also works. Use a hosted Postgres such as Neon, set the same variables, and run `npm run db:migrate && npm run db:seed` once from your machine against that database.

## Email

Priority order: Gmail relay (`MAIL_WEBHOOK_*`), then SMTP (`SMTP_*`), then Resend.

**Railway (SMTP is blocked on Free/Hobby plans): Gmail relay.** Open https://script.google.com while signed in to the sending Gmail account, create a project, paste `scripts/gmail-relay.gs`, and set `SECRET` to the same value as `MAIL_WEBHOOK_SECRET`. Then go to **Deploy → New deployment → Web app**, set **Execute as: Me** and **Who has access: Anyone**, deploy, and authorise. Put the web app URL in `MAIL_WEBHOOK_URL`. Consumer Gmail accounts can send about 100 emails a day this way.

**Gmail SMTP (hosts that allow SMTP).** Turn on 2-Step Verification for the Gmail account, create an App Password at https://myaccount.google.com/apppasswords, then set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=<gmail address>`, `SMTP_PASS=<16-character app password>` and `MAIL_FROM="Lab Name <gmail address>"`. When these are set, SMTP is used instead of Resend. Gmail allows about 500 emails a day.

**Resend.** The sender `onboarding@resend.dev` only delivers to the email address that owns the Resend account. Before real members can receive codes:

1. In Resend, go to **Domains → Add domain** (for example `lab.your-university.edu`) and add the DNS records it shows.
2. Set `MAIL_FROM="Lab Name <no-reply@lab.your-university.edu>"`.

## Images (Cloudinary)

Create a free Cloudinary account and copy the cloud name, API key and API secret from the dashboard into the environment variables. Until then, admins can paste image URLs instead of uploading.

## Reusing for another lab

1. Deploy with a fresh database. Optionally skip the demo content by running only the admin part of the seed, or run the seed and delete the demo items.
2. In **Site Settings**, set the name, logo, colours, fonts, contact details, footer and SEO.
3. Build the homepage under **Homepage**, the menu under **Navigation**, then add research, members and news.
4. Turn off unused sections (Projects, Gallery, Events, Join Us, Publications) under **Settings → Features**.

## Project structure

```
prisma/schema.prisma          data model (every public field lives here)
prisma/seed.ts                demo content + first admin
src/proxy.ts                  CSP nonce, admin gate
src/lib/admin/resources.ts    declarative admin config (fields, lists, validation)
src/lib/admin/resource-server.ts  generic validation / persistence
src/actions/*                 server actions (CRUD, auth, users, contact, members)
src/app/(site)/*              public pages
src/app/admin/*               admin panel
src/components/site|admin/*   UI components
```

To add a field, add a column to `schema.prisma`, create a migration, add one line to the resource's `fields` in `resources.ts`, and render it on the public page.
