import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role;
    const path = req.nextUrl.pathname;

    // /catalogue/* and /commandes-fournisseurs are read-only accessible to
    // all authenticated roles per the design spec's role matrix
    // (RESPONSABLE_ACHATS reads the catalogue, GESTIONNAIRE_STOCK reads
    // purchase order history). Mutations on these routes are gated
    // server-side in the corresponding actions (createProduct/updateProduct,
    // validatePurchaseOrder/rejectPurchaseOrder/emitPurchaseOrder).
    if (path.startsWith("/reception-livraison") && role !== "GESTIONNAIRE_STOCK") {
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
  ],
};
