declare global {
  namespace Express {
    export interface Request {
      user: {
        id: string;
        email: string;
        created_at: Date;
      };
    }
  }
}

export {};
