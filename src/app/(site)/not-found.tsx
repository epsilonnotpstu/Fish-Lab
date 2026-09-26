import Link from "next/link";
import { ArrowLeft, Fish } from "lucide-react";
import { Wave } from "@/components/site/page-header";

export default function NotFound() {
  return (
    <section className="bg-ocean relative isolate flex min-h-[80vh] items-center overflow-hidden pt-24 text-white">
      <div className="bg-grid absolute inset-0 -z-10 text-white opacity-30" />
      <div className="container-page text-center">
        <Fish className="mx-auto size-14 animate-float text-brand-accent" />
        <p className="mt-6 font-heading text-8xl font-extrabold text-white/15 sm:text-9xl">404</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">This page swam away</h1>
        <p className="mx-auto mt-4 max-w-md text-white/70">The page you are looking for does not exist or has been moved.</p>
        <Link href="/" className="mt-10 inline-flex items-center gap-2 rounded-full bg-brand-accent px-7 py-3.5 text-sm font-semibold text-accent-fg">
          <ArrowLeft className="size-4" /> Back to home
        </Link>
      </div>
      <Wave />
    </section>
  );
}
