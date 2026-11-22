import type { User } from "@supabase/supabase-js";
import { getServiceRoleClient } from "../lib/supabase.js";

const adminEmail = "lonkarravi00@gmail.com";
const previousAdminEmail = "lonkarrohit77@gmail.com";

async function findAdminAccount(
  client: ReturnType<typeof getServiceRoleClient>,
  email: string,
) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) {
      throw new Error(`Could not check whether ${email} already exists: ${error.message}`);
    }

    const existing = data.users.find(
      (user) => user.email?.toLowerCase() === email,
    );
    if (existing) return existing;
    if (data.users.length < 1000) return null;
  }
}

async function readPassword(prompt: string): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY) {
    throw new Error("Run this command in an interactive terminal to enter the password securely.");
  }

  process.stdout.write(prompt);
  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw;
    let password = "";

    function finish(error?: Error) {
      input.off("data", onData);
      input.setRawMode(wasRaw ?? false);
      input.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    }

    function onData(chunk: Buffer) {
      for (const character of chunk.toString("utf8")) {
        if (character === "\u0003") {
          finish(new Error("Password entry cancelled."));
          return;
        }
        if (character === "\r" || character === "\n") {
          finish();
          return;
        }
        if (character === "\u007f" || character === "\b") {
          password = password.slice(0, -1);
        } else if (character >= " ") {
          password += character;
        }
      }
    }

    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function provisionAdmin() {
  const client = getServiceRoleClient();
  const password = await readPassword("Enter the admin password (input hidden): ");
  if (password.length < 8) {
    throw new Error("The password must contain at least 8 characters.");
  }
  const confirmation = await readPassword("Confirm the password: ");
  if (password !== confirmation) {
    throw new Error("The passwords do not match.");
  }

  const existingUser =
    (await findAdminAccount(client, adminEmail)) ??
    (await findAdminAccount(client, previousAdminEmail));
  let user: User;
  if (existingUser) {
    const { data, error } = await client.auth.admin.updateUserById(existingUser.id, {
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "ShopSphere Admin" },
    });
    if (error) {
      throw new Error(`Could not update the administrator account: ${error.message}`);
    }
    user = data.user;
  } else {
    const { data, error } = await client.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: "ShopSphere Admin" },
    });
    if (error) {
      throw new Error(`Could not create ${adminEmail}: ${error.message}`);
    }
    user = data.user;
  }

  const { error: roleError } = await client
    .from("user_roles")
    .upsert(
      { user_id: user.id, role: "admin" },
      { onConflict: "user_id,role", ignoreDuplicates: true },
    );
  if (roleError) {
    throw new Error(
      `The account was created or updated, but administrator access could not be assigned: ${roleError.message}. Grant the admin role in the Supabase SQL Editor.`,
    );
  }

  process.stdout.write(`Administrator account ready for ${adminEmail}. Sign in at /admin/login.\n`);
}

provisionAdmin().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Admin provisioning failed."}\n`,
  );
  process.exitCode = 1;
});
