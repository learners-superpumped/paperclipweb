import Link from "next/link";
import { Paperclip } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-secondary-200 py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <Paperclip className="h-5 w-5 text-primary" />
          <span className="font-bold text-secondary-800">paperclip</span>
        </Link>
        <p className="text-sm text-secondary-700">
          &copy; {new Date().getFullYear()} paperclip. Hire an AI team. Run a business on its own.
        </p>
      </div>
    </footer>
  );
}
