import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import reactHooksExtra from "eslint-plugin-react-hooks-extra";
import reactNamingConvention from "eslint-plugin-react-naming-convention";
import reactWebApi from "eslint-plugin-react-web-api";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: {
      "react-hooks-extra": reactHooksExtra,
      "react-naming-convention": reactNamingConvention,
      "react-web-api": reactWebApi,
    },
    rules: {
      "react-hooks-extra/no-direct-set-state-in-use-effect": "error",
      "react-web-api/no-leaked-event-listener": "error",
      "react-web-api/no-leaked-interval": "error",
      "react-web-api/no-leaked-resize-observer": "error",
      "react-web-api/no-leaked-timeout": "error",
      "react-naming-convention/context-name": "error",
      "react-naming-convention/filename": ["error", { rule: "kebab-case" }],
      "react-naming-convention/component-name": [
        "error",
        { rule: "PascalCase" },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "foundry/**", ".content-collections/**"]),
  // ! TODO: Remove this once we have a better way to ignore the foundry directory
]);

export default eslintConfig;
