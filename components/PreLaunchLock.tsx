import { logoutAction } from "@/app/actions";

export default function PreLaunchLock({
  counter,
  showCounter,
}: {
  counter: number;
  showCounter: boolean;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <span className="mb-8 flex items-center justify-center gap-2 text-xl font-bold text-text">
          <span>🕳️</span> UNDR
        </span>

        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-2xl">
          🔒
        </span>

        <h1 className="text-2xl font-bold text-text">You&apos;re in. Almost.</h1>
        <p className="mt-2 text-sm text-text-dim">UNDR hasn&apos;t opened yet.</p>
        <p className="mt-4 text-sm text-text-faint">
          You&apos;re registered and ready to go — but the doors are still closed. Nobody gets in until
          launch. Sit tight. 👀
        </p>

        {showCounter && (
          <p className="mt-4 text-sm font-semibold text-accent-2 tabular">
            {counter.toLocaleString()} people are getting ready for UNDR.
          </p>
        )}

        <p className="mt-6 text-xs text-text-faint">We&apos;ll let you know the moment it&apos;s time.</p>

        <form action={logoutAction} className="mt-8">
          <button
            type="submit"
            className="text-sm font-semibold text-text-faint underline-offset-2 hover:text-text hover:underline"
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
