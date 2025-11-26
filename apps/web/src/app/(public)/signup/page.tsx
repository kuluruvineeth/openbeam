import Link from "next/link";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata = {
  title: "Sign Up | OpenPlane",
};

export default function SignupPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Form */}
      <div className="flex w-1/2 flex-col justify-center px-16">
        <div className="mx-auto w-full max-w-md">
          <Link className="mb-8 flex items-center gap-2" href="/">
            <Icons.Logo size={32} />
            <span className="font-f37-stout text-xl">OpenPlane</span>
          </Link>

          <h1 className="mb-2 font-f37-stout text-2xl">Create your account</h1>
          <p className="mb-8 text-muted-foreground">
            Get started with your free trial. No credit card required.
          </p>

          <form>
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block font-medium text-foreground text-sm">
                  First Name
                </label>
                <Input placeholder="John" />
              </div>
              <div>
                <label className="mb-2 block font-medium text-foreground text-sm">
                  Last Name
                </label>
                <Input placeholder="Doe" />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-2 block font-medium text-foreground text-sm">
                Work Email
              </label>
              <Input placeholder="john@company.com" type="email" />
            </div>

            <div className="mb-6">
              <label className="mb-2 block font-medium text-foreground text-sm">
                Password
              </label>
              <Input placeholder="••••••••" type="password" />
              <p className="mt-2 text-muted-foreground text-xs">
                Must be at least 8 characters
              </p>
            </div>

            <Button className="mb-4 w-full" size="lg" type="submit">
              Create Account
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-border border-t" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-4 text-muted-foreground text-sm">
                Or continue with
              </span>
            </div>
          </div>

          <Button className="w-full" variant="outline">
            <Icons.Google className="mr-2" />
            Sign up with Google
          </Button>

          <p className="mt-6 text-center text-muted-foreground text-sm">
            Already have an account?{" "}
            <Link className="text-primary hover:underline" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Brand */}
      <div className="flex w-1/2 items-center justify-center bg-primary/5">
        <div className="max-w-md text-center">
          <Icons.Sparkle className="mx-auto mb-6 text-primary" size={48} />
          <h2 className="mb-4 font-f37-stout text-2xl">
            Enterprise Knowledge Search
          </h2>
          <p className="text-muted-foreground">
            Connect all your apps and find anything instantly with AI-powered
            search. Join thousands of teams already using OpenPlane.
          </p>
        </div>
      </div>
    </div>
  );
}
