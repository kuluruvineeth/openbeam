import { UserMenu } from "./user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-[70px] shrink-0 items-center justify-between border-b bg-white bg-opacity-70 px-6 backdrop-blur-xl backdrop-filter dark:bg-[#121212]">
      <div className="ml-auto flex space-x-2">
        <UserMenu />
      </div>
    </header>
  );
}
