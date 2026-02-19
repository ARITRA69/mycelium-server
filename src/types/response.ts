import type { Response } from "express";

export type ApiResponse<T = undefined> = {
  message: string;
  data?: T;
};

export function success<T>(res: Response, message: string, data?: T, status = 200): void {
  const body: ApiResponse<T> = { message };
  if (data !== undefined) body.data = data;
  res.status(status).json(body);
}

export function error(res: Response, message: string, status = 400): void {
  const body: ApiResponse = { message };
  res.status(status).json(body);
}
