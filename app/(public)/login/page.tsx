import type { Metadata } from "next";
import { LoginForm } from "./_components/LoginForm";

export const metadata: Metadata = {
  title: "Student Login | English4You",
  description:
    "Sign in to your English4You account to access your live classes, AI practice exercises, and vocabulary decks.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-background">
      <LoginForm />
    </div>
  );
}
