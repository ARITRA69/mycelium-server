import { success } from "@/types/response";

export async function get_users(req: Request): Promise<Response> {
  const users = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
  ];

  return success("Users fetched successfully", { users });
}
