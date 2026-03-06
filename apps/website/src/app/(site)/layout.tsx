import { Footer } from "@/components/footer";
import { Header } from "@/components/header";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="overflow-hidden md:overflow-visible">{children}</main>
      <Footer />
    </>
  );
}
