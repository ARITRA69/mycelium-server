export type ApiResponse<T = undefined> = {
  message: string;
  data?: T;
};

export function success<T>(message: string, data?: T, status = 200): Response {
  const body: ApiResponse<T> = { message };
  if (data !== undefined) body.data = data;
  return Response.json(body, { status });
}

export function error(message: string, status = 400): Response {
  const body: ApiResponse = { message };
  return Response.json(body, { status });
}
