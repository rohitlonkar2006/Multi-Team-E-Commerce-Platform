import { Link } from "react-router-dom";

function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">ShopSphere information</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">Academic demo · Reviewed {updated}</p>
      <div className="mt-8 grid gap-6 text-sm leading-7 text-muted-foreground">{children}</div>
      <Link to="/" className="mt-8 inline-block text-sm font-semibold text-primary hover:underline">
        Return to ShopSphere
      </Link>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice" updated="November 2026">
      <section>
        <h2 className="font-semibold text-foreground">Data used by this demonstration</h2>
        <p>
          ShopSphere stores account and profile information, saved addresses, cart and order records,
          wishlist items, and newsletter email subscriptions in the configured Supabase project.
          Delivery-partner accounts also store a service zone and license-review state. Partners may
          upload a driving-license image or PDF for administrator review; the file is private and
          review links expire. Delivery partners receive the contact and address details for orders
          assigned to them. The application does not collect continuous GPS location.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Use and protection</h2>
        <p>
          Protected API requests use the signed-in user&apos;s access token, role checks, and database
          Row Level Security policies. Private license files are handled by the backend and are not
          exposed through public storage URLs. Newsletter subscriptions are stored only after the
          visitor confirms consent. No newsletter email delivery provider is configured.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Payments and support</h2>
        <p>
          Payment actions are academic simulations and do not collect real card, UPI, or banking
          details. This is a student project; contact the project team or course staff for questions
          about demo data or account removal.
        </p>
      </section>
      <p className="rounded-xl bg-secondary/70 p-4 text-secondary-foreground">
        This notice is for the academic demonstration and is not legal advice.
      </p>
    </LegalPage>
  );
}

export function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="November 2026">
      <section>
        <h2 className="font-semibold text-foreground">Academic demonstration</h2>
        <p>
          ShopSphere is an educational e-commerce application, not a live retail or payment service.
          Product records and prices are sample catalogue data unless otherwise stated.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Payments</h2>
        <p>
          Simulated UPI and card outcomes are not financial transactions. Never enter real card,
          CVV, UPI PIN, or banking credentials. Cash-on-delivery entries are also demonstration
          records and delivery status updates do not create or track a real shipment.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-foreground">Availability</h2>
        <p>
          Products and application features may change while the project is under development.
          Stock checks and orders are database-backed only after the corresponding Supabase
          migrations have been applied.
        </p>
      </section>
    </LegalPage>
  );
}
