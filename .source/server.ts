// @ts-nocheck
import * as __fd_glob_10 from "../content/docs/pbt/index.mdx?collection=docs"
import * as __fd_glob_9 from "../content/docs/pbt/implementing-pbts.mdx?collection=docs"
import * as __fd_glob_8 from "../content/docs/pbt/bpbt.mdx?collection=docs"
import * as __fd_glob_7 from "../content/docs/bobu/timeline.mdx?collection=docs"
import * as __fd_glob_6 from "../content/docs/bobu/index.mdx?collection=docs"
import * as __fd_glob_5 from "../content/docs/bobu/brand.mdx?collection=docs"
import * as __fd_glob_4 from "../content/docs/bobu/bobu-2026.mdx?collection=docs"
import * as __fd_glob_3 from "../content/docs/index.mdx?collection=docs"
import { default as __fd_glob_2 } from "../content/docs/pbt/meta.json?collection=docs"
import { default as __fd_glob_1 } from "../content/docs/bobu/meta.json?collection=docs"
import { default as __fd_glob_0 } from "../content/docs/meta.json?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.docs("docs", "content/docs", {"meta.json": __fd_glob_0, "bobu/meta.json": __fd_glob_1, "pbt/meta.json": __fd_glob_2, }, {"index.mdx": __fd_glob_3, "bobu/bobu-2026.mdx": __fd_glob_4, "bobu/brand.mdx": __fd_glob_5, "bobu/index.mdx": __fd_glob_6, "bobu/timeline.mdx": __fd_glob_7, "pbt/bpbt.mdx": __fd_glob_8, "pbt/implementing-pbts.mdx": __fd_glob_9, "pbt/index.mdx": __fd_glob_10, });