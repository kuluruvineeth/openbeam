import Image from "next/image";
import Link from "next/link";
import { GoogleSignIn } from "@/components/google-sign-in";
import { Icons } from "@/components/icons";

export default async function Page() {
  return (
    <div className="h-screen p-2">
      <header className="absolute top-0 left-0 z-30 w-full">
        <div className="p-6 md:p-8">
          <Icons.LogoSmall className="h-8 w-auto" />
        </div>
      </header>

      <div className="flex h-full">
        <div className="relative hidden lg:flex lg:w-1/2">
          <Image
            alt="Background"
            className="object-cover dark:hidden"
            fill
            priority
            src={"/assets/bg-login.jpg"}
          />
          <Image
            alt="Background"
            className="hidden object-cover dark:block"
            fill
            priority
            src={"/assets/bg-login-dark.jpg"}
          />
        </div>

        <div className="relative w-full lg:w-1/2">
          <div className="relative z-10 flex h-full items-center justify-center p-6">
            <div className="w-full max-w-md space-y-8">
              <div className="text-center">
                <h1 className="mb-4 font-f37-stout text-lg">
                  Welcome to OpenPlane
                </h1>
              </div>
              <div className="space-y-4">
                <div className="space-y-3 text-center">
                  <GoogleSignIn />
                </div>
              </div>

              <div className="absolute right-0 bottom-4 left-0 text-center">
                <p className="font-mono text-muted-foreground text-xs leading-relaxed">
                  By signing in you agree to our{" "}
                  <Link
                    className="underline"
                    href="https://openplane.tech/terms"
                  >
                    Terms of service
                  </Link>{" "}
                  &{" "}
                  <Link
                    className="underline"
                    href="https://openplane.tech/policy"
                  >
                    Privacy policy
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
