import { UserMenu } from "./user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-50 flex h-[70px] items-center justify-between bg-white bg-opacity-70 px-6 backdrop-blur-xl backdrop-filter md:static md:m-0 md:border-b md:backdrop-blur-none md:backdrop-filter dark:bg-[#121212]">
      <div className="ml-auto flex space-x-2">
        <UserMenu />
      </div>
    </header>
  );
}
