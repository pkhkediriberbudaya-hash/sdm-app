import { verifySessionToken } from './auth';

export async function getPegawaiSession(req) {
  const token = req.cookies.get('pegawai_session')?.value;
  return verifySessionToken(token, process.env.SESSION_SECRET || 'dev-secret');
}
