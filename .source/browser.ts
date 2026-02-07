// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "bobu/bobu-2026.mdx": () => import("../content/docs/bobu/bobu-2026.mdx?collection=docs"), "bobu/brand.mdx": () => import("../content/docs/bobu/brand.mdx?collection=docs"), "bobu/index.mdx": () => import("../content/docs/bobu/index.mdx?collection=docs"), "bobu/timeline.mdx": () => import("../content/docs/bobu/timeline.mdx?collection=docs"), "pbt/bpbt.mdx": () => import("../content/docs/pbt/bpbt.mdx?collection=docs"), "pbt/implementing-pbts.mdx": () => import("../content/docs/pbt/implementing-pbts.mdx?collection=docs"), "pbt/index.mdx": () => import("../content/docs/pbt/index.mdx?collection=docs"), }),
};
export default browserCollections;