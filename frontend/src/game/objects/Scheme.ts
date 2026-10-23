export interface Scheme {
  base: string[];
  super?: string;
  transform?: string;
  variants: Record<string, string>;
}
