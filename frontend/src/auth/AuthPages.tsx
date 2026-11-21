import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";

const emailSchema = z.string().trim().email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Use at least 8 characters.");

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-[72vh] max-w-lg items-center px-6 py-12">
      <section className="w-full rounded-3xl border border-border bg-white p-7 shadow-sm sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
          ShopSphere account
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        <div className="mt-7">{children}</div>
      </section>
    </main>
  );
}

function AuthConfigurationNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      Supabase is not configured. Add the project URL and publishable key to{" "}
      <code>frontend/.env.local</code>, then restart the frontend.
    </div>
  );
}

function FormError({ children }: { children: string }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

function TextField({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      <input
        {...props}
        className="h-11 rounded-xl border border-border bg-background px-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {error && <span className="font-normal text-red-700">{error}</span>}
    </label>
  );
}

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});
type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { signIn, configMissing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });
  const destination =
    (location.state as { from?: string } | null)?.from ?? "/account";

  async function submit(values: LoginValues) {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      navigate(destination, { replace: true });
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  return (
    <AuthCard title="Welcome back" description="Sign in to manage your ShopSphere account.">
      {configMissing ? (
        <AuthConfigurationNotice />
      ) : (
        <form className="grid gap-5" onSubmit={form.handleSubmit(submit)}>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            {...form.register("email")}
            error={form.formState.errors.email?.message}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            {...form.register("password")}
            error={form.formState.errors.password?.message}
          />
          {formError && <FormError>{formError}</FormError>}
          <div className="-mt-2 text-right">
            <Link className="text-sm font-medium text-primary hover:underline" to="/forgot-password">
              Forgot password?
            </Link>
          </div>
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            New to ShopSphere?{" "}
            <Link className="font-semibold text-primary hover:underline" to="/register">
              Create an account
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Enter your name.").max(120),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { signUp, configMissing } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const form = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function submit(values: RegisterValues) {
    setFormError(null);
    try {
      const signedIn = await signUp(values.email, values.password, values.fullName);
      setRegistrationMessage(
        signedIn
          ? "Your account is ready. You can continue to your account."
          : "Account created. Check your email to verify your address before signing in.",
      );
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  return (
    <AuthCard title="Create your account" description="A few details and you’re ready to shop.">
      {configMissing ? (
        <AuthConfigurationNotice />
      ) : registrationMessage ? (
        <div className="grid gap-4">
          <p role="status" className="rounded-xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
            {registrationMessage}
          </p>
          <Link className="text-sm font-semibold text-primary hover:underline" to="/account">
            Continue
          </Link>
        </div>
      ) : (
        <form className="grid gap-5" onSubmit={form.handleSubmit(submit)}>
          <TextField label="Full name" autoComplete="name" {...form.register("fullName")} error={form.formState.errors.fullName?.message} />
          <TextField label="Email" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          <TextField label="Password" type="password" autoComplete="new-password" {...form.register("password")} error={form.formState.errors.password?.message} />
          <TextField label="Confirm password" type="password" autoComplete="new-password" {...form.register("confirmPassword")} error={form.formState.errors.confirmPassword?.message} />
          {formError && <FormError>{formError}</FormError>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating account..." : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already registered?{" "}
            <Link className="font-semibold text-primary hover:underline" to="/login">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}

const resetRequestSchema = z.object({ email: emailSchema });
type ResetRequestValues = z.infer<typeof resetRequestSchema>;

export function ForgotPasswordPage() {
  const { requestPasswordReset, configMissing } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const form = useForm<ResetRequestValues>({ resolver: zodResolver(resetRequestSchema) });

  async function submit(values: ResetRequestValues) {
    setFormError(null);
    try {
      await requestPasswordReset(values.email);
      setSent(true);
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  return (
    <AuthCard title="Reset your password" description="We’ll send a secure reset link to your email.">
      {configMissing ? (
        <AuthConfigurationNotice />
      ) : sent ? (
        <p role="status" className="rounded-xl bg-secondary p-4 text-sm leading-6 text-secondary-foreground">
          If that address is registered, a password reset email is on its way.
        </p>
      ) : (
        <form className="grid gap-5" onSubmit={form.handleSubmit(submit)}>
          <TextField label="Email" type="email" autoComplete="email" {...form.register("email")} error={form.formState.errors.email?.message} />
          {formError && <FormError>{formError}</FormError>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
type NewPasswordValues = z.infer<typeof newPasswordSchema>;

export function ResetPasswordPage() {
  const { updatePassword, configMissing } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) });

  async function submit(values: NewPasswordValues) {
    setFormError(null);
    try {
      await updatePassword(values.password);
      navigate("/account", { replace: true });
    } catch (error) {
      setFormError(messageOf(error));
    }
  }

  return (
    <AuthCard title="Choose a new password" description="Your password must be at least eight characters.">
      {configMissing ? (
        <AuthConfigurationNotice />
      ) : (
        <form className="grid gap-5" onSubmit={form.handleSubmit(submit)}>
          <TextField label="New password" type="password" autoComplete="new-password" {...form.register("password")} error={form.formState.errors.password?.message} />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" {...form.register("confirmPassword")} error={form.formState.errors.confirmPassword?.message} />
          {formError && <FormError>{formError}</FormError>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            Update password
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
