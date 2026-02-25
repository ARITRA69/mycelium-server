import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

import { env } from '@/constants/env';

const get_firebase_auth = (): Auth => {
  if (getApps().length === 0) {
    initializeApp({ credential: cert(env.firebase_config_path) });
  }
  return getAuth();
};

const firebase_auth = get_firebase_auth();

export { firebase_auth };
