import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api";

type Address = {
  id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  region: string;
  postal_code: string;
  country: string;
  is_default: boolean;
};

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name.").max(120),
});
type ProfileValues = z.infer<typeof profileSchema>;

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipientName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(30),
  addressLine1: z.string().trim().min(1).max(160),
  addressLine2: z.string().trim().max(160),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()),
});
type AddressValues = z.infer<typeof addressSchema>;

function ErrorNotice({ message }: { message: string }) {
  return <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>;
}

function AccountField({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <input
        {...props}
        className="h-10 rounded-xl border border-border bg-background px-3 font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
    </label>
  );
}

export function AccountPage() {
  const { session, account, refreshAccount } = useAuth();
  const queryClient = useQueryClient();
  const token = session?.access_token;
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    values: { fullName: account?.profile?.full_name ?? "" },
  });
  const addressForm = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      country: "IN",
      phone: "",
      addressLine2: "",
    },
  });
  const resetAddressForm = addressForm.reset;

  useEffect(() => {
    if (!editingAddress) {
      resetAddressForm({ country: "IN", phone: "", addressLine2: "" });
      return;
    }

    resetAddressForm({
      label: editingAddress.label,
      recipientName: editingAddress.recipient_name,
      phone: editingAddress.phone,
      addressLine1: editingAddress.address_line_1,
      addressLine2: editingAddress.address_line_2,
      city: editingAddress.city,
      region: editingAddress.region,
      postalCode: editingAddress.postal_code,
      country: editingAddress.country,
    });
  }, [editingAddress, resetAddressForm]);

  const addressesQuery = useQuery({
    queryKey: ["addresses", session?.user.id],
    queryFn: () => apiRequest<{ addresses: Address[] }>("/users/addresses", token),
    enabled: Boolean(token),
  });

  const saveProfile = useMutation({
    mutationFn: (values: ProfileValues) =>
      apiRequest("/users/profile", token, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: refreshAccount,
  });

  const saveAddress = useMutation({
    mutationFn: (values: AddressValues) =>
      apiRequest(
        editingAddress ? `/users/addresses/${editingAddress.id}` : "/users/addresses",
        token,
        {
          method: editingAddress ? "PATCH" : "POST",
          body: JSON.stringify(values),
        },
      ),
    onSuccess: async () => {
      setEditingAddress(null);
      resetAddressForm({ country: "IN", phone: "", addressLine2: "" });
      await queryClient.invalidateQueries({ queryKey: ["addresses", session?.user.id] });
    },
  });

  const addressAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "default" | "delete" }) =>
      apiRequest(
        `/users/addresses/${id}${action === "default" ? "/default" : ""}`,
        token,
        { method: action === "default" ? "PATCH" : "DELETE" },
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["addresses", session?.user.id] }),
  });

  const mutationError = [saveProfile.error, addressAction.error].find(
    (error): error is Error => error instanceof Error,
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">Your account</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Profile & addresses</h1>
      <p className="mt-2 text-sm text-muted-foreground">{account?.user.email}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="h-fit rounded-2xl border border-border bg-white p-6">
          <h2 className="text-lg font-semibold">Profile</h2>
          <form
            className="mt-5 grid gap-4"
            onSubmit={profileForm.handleSubmit((values) => saveProfile.mutate(values))}
          >
            <AccountField label="Full name" autoComplete="name" {...profileForm.register("fullName")} />
            {profileForm.formState.errors.fullName && (
              <p className="-mt-2 text-xs text-red-700">{profileForm.formState.errors.fullName.message}</p>
            )}
            <Button type="submit" disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving..." : "Save profile"}
            </Button>
          </form>
        </section>

        <section className="rounded-2xl border border-border bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Saved addresses</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage delivery addresses for checkout.</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {addressesQuery.data?.addresses.length ?? 0}
            </span>
          </div>

          {addressesQuery.isPending ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading addresses...</p>
          ) : addressesQuery.error instanceof Error ? (
            <div className="mt-5"><ErrorNotice message={addressesQuery.error.message} /></div>
          ) : addressesQuery.data?.addresses.length ? (
            <div className="mt-5 grid gap-3">
              {addressesQuery.data.addresses.map((address) => (
                <article key={address.id} className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{address.label}</p>
                      <p className="mt-1 text-sm">{address.recipient_name}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {address.address_line_1}{address.address_line_2 ? `, ${address.address_line_2}` : ""}
                        <br />
                        {address.city}, {address.region} {address.postal_code}, {address.country}
                      </p>
                    </div>
                    {address.is_default && (
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAddress(address)}
                    >
                      Edit
                    </Button>
                    {!address.is_default && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={addressAction.isPending}
                        onClick={() => addressAction.mutate({ id: address.id, action: "default" })}
                      >
                        Set as default
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={addressAction.isPending}
                      onClick={() => addressAction.mutate({ id: address.id, action: "delete" })}
                    >
                      Remove
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-xl bg-background p-4 text-sm text-muted-foreground">
              No saved addresses yet.
            </p>
          )}

          <form className="mt-6 grid gap-4 border-t border-border pt-6 sm:grid-cols-2" onSubmit={addressForm.handleSubmit((values) => saveAddress.mutate(values))}>
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <h3 className="text-sm font-semibold">{editingAddress ? "Edit address" : "Add an address"}</h3>
              {editingAddress && (
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingAddress(null)}>
                  Cancel
                </Button>
              )}
            </div>
            <AccountField label="Label" placeholder="Home" {...addressForm.register("label")} />
            <AccountField label="Recipient" autoComplete="name" {...addressForm.register("recipientName")} />
            <AccountField label="Phone" autoComplete="tel" {...addressForm.register("phone")} />
            <AccountField label="Country code" maxLength={2} {...addressForm.register("country")} />
            <AccountField label="Address line 1" autoComplete="address-line1" {...addressForm.register("addressLine1")} />
            <AccountField label="Address line 2" autoComplete="address-line2" {...addressForm.register("addressLine2")} />
            <AccountField label="City" autoComplete="address-level2" {...addressForm.register("city")} />
            <AccountField label="State / region" autoComplete="address-level1" {...addressForm.register("region")} />
            <AccountField label="Postal code" autoComplete="postal-code" {...addressForm.register("postalCode")} />
            <div className="sm:col-span-2">
              {Object.keys(addressForm.formState.errors).length > 0 && (
                <p className="text-sm text-red-700">Complete each required address field with a valid value.</p>
              )}
              {saveAddress.error instanceof Error && <ErrorNotice message={saveAddress.error.message} />}
              <Button type="submit" className="mt-2" disabled={saveAddress.isPending}>
                {saveAddress.isPending ? "Saving..." : editingAddress ? "Save address" : "Add address"}
              </Button>
            </div>
          </form>
          {mutationError && (
            <div className="mt-4"><ErrorNotice message={mutationError.message} /></div>
          )}
        </section>
      </div>
    </main>
  );
}
