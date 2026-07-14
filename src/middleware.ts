import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/achats") && role !== "RESPONSABLE_ACHATS") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/catalogue") && role !== "GESTIONNAIRE_STOCK") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/reception-livraison") && role !== "GESTIONNAIRE_STOCK") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (path.startsWith("/commandes-fournisseurs") && role !== "RESPONSABLE_ACHATS") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/catalogue/:path*",
    "/commandes-clients/:path*",
    "/commandes-fournisseurs/:path*",
    "/preparation-colis/:path*",
    "/reception-livraison/:path*",
    "/notifications/:path*",
    "/achats/:path*",
  ],
};
