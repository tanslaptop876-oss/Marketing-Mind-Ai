import { login, signup } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams;
  return <main className="auth"><div className="auth-card">
    <h1>MarketingMind <span style={{color:"var(--brand)"}}>AI</span></h1>
    <p className="muted">Your marketing command centre.</p>
    {params.error && <p className="alert">{params.error}</p>}
    {params.message && <p className="alert">{params.message}</p>}
    <form className="form">
      <label>Email<input name="email" type="email" required /></label>
      <label>Password<input name="password" type="password" minLength={8} required /></label>
      <button className="btn" formAction={login}>Sign in</button>
      <button className="btn secondary" formAction={signup}>Create free account</button>
    </form>
  </div></main>;
}
