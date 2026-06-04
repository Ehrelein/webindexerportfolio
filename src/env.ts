import path from "path";

export function getConfig(): any {
  const env: string = process.env.NODE_ENV || "development";
  try {
    return require(path.join(__dirname, "..", "environments", `${env}.js`));
  } catch (e) {
    console.warn(`[config] Environment "${env}" not found, using development`);
    return require("./development.js");
  }
}
