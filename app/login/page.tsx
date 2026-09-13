import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-10">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold">TaskFlow SaaS</h1>

        <p className="mt-2 text-gray-600">Sign in to your account</p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            {message}
          </p>
        )}

        <form className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border px-3 py-2"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              minLength={6}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              formAction={login}
              className="flex-1 rounded-lg bg-black px-4 py-2 text-white"
            >
              Sign in
            </button>

            <button
              formAction={signup}
              className="flex-1 rounded-lg border px-4 py-2"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
