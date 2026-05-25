import { LoginForm } from "./LoginForm";

export const metadata = { title: "Anmelden – Booker App" };

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Booker App</h1>
        <p className="mt-1 text-sm text-slate-500">
          Melde dich mit deiner E-Mail-Adresse an.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
