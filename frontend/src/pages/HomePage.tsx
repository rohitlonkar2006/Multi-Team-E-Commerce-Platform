import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Circle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type HealthResponse = {
  status: string;
  service: string;
  supabaseConfigured: boolean;
};

const apiUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000").replace(
  /\/$/,
  "",
);

async function getApiHealth(): Promise<HealthResponse> {
  const response = await fetch(`${apiUrl}/api/health`);
  if (!response.ok) {
    throw new Error(`API returned ${response.status}`);
  }
  return response.json() as Promise<HealthResponse>;
}

export function HomePage() {
  const health = useQuery({
    queryKey: ["api-health"],
    queryFn: getApiHealth,
    retry: 1,
    refetchInterval: 15_000,
  });

  const apiOnline = health.data?.status === "ok";
  const supabaseConfigured = health.data?.supabaseConfigured === true;

  return (
    <main className="min-h-screen">
      <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10 lg:pb-24 lg:pt-20">
        <div>
          <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <span className="size-2 rounded-full bg-primary" />
            A better way to shop
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-[1.06] tracking-[-0.055em] text-foreground sm:text-6xl lg:text-7xl">
            Good things,
            <br />
            <span className="font-serif font-normal italic text-primary">
              all in one place.
            </span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
            Find thoughtful picks for your home, work, and everyday. Browse the
            current catalogue and discover something useful.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link to="/shop">
                Explore the shop <ArrowRight size={17} />
              </Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Thoughtful picks, live catalogue
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute -right-4 -top-5 size-28 rounded-full bg-secondary/70 blur-2xl" />
          <div className="absolute -bottom-5 -left-4 size-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-[0_30px_90px_-40px_rgba(27,52,38,0.28)] backdrop-blur sm:p-7">
            <div className="flex items-center justify-between border-b border-border/80 pb-5">
              <div>
                <p className="text-sm font-semibold">Built as one team</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Four modules · Shared foundation
                </p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                In progress
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-5">
              {[
                ["01", "User management", "Identity & access"],
                ["02", "Products", "Catalogue & inventory"],
                ["03", "Cart & payment", "Checkout workflow"],
                ["04", "Orders & delivery", "Fulfilment status"],
              ].map(([number, title, description]) => (
                <div
                  key={number}
                  className="rounded-2xl bg-background p-4 sm:p-5"
                >
                  <span className="text-xs font-medium text-primary">
                    {number}
                  </span>
                  <p className="mt-4 text-sm font-semibold">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
            <Link
              to="/shop"
              className="mt-4 flex items-center justify-between rounded-2xl bg-primary px-5 py-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Browse the collection
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section
        id="foundation"
        className="border-y border-border/80 bg-white/50"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 lg:grid-cols-[0.7fr_1.3fr] lg:px-10 lg:py-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Platform foundation
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              The groundwork is in place.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
              The Node.js API reports its real runtime status below. Supabase is
              marked configured only when both public connection settings are
              supplied.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatusCard
              label="Node.js API"
              detail={
                health.isPending
                  ? "Checking connection"
                  : apiOnline
                    ? "Connected"
                    : "Unavailable"
              }
              ready={apiOnline}
              loading={health.isPending}
              onRetry={() => void health.refetch()}
            />
            <StatusCard
              label="Supabase"
              detail={
                apiOnline
                  ? supabaseConfigured
                    ? "Credentials configured"
                    : "Add local credentials"
                  : "Waiting for API"
              }
              ready={apiOnline && supabaseConfigured}
            />
            <StatusCard
              label="Frontend"
              detail="React · Vite · TypeScript"
              ready
            />
          </div>
        </div>
      </section>

    </main>
  );
}

type StatusCardProps = {
  label: string;
  detail: string;
  ready?: boolean;
  loading?: boolean;
  onRetry?: () => void;
};

function StatusCard({
  label,
  detail,
  ready = false,
  loading = false,
  onRetry,
}: StatusCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="flex items-center gap-2">
        {ready ? (
          <Check size={15} className="text-primary" />
        ) : (
          <Circle
            size={14}
            className={loading ? "animate-pulse text-muted-foreground" : "text-muted-foreground"}
          />
        )}
        <p className="text-sm font-semibold">{label}</p>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{detail}</p>
      {!ready && !loading && onRetry && (
        <button
          type="button"
          className="mt-3 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          onClick={onRetry}
        >
          Retry connection
        </button>
      )}
    </div>
  );
}
