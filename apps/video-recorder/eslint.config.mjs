import { makeConfig } from "@remotion/eslint-config-flat";
import security from "eslint-plugin-security";

const conf = makeConfig({
  remotionDir: ["remotion/**"],
});

// Add security rules to the config
export default [
  ...conf,
  {
    plugins: {
      security,
    },
    rules: {
      // Security rules to prevent common vulnerabilities
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "off",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "error",
      "security/detect-bidi-characters": "error",
    },
  },
];
