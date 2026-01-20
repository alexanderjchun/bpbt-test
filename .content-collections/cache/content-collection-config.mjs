// content-collections.ts
import { defineCollection, defineConfig } from "@content-collections/core";
import { compileMDX } from "@content-collections/mdx";
import { z } from "zod";
var pages = defineCollection({
  name: "pages",
  directory: "content/pages",
  include: "*.mdx",
  schema: z.object({
    slug: z.string(),
    order: z.number(),
    title: z.string(),
    description: z.string(),
    content: z.string()
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document);
    return {
      ...document,
      mdx
    };
  }
});
var posts = defineCollection({
  name: "posts",
  directory: "content/posts",
  include: "**/*.mdx",
  schema: z.object({
    slug: z.string(),
    date: z.string(),
    title: z.string(),
    summary: z.string(),
    content: z.string()
  }),
  transform: async (document, context) => {
    const mdx = await compileMDX(context, document);
    return {
      ...document,
      mdx
    };
  }
});
var content_collections_default = defineConfig({
  collections: [pages, posts]
});
export {
  content_collections_default as default
};
