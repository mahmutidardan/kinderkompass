import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
const username = process.env.TEST_ACCOUNT_USERNAME;
const password = process.env.TEST_ACCOUNT_PASSWORD;

if (!supabaseUrl || !supabaseSecretKey || !username || !password) {
  throw new Error('SUPABASE_URL, SUPABASE_SECRET_KEY, TEST_ACCOUNT_USERNAME und TEST_ACCOUNT_PASSWORD müssen gesetzt sein.');
}

const normalizedUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
if (!normalizedUsername) throw new Error('Der Benutzername ist ungültig.');

const email = `${normalizedUsername}@preview.fieberwache.invalid`;
const admin = createClient(supabaseUrl, supabaseSecretKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const { data: usersPage, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listError) throw listError;

const existing = usersPage.users.find((user) => user.email === email);
if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { name: username, account_type: 'public-preview' },
  });
  if (error) throw error;
  console.log(`Testkonto ${username} wurde aktualisiert.`);
} else {
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: username, account_type: 'public-preview' },
  });
  if (error) throw error;
  console.log(`Testkonto ${username} wurde erstellt.`);
}
