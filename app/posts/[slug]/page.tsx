import { allPosts } from "@/.content-collections/generated";
import { MDXContent } from "@content-collections/mdx/react";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return allPosts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function PostPage(props: PageProps<"/posts/[slug]">) {
  const { slug } = await props.params;
  const post = allPosts.find((post) => post.slug === slug);

  if (!post) {
    notFound();
  }
  return (
    <main className="mx-auto max-w-7xl p-4">
      <div className="prose flex-1 px-4 pt-8 sm:px-6">
        <MDXContent code={post.mdx} />
      </div>
    </main>
  );
}
