import { Bobutton } from "./bobutton";
import { SpacebarIcon } from "./spacebar-icon";

const orderedPages = [
  { slug: "/", title: "Home", description: "Home" },
  { slug: "/who-is-bobu", title: "Who is Bobu?", description: "Who is Bobu?" },
  { slug: "/gallery", title: "Gallery", description: "Gallery" },
];

export function Header({ currentPage }: { currentPage: string }) {
  const currentIndex = orderedPages.findIndex(
    (page) => page.slug === currentPage,
  );
  const page = orderedPages[currentIndex];

  const lastIndex = orderedPages.length - 1;
  const prev = orderedPages[currentIndex === 0 ? lastIndex : currentIndex - 1];
  const next = orderedPages[currentIndex === lastIndex ? 0 : currentIndex + 1];

  return (
    <header className="flex gap-1.5 md:gap-3">
      <Bobutton slug={prev.slug} activeKey={"ArrowLeft"} className="w-24">
        <PrevIcon className="size-4" />
        <span className="display self-end text-xs">{prev.title}</span>
      </Bobutton>
      <Bobutton slug={"/"} activeKey={" "} className="flex-1">
        <h2 className="text-xl sm:text-2xl">{page.title}</h2>
        <p className="self-end">{page.description}</p>
        <SpacebarIcon className="hidden size-5 place-self-end md:block" />
      </Bobutton>
      <Bobutton slug={next.slug} activeKey={"ArrowRight"} className="w-24">
        <NextIcon className="size-4 justify-self-end" />
        <span className="display place-self-end text-xs">{next.title}</span>
      </Bobutton>
    </header>
  );
}

function PrevIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 4 5" fill="currentColor">
      <polygon points="1 3 1 4 2 4 2 5 4 5 4 0 2 0 2 1 1 1 1 2 0 2 0 3 1 3" />
    </svg>
  );
}

function NextIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 4 5" fill="currentColor">
      <polygon points="3 2 3 1 2 1 2 0 0 0 0 5 2 5 2 4 3 4 3 3 4 3 4 2 3 2" />
    </svg>
  );
}
