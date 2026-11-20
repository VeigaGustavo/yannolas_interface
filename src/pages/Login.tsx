import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { useSession } from "../stores/session";
import { tenantList } from "../tenants";

export default function Login() {
  const { tenantId, login } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  if (tenantId) return <Navigate to="/" replace />;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    queryClient.clear();
    if (login(email, password)) navigate("/", { replace: true });
    else setError("E-mail ou senha incorretos.");
  };
  return (
    <main className="login">
      <form className="login-card" onSubmit={submit} noValidate>
        <div>
          <small className="login-kicker">PAINEL DO ESTÚDIO</small>
          <h1>Entrar</h1>
        </div>
        <label className="field">
          E-mail
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="field">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <Button variant="default" type="submit">
          Entrar
        </Button>
        <p className="login-note">
          Protótipo: os dados ficam neste navegador e o login não é seguro.
        </p>
        <div className="login-demo">
          <strong>Contas de demonstração</strong>
          {tenantList.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => {
                setEmail(t.email);
                setPassword(t.password);
              }}
            >
              <span>{t.name}</span>
              <small>
                {t.email} · {t.password}
              </small>
            </button>
          ))}
        </div>
      </form>
    </main>
  );
}
