import { allPages } from "@/.content-collections/generated";
import { Color } from "@/components/color";
import { Header } from "@/components/header";
import { MDXContent } from "@content-collections/mdx/react";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return allPages.map((page) => ({
    slug: page.slug,
  }));
}

export default async function Page(props: PageProps<"/[slug]">) {
  const { slug } = await props.params;
  const page = allPages.find((page) => page.slug === slug);

  if (!page) {
    notFound();
  }
  return (
    <main className="mx-auto max-w-7xl space-y-3 p-3">
      <Header currentPage={slug} />
      <div className="flex gap-1.5 md:gap-3">
        <div className="hidden w-24 sm:block"></div>
        <div className="flex-1 rounded-xl p-4">
          <MDXContent code={page.mdx} components={{ Color }} />
        </div>
        <div className="hidden w-24 sm:block"></div>
      </div>
    </main>
  );
}
