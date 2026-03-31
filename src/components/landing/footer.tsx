import Link from "next/link";
import { Paperclip } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-secondary-200 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <Paperclip className="h-5 w-5 text-primary" />
              <span className="font-bold text-secondary-800">paperclipweb</span>
            </Link>
            <p className="mt-3 text-sm text-secondary-400 leading-relaxed">
              One bill. One click.
              <br />
              Your AI company.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-secondary-700 mb-4">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#features"
                  className="text-sm text-secondary-400 hover:text-secondary-700 transition-colors duration-200 cursor-pointer"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#pricing"
                  className="text-sm text-secondary-400 hover:text-secondary-700 transition-colors duration-200 cursor-pointer"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-secondary-400 hover:text-secondary-700 transition-colors duration-200 cursor-pointer"
                >
                  Documentation
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-secondary-700 mb-4">
              Company
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://github.com/learners-superpumped/paperclipweb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-secondary-400 hover:text-secondary-700 transition-colors duration-200 cursor-pointer"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-secondary-400 hover:text-secondary-700 transition-colors duration-200 cursor-pointer"
                >
                  Blog
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-secondary-700 mb-4">
              Legal
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  className="text-sm text-secondary-400 hover:text-secondary-700 transition-colors duration-200 cursor-pointer"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-sm text-secondary-400 hover:text-secondary-700 transition-colors duration-200 cursor-pointer"
                >
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-secondary-100 text-center text-sm text-secondary-400">
          &copy; {new Date().getFullYear()} paperclipweb. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
