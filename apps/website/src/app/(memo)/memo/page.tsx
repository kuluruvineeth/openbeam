import type { Metadata } from "next";
import { InvestorMemo } from "@/components/pitch/investor-memo";
import { MemoDownloadButton } from "@/components/pitch/memo-download-button";

export const metadata: Metadata = {
  title: "Investor Memo | OpenBeam",
  description:
    "OpenBeam — Intelligence for the physical world. Confidential investor memorandum.",
};

export default function Page() {
  return (
    <>
      <MemoDownloadButton />
      <InvestorMemo />
    </>
  );
}
