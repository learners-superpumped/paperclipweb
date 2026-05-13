export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: ["/account", "/account/:path*", "/dashboard/:path*"],
};
