import { Link } from "@tanstack/react-router";
import { CircleUserRound, LogIn } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function AccountButton() {
  const { session, loading } = useAuth();
  return (
    <Button asChild variant="ghost" size="sm" aria-label={session ? "Open profile" : "Sign in"}>
      <Link to="/account">
        {session ? <CircleUserRound /> : <LogIn />}
        <span>{loading ? "Profile" : session ? "Profile" : "Sign in"}</span>
      </Link>
    </Button>
  );
}