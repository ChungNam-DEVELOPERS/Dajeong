import sharedConfig from "@dajeong/config/eslint/shared";
import expoConfig from "eslint-config-expo/flat.js";

export default [...expoConfig, ...sharedConfig];
