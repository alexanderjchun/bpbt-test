import { allPosts } from "@/.content-collections/generated";
import Link from "next/link";

export default function PostsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-3 p-3">
      <ol className="list-decimal p-4">
        {allPosts.map((post) => (
          <li key={post.slug}>
            <Link href={`/posts/${post.slug}`}>
              <h3>{post.title}</h3>
              <p>{post.summary}</p>
            </Link>
          </li>
        ))}
      </ol>
    </main>
  );
}
