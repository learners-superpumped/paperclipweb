import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Paperclip, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 mb-8">
          <Paperclip className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-secondary-800">paperclipweb</span>
        </div>
        <h1 className="text-6xl font-bold text-secondary-800 mb-4">404</h1>
        <p className="text-lg text-secondary-500 mb-8">
          Page not found. The page you are looking for does not exist.
        </p>
        <Link href="/">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Button>
        </Link>
      </div>
    </div>
  );
}
