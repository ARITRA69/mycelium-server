import { error, success } from "@/types/response";

export async function login(req: Request): Promise<Response> {
  const { email, password } = (await req.json()) as {
    email: string;
    password: string;
  };

  if (!email || !password) {
    return error("Email and password are required", 400);
  }

  return success("Login successful", { email });
}
